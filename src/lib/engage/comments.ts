import "server-only";

import { z } from "zod";

import { embedTopStories } from "@/lib/discoveries/embed";
import { chatJSON } from "@/lib/llm/client";
import { embed } from "@/lib/llm/embeddings";
import { supabaseAdmin } from "@/lib/supabase/server";
import { AUTHOR_BIO } from "@/lib/voice/profile";
import { voiceSamplesFor } from "@/lib/voice/humanize";
import { aiTells } from "@/lib/voice/tells";
import type { CommentShape, Rubric } from "@/lib/engage/types";

// Below this the wire story is probably a different one.
const STORY_MATCH = 0.78;

const draftsSchema = z.object({
  drafts: z.array(z.object({ shape: z.enum(["field_note", "counterpoint", "question", "from_source"]), body: z.string() })),
});

const rubricSchema = z.object({
  scores: z.array(
    z.object({
      index: z.number(),
      anchored: z.number().min(0).max(2),
      adds: z.number().min(0).max(2),
      length: z.number().min(0).max(2),
      friction: z.number().min(0).max(2),
      ending: z.number().min(0).max(2),
      voice: z.number().min(0).max(2),
      hard_fail: z.boolean(),
      notes: z.string(),
    }),
  ),
});

interface Story {
  id: string;
  title: string | null;
  url: string;
  snippet: string | null;
  key_numbers: string[];
}

export interface DraftedComment {
  shape: CommentShape;
  body: string;
  rubric: Rubric;
  score: number;
}

/**
 * Drafts comments on one post he shared in, each scored on the Engage rubric,
 * and stores them. Grounding is what makes them worth posting: the wire story
 * the post is about, and his real projects, never invented ones.
 */
export async function draftComments(capturedId: string): Promise<DraftedComment[]> {
  const db = supabaseAdmin();
  const { data: post, error } = await db
    .from("captured_posts")
    .select("id,text,author_name,embedding")
    .eq("id", capturedId)
    .single();
  if (error) throw new Error(error.message);
  if (!post.text.trim()) throw new Error("Paste the post's text first. Signal Desk doesn't read LinkedIn pages.");

  let embedding = (post.embedding as number[] | string | null) ?? null;
  if (typeof embedding === "string") embedding = JSON.parse(embedding) as number[];
  if (!embedding) {
    embedding = await embed(post.text);
    if (embedding) await db.from("captured_posts").update({ embedding }).eq("id", capturedId);
  }

  let story: Story | null = null;
  if (embedding) {
    // Scans don't embed stories, so the strongest recent ones are embedded here first.
    await embedTopStories({ hours: 72, limit: 12 });
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const { data } = await db.rpc("match_discoveries", { query_embedding: embedding, match_count: 1, since });
    const top = (data as (Story & { similarity: number })[] | null)?.[0];
    if (top && top.similarity >= STORY_MATCH) {
      story = top;
      await db.from("captured_posts").update({ matched_discovery_id: top.id }).eq("id", capturedId);
    }
  }
  const samples = await voiceSamplesFor(embedding, 2);

  const { drafts } = await chatJSON({
    system: WRITER,
    user: writerPrompt(post.text, post.author_name, story, samples.map((s) => s.content)),
    schema: draftsSchema,
    role: "writer",
    temperature: 0.8,
    maxTokens: 1200,
    op: "engage-comment",
  });
  const usable = drafts
    .filter((d) => d.body.trim() && (d.shape !== "from_source" || story))
    .map((d) => ({ shape: d.shape, body: tidy(d.body) }))
    .slice(0, 4);
  if (!usable.length) throw new Error("The writer returned no drafts. Try again.");

  const scored = await scoreComments(post.text, usable);
  await db.from("comment_drafts").delete().eq("captured_post_id", capturedId).is("posted_at", null);
  const { error: saveError } = await db.from("comment_drafts").insert(
    scored.map((d) => ({ captured_post_id: capturedId, shape: d.shape, body: d.body, rubric: d.rubric, score: d.score })),
  );
  if (saveError) throw new Error(saveError.message);
  return scored;
}

async function scoreComments(
  postText: string,
  drafts: { shape: CommentShape; body: string }[],
): Promise<DraftedComment[]> {
  const { scores } = await chatJSON({
    system: RUBRIC,
    user: `POST\n${postText.slice(0, 3000)}\n\nCOMMENTS\n${drafts.map((d, i) => `[${i}] ${d.body}`).join("\n\n")}`,
    schema: rubricSchema,
    role: "utility",
    temperature: 0,
    maxTokens: 900,
    op: "engage-rubric",
  });

  return drafts
    .map((d, i) => {
      const s = scores.find((x) => x.index === i);
      const words = d.body.split(/\s+/).length;
      const tells = aiTells(d.body);
      // Checked in code too, since a scorer can be talked round.
      const hardFail =
        !s || s.hard_fail || words < 15 || /[—–]/.test(d.body) || /#\w|https?:\/\//.test(d.body) || (d.body.match(/\?/g) ?? []).length > 1;
      const parts = s ?? { anchored: 0, adds: 0, length: 0, friction: 0, ending: 0, voice: 0, notes: "Not scored." };
      const voice = tells.length ? Math.min(parts.voice, 1) : parts.voice;
      const total = hardFail ? 0 : parts.anchored + parts.adds + parts.length + parts.friction + parts.ending + voice;
      const notes = [parts.notes, ...tells.map((t) => `Reads as generated: ${t}`)].filter(Boolean).join(" ");
      return {
        shape: d.shape,
        body: d.body,
        rubric: { ...parts, voice, total, notes },
        score: total,
      };
    })
    .sort((a, b) => b.score - a.score);
}

const replySchema = z.object({ reply: z.string() });

/** A reply to a comment on his own post that keeps the thread going. */
export async function draftReply(comment: string, postContext: string | null): Promise<string> {
  const { reply } = await chatJSON({
    system: `${WRITER_BASE}

Write ONE reply from Bilal to a comment someone left on his own LinkedIn post. 1-3 sentences, 15-60 words. Answer what they said directly; if they asked something, answer it plainly. Then, only if natural, ask one specific follow-up that invites them to say more. Thank them at most with a few words, never "Great question!". Return ONLY {"reply":"..."}.`,
    user: `${postContext ? `HIS POST\n${postContext.slice(0, 2500)}\n\n` : ""}THEIR COMMENT\n${comment.slice(0, 1500)}`,
    schema: replySchema,
    role: "writer",
    temperature: 0.7,
    maxTokens: 300,
    op: "engage-reply",
  });
  return tidy(reply);
}

/** Dashes become commas, and quotes the model wrapped around the whole thing go. */
function tidy(text: string): string {
  return text
    .trim()
    .replace(/^["“]|["”]$/g, "")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/\s+,/g, ",");
}

const WRITER_BASE = `You write LinkedIn comments and replies as Bilal Taha, an AI engineer in Karachi.

WHAT HE HAS REALLY DONE (the only first-hand facts you may use; never invent others, never invent numbers):
${AUTHOR_BIO}

VOICE: plain, specific English an engineer would type. Contractions. Short concrete words. No em dashes or en dashes. No hashtags, emojis, links or tags. No "Great post", "Love this", "Spot on", "As an AI engineer", "This resonates". No "delve", "landscape", "leverage", "robust", "game-changer", "crucial". Never pitch his services.`;

const WRITER = `${WRITER_BASE}

Draft comments on someone else's LinkedIn post, one per shape:
- "field_note": adds ONE data point from his own work, taken only from the facts above, tied to a specific claim in the post. State only results the facts above state; never claim a comparison or improvement they don't. If none of his real work fits the post, skip this shape.
- "counterpoint": agrees with one specific claim, then names the edge case or condition where it breaks, respectfully.
- "question": one sharp practitioner question the author can actually answer from their experience.
- "from_source": only when a SOURCE is given: the number or finding from it that the post skipped or got slightly wrong.

Each comment: points at one specific line or claim in the post; adds something the post doesn't say; 2-4 sentences, 25-70 words; ends with either a question or a takeaway, not both; at most one question mark.

Return ONLY {"drafts":[{"shape":"field_note|counterpoint|question|from_source","body":"..."}]}`;

function writerPrompt(text: string, author: string | null, story: Story | null, samples: string[]): string {
  return `POST${author ? ` by ${author}` : ""}
${text.slice(0, 3500)}
${
  story
    ? `\nSOURCE (the story this post is about, from his news wire)\n${story.title ?? ""}\n${story.snippet ?? ""}\n${story.key_numbers.length ? `Figures: ${story.key_numbers.join("; ")}` : ""}\n`
    : ""
}${
  samples.length
    ? `\nHOW HE WRITES (tone only, don't reuse content):\n${samples.map((s) => s.slice(0, 600)).join("\n---\n")}\n`
    : ""
}`;
}

const RUBRIC = `You grade LinkedIn comment drafts strictly. For each comment, score each line 0, 1 or 2:
- anchored: points at one specific claim or line in the post (2) vs generic (0).
- adds: brings a first-hand detail, number, failure, tool detail or source fact the post doesn't have (2); restates the post (0).
- length: one idea in 2-4 sentences and 25-70 words (2); under 15 or over 90 words (0).
- friction: includes a caveat, edge case or respectful disagreement (2) vs pure agreement (0).
- ending: ends with exactly one question OR one takeaway (2); both, or neither (0).
- voice: plain human English with no praise openers, no buzzwords, no em dashes, no pitch (2).
hard_fail = true for generic praise, self-promotion, a claim that sounds invented, more than one question, or anything templated.
Return ONLY {"scores":[{"index":0,"anchored":0,"adds":0,"length":0,"friction":0,"ending":0,"voice":0,"hard_fail":false,"notes":"one short sentence on the weakest point"}]}`;
