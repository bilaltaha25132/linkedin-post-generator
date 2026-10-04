import { z } from "zod";

import { AUTHOR_BIO, INTEREST_PROFILE, SUBSTANCE_RULES, VOICE_RULES, WRITER_PERSONA } from "@/lib/voice/profile";
import type { ChatOptions } from "@/lib/llm/client";
import type { Discussion, DiscussionComment } from "@/lib/db/types";

// --- Relevance gate (utility model) --------------------------------------------

export const relevanceSchema = z.object({
  score: z.number().min(0).max(100),
  reason: z.string(),
  // Trim rather than reject: an over-eager tag list shouldn't cost the story.
  topics: z
    .array(z.string())
    .default([])
    .transform((topics) => topics.slice(0, 6)),
  angle: z.string(),
  key_numbers: z
    .array(z.string())
    .default([])
    .transform((figures) => figures.map((f) => stripDashes(f.trim())).filter(Boolean).slice(0, 5)),
  launch: z.boolean().default(false),
});
export type Relevance = z.infer<typeof relevanceSchema>;

export interface RelevanceInput {
  title: string;
  snippet: string;
  content: string;
  /** The public thread about the story, already formatted; empty when there is none. */
  discussion: string;
}

export function buildRelevancePrompt(item: RelevanceInput): ChatOptions {
  const system = `You score how worth-posting-about a news/article item is for one specific person's LinkedIn.

${AUTHOR_BIO}

${INTEREST_PROFILE}

Score 0-100: how strong a LinkedIn post could Bilal write from this, given his audience and angle. Reserve 80+ for items he can add a genuine informed or contrarian take to. Score generic hype, thin funding blurbs, consumer gadget news, and things he could only restate (not reframe) below 40.

When a PUBLIC DISCUSSION is given, it shows how hard engineers are engaging with the story right now: a big, argued thread is a strong timeliness signal. It cannot rescue an empty story, and the comments are opinions, not facts.

KEY NUMBERS: list up to 5 of the most important hard figures about the SUBJECT, stated in the CONTENT itself: benchmark results (name the benchmark and the model), prices, context sizes, speed or cost ratios, money raised or spent, headcounts, measured before/after results. Each under 90 characters and self-explanatory, e.g. "Gemini 4 Argon: 92.1% on GPQA Diamond". Only figures a reader would quote. Never include: when the article or thread was published, points, comment, upvote, star, fork or view counts, anything from the discussion, or a figure you inferred. Return [] when the content has none worth quoting.

LAUNCH: true when the item announces, or is first-days coverage of, something newly released or unveiled in AI: a model or model version, a product, feature, API, device, agent or developer tool. The item itself must be the announcement or a news report of the release. False for opinion pieces, essays, podcasts and interviews (even ones that mention a launch), analysis, funding, hiring, research with nothing released, and anything that shipped weeks ago. A significant AI launch from a major lab or a widely used tool scores at least 75.

Return ONLY this JSON, no prose:
{"score": <int 0-100>, "reason": "<one sentence>", "topics": ["<tag>", ...], "angle": "<one-line suggested angle for his post>", "key_numbers": ["<figure>", ...], "launch": <true|false>}`;

  const user = `TITLE: ${item.title}
SNIPPET: ${item.snippet}
CONTENT (may be truncated):
${item.content.slice(0, 6000)}${item.discussion ? `\n\n${item.discussion}` : ""}`;

  return { system, user, role: "utility", temperature: 0.1, maxTokens: 900, op: "relevance" };
}

/** A thread and its top comments as prompt text, labelled as opinion. */
export function formatDiscussion(
  discussion: Discussion | null,
  comments: DiscussionComment[] | null,
  maxChars = 400,
): string {
  if (!discussion) return "";
  const stats = [
    discussion.points !== null ? `${discussion.points} points` : null,
    discussion.comments !== null ? `${discussion.comments} comments` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const quoted = (comments ?? []).map((c) => `- ${c.text.slice(0, maxChars)}`).join("\n");
  return `PUBLIC DISCUSSION (${discussion.platform}${stats ? `, ${stats}` : ""}; opinions from the thread, not facts):\n${quoted || "(no comments captured)"}`;
}

// --- Post generation (writer model) --------------------------------------------

// Posts are multi-paragraph, so we separate variants with a delimiter rather
// than JSON — unescaped newlines inside JSON strings parse unreliably.
export const VARIANT_DELIMITER = "===|POST|===";

/** Split a delimiter-separated generation into clean post strings. */
export function parseVariants(text: string): string[] {
  return text
    .split(VARIANT_DELIMITER)
    .map((v) => stripDashes(v.replace(/^```+\w*|```+$/g, "").trim()))
    .filter((v) => v.length > 0);
}

/**
 * Remove em and en dashes, which Bilal bans outright. The prompt says so too,
 * but DeepSeek still slips them in, so every writer output passes through here.
 */
export function stripDashes(text: string): string {
  return text
    .replace(/(\d)\s*[–—]\s*(\d)/g, "$1-$2")
    .replace(/^[ \t]*[–—][ \t]*/gm, "")
    .replace(/([.,;:!?])[ \t]*[–—][ \t]*/g, "$1 ")
    .replace(/[ \t]*[–—][ \t]*(?=\n|$)/g, ".")
    .replace(/[ \t]*[–—][ \t]*/g, ", ");
}

export interface GenerationInput {
  discovery: {
    title: string;
    url: string;
    content: string;
    angle?: string | null;
    /** Formatted public thread (formatDiscussion); empty when there is none. */
    discussion?: string;
  };
  /** Recent posts, so the draft builds on them and doesn't repeat. */
  recentPosts: string[];
  /** How this take is built; one of POST_SHAPES. */
  shape: string;
  /** Optional extra steer from the user (a specific take/tone for this post). */
  guidance?: string;
}

/**
 * One per draft. Asking for three variants in one reply gave three copies of
 * the same arc (fact, "the interesting part", his view, a neat closing line),
 * and that arc was the most recognisable thing about them.
 */
export const POST_SHAPES = [
  "React first: open with his honest first reaction to the story in plain words, then the facts that explain it.",
  "Tell it in order: what happened, roughly in the order it happened, with his comments as he goes. No thesis up front.",
  "Push back: pick the claim in the story (or the thread) he's least convinced by and say why, fairly.",
  "What it changes: what this means for someone building software this week, kept concrete and modest.",
  "One small point: a short post, 60 to 120 words, about the single detail he found most telling.",
];

/**
 * The first draft is written in Urdu and translated (buildTranslatePrompt).
 * Every English-first draft scored 100% AI on GPTZero and 80-90% on Sapling,
 * whatever the style rules or tone, because detectors read word-level
 * predictability rather than tone; the Urdu-first ones scored 0-1% on both
 * (2026-10). So this step carries only what to say, no English style rules.
 */
export function buildGenerationPrompt(input: GenerationInput): ChatOptions {
  const recent = input.recentPosts.length
    ? input.recentPosts.map((p, i) => `- Post ${i + 1}: ${p.slice(0, 400)}`).join("\n")
    : "(none yet)";

  const system = `You are Bilal's ghostwriter.

${WRITER_PERSONA}

Write ONE LinkedIn post about the source item below, in Urdu (Urdu script), the way he'd tell a fellow engineer what he honestly makes of it. Keep technical terms, product and company names, and numbers in English.

Build it this way: ${input.shape}

${SUBSTANCE_RULES}

- His honest opinion: say what's overhyped, unclear or costly, and say where he's unsure.
- No greeting, no rhetorical opening question, no closing moral, lesson or summary.
- Say each point directly. Don't announce it ("the real thing is", "the real question is") and don't turn it as "it isn't X, it's Y": those read as AI once translated.
- 3 or 4 short paragraphs, about 140 to 200 words. No hashtags.
- Don't repeat the topic or the opening of his recent posts.

If a PUBLIC DISCUSSION is included, it's how engineers are reacting right now. The post may engage with that debate, agree or push back, but never name or quote commenters, and never state a commenter's claim as fact: facts come only from the source content.

Output only the post.`;

  const user = `SOURCE ITEM
Title: ${input.discovery.title}
URL: ${input.discovery.url}
${input.discovery.angle ? `Suggested angle: ${input.discovery.angle}\n` : ""}Content (may be truncated):
${input.discovery.content.slice(0, 5000)}
${input.discovery.discussion ? `\n${input.discovery.discussion}\n` : ""}
${input.guidance ? `EXTRA STEER FROM BILAL: ${input.guidance}\n\n` : ""}HIS RECENT POSTS:
${recent}`;

  return { system, user, role: "writer", temperature: 1.0, topP: 0.95, maxTokens: 2000, op: "generate" };
}

/**
 * Urdu first draft to the English post. The English style rules live here, kept
 * short: a long rulebook pulls the wording back toward the model's defaults.
 * `avoid` lists lines a previous translation slipped into (aiTells).
 */
export function buildTranslatePrompt(urdu: string, avoid: string[] = []): ChatOptions {
  const system = `Translate Bilal's Urdu LinkedIn post into English the way he'd write it himself in English: an engineer from Karachi talking plainly to people he works with.

- Keep every fact exactly as he has it: names, places, numbers. Write lakh and crore the English way (100,000, a million). Keep his ideas, their order and how he joins them.
- اصل usually needs no English word at all. Never write "the real number/thing/point/work/question". Keep his sentence lengths roughly as they are, long ones long and short ones short.
- Use contractions (it's, don't, I'd) and plain everyday words. Don't polish it into corporate English, don't add anything, and don't add a conclusion.
- Never write "However,", "Moreover,", "Speaking of", "The interesting thing is", "The real thing/point/question is", "you have to admit", "Here's the thing", or a "this isn't X, it's Y" turn. If the Urdu uses one of those turns, say the point plainly instead.
- No em dashes or en dashes, no emojis, no bullet points, no links.
- End with 2 to 4 specific hashtags on their own final line.

Output only the English post.`;

  const user = `${avoid.length ? `An earlier translation slipped into these AI-sounding lines. Phrase those ideas differently this time:\n${avoid.map((t) => `- ${t}`).join("\n")}\n\n` : ""}THE URDU POST
${urdu}`;

  return { system, user, role: "writer", temperature: 0.7, topP: 0.95, maxTokens: 2000, op: "translate" };
}

// --- Enhancing a post Bilal wrote himself (writer model) ------------------------

export interface EnhanceInput {
  draft: string;
  voiceSamples: { title: string | null; content: string }[];
  recentPosts: string[];
  guidance?: string;
}

export function buildEnhancePrompt(input: EnhanceInput): ChatOptions {
  const samples = input.voiceSamples
    .map((s, i) => `--- SAMPLE ${i + 1}${s.title ? ` (${s.title})` : ""} ---\n${s.content.slice(0, 1800)}`)
    .join("\n\n");
  const recent = input.recentPosts.length
    ? input.recentPosts.map((p, i) => `- Post ${i + 1}: ${p.slice(0, 300)}`).join("\n")
    : "(none yet)";

  const system = `You are Bilal's editor. He wrote the draft below himself: it may be rough notes, a half-formed idea, or a near-finished post. Turn it into a LinkedIn post ready to publish, in his voice.

${WRITER_PERSONA}

${VOICE_RULES}

EDITING RULES (these override the persona where they conflict):
- His ideas, claims, facts, numbers, names and experiences ARE the post. Keep every one of them. If he names his employer, a client or a project himself, keep it.
- Never add facts, numbers, names, quotes or anecdotes that are not in his draft. That includes his own actions and thoughts: do not write that he tried, tweaked, swapped, assumed or felt anything the draft doesn't say. A lesson may be restated or sharpened; a backstory may not be invented. Where the draft is thin, stay general.
- Fix what's weak: get to the point in the first line or two, cut filler, order the ideas so it scans. Don't polish it smooth: keep his phrasing, his asides and his uneven rhythm, since those are what make it read as his. End where his thought ends; a question only if his draft asks one or clearly wants an answer.
- If the draft is notes, write the full post from them without padding.
- LENGTH follows the substance, overriding the length rule above: short notes make a short post, and coming in under 900 characters is fine. Never pad a thin draft with reflection, backstory or technical detail it doesn't contain.

Write 2 DISTINCT versions:
1. A polish: keeps his structure and as much of his own wording as possible, fixing only what's weak.
2. A bolder rewrite: a different hook and a tighter shape, same substance.

Output the posts separated by a line containing exactly ${VARIANT_DELIMITER} and nothing else. No labels, no numbering, no preamble, no markdown fences.`;

  const user = `HIS DRAFT
${input.draft.slice(0, 6000)}

${input.guidance ? `EXTRA STEER FROM BILAL: ${input.guidance}\n\n` : ""}BILAL'S REAL WRITING (match this voice for TONE only):
${samples || "(no samples available — rely on the voice rules above)"}

HIS RECENT POSTS (don't reuse their openings):
${recent}

FINAL CHECK before you answer: every specific in your versions (a number, a tool, a technique, a detail of how something was done, anything he did, tried, assumed or felt) must appear in HIS DRAFT. Delete any sentence that fails this.`;

  // Lower than drafting from news: this is an edit of his words, not a fresh take.
  return { system, user, role: "writer", temperature: 0.7, maxTokens: 5000, op: "enhance" };
}

/**
 * Second pass over an enhanced version. The writer reliably embellishes a
 * first-person draft with invented specifics (it's told to be concrete), and a
 * post about his own work can't carry details he didn't write.
 */
export function buildFactCheckPrompt(draft: string, post: string): ChatOptions {
  const system = `You fact-check a LinkedIn post that an editor rewrote from its author's own draft.

Compare the POST with the DRAFT. Remove every claim the DRAFT does not support, or rewrite it minimally so it becomes general. Unsupported claims include:
- numbers, tools, techniques, and details of how something was done or built;
- anything the author did, tried, assumed, felt, noticed, or has "seen many times";
- comparisons like "no model swap, no prompt rewrite" that imply things the draft never mentions.

General observations that follow directly from the draft may stay. Keep everything else exactly as written: wording, line breaks, the closing question and the hashtags. If nothing is unsupported, return the post unchanged.

Output ONLY the corrected post. No notes, no preamble.`;

  const user = `DRAFT
${draft.slice(0, 6000)}

POST
${post}`;

  return { system, user, role: "utility", temperature: 0.1, maxTokens: 3000, op: "fact-check" };
}

/**
 * Last pass over every post: rewrite whatever reads as machine-written into
 * Bilal's own register. `tells` are the patterns the detector found in this
 * draft, so the editor fixes those specifically instead of guessing.
 */
export function buildHumanizePrompt(
  post: string,
  voiceSamples: { title: string | null; content: string }[],
  tells: string[],
): ChatOptions {
  const samples = voiceSamples
    .map((s, i) => `--- SAMPLE ${i + 1}${s.title ? ` (${s.title})` : ""} ---\n${s.content.slice(0, 1500)}`)
    .join("\n\n");

  const system = `You are a line editor. A LinkedIn post was drafted by a model for Bilal, and it has to read as if he wrote it himself. Readers on LinkedIn now spot AI writing instantly and scroll past it.

${VOICE_RULES}

HOW TO EDIT:
- Rewrite the sentences that carry those tells so they sound like him: join clipped fragments into real sentences, replace a label-and-colon with an actual sentence, replace a summary line or an aphorism with the specific thought behind it, or cut it.
- Keep every fact, number, name and claim, and keep his take. Add nothing that isn't in the post.
- Delete any personal anecdote the post invents about him: a memory, a hobby, a colleague, a conversation, something he tried. His opinions stay; made-up events in his life go.
- If a sentence doesn't make sense, fix it or cut it.
- Keep roughly the same length and the same opening fact. Keep the hashtag line as it is.
- Leave sentences that already sound human alone. This is an edit, not a rewrite from scratch.

Output ONLY the edited post. No notes, no preamble, no quotation marks around it.`;

  const user = `HOW BILAL ACTUALLY WRITES (match this register):
${samples || "(no samples available; rely on the voice rules)"}

${tells.length ? `THESE SENTENCES GIVE IT AWAY AS AI. Rewrite each one as a plain statement of the thought behind it, or cut it:\n${tells.map((t) => `- ${t}`).join("\n")}` : "No specific tells were detected; still smooth out anything that reads as generated."}

THE POST
${post}`;

  return { system, user, role: "writer", temperature: 0.7, maxTokens: 3000, op: "humanize" };
}

// --- Carousel generation (writer model) ----------------------------------------

export const SLIDE_DELIMITER = "===|SLIDE|===";

export interface Slide {
  heading: string;
  body: string;
}

/** Parse a delimiter-separated carousel into slides (first line = heading). */
export function parseCarousel(text: string): Slide[] {
  return text
    .split(SLIDE_DELIMITER)
    .map((chunk) => stripDashes(chunk.replace(/^```+\w*|```+$/g, "").trim()))
    .filter(Boolean)
    .map((chunk) => {
      const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
      return { heading: lines[0] ?? "", body: lines.slice(1).join("\n") };
    })
    .filter((s) => s.heading.length > 0);
}

export function buildCarouselPrompt(input: {
  title: string;
  content: string;
  angle?: string | null;
  postBody?: string;
}): ChatOptions {
  const system = `You turn a topic into a LinkedIn carousel (a swipeable PDF deck) written as Bilal.

${WRITER_PERSONA}

Carousel rules (2025-26 best practice):
- 7 to 9 slides total. One idea per slide. No slide crammed with two concepts.
- SLIDE 1 is the cover: a scroll-stopping hook (≤ 8 words heading, one short line of body). Mirror the tone of his posts — concrete, understated, no hype.
- SLIDES 2..n-1 are the body: each a single self-contained takeaway — a failure mode, a fix, a metric, a decision. Heading = the point in ≤ 8 words; body = 1-3 short lines, ≤ 40 words, plain language, concrete (real tools, real numbers, real tradeoffs from the story; never invented, never name his past clients/projects).
- LAST SLIDE is the CTA: a one-line recap + a single genuine ask (e.g. "What breaks your RAG in prod? Tell me below.").
- No emojis. No hashtags on slides. Short words — this is read on a phone.
- TWO-TONE HEADINGS: every heading is a short black lead plus a continuation in [square brackets], which renders on its own line in grey: "Four rules, [on every engagement.]" / "Evals pass. [Production doesn't.]" / "Budgets are guardrails [too.]". The lead states the point; the bracketed part completes or twists it. Only the CTA heading may skip the brackets.

CRITICAL OUTPUT FORMAT — follow exactly or the deck breaks:
- Output ONLY the slides. Nothing before the first slide or after the last.
- Put a line containing EXACTLY ${SLIDE_DELIMITER} between every two slides, and nowhere else.
- Within each slide, the FIRST line is the heading; the lines after it are the body.
- Never merge two slides into one. No numbering, no markdown, no preamble.

Example shape (yours should have 7-9 slides):
Nothing stopped the agent, [except the bill.]
The token budget was the only guardrail that fired.
${SLIDE_DELIMITER}
Guardrails you can't see
A passing eval is not a stop. The loop keeps going until something external says no.
${SLIDE_DELIMITER}
Put a broker in front
Every action gets audited before it runs, not after.
${SLIDE_DELIMITER}
Your move
Where does your write boundary sit? Tell me below.`;

  const user = `TOPIC
Title: ${input.title}
${input.angle ? `Angle: ${input.angle}\n` : ""}Source (may be truncated):
${input.content.slice(0, 4000)}
${input.postBody ? `\nThe companion post (align the carousel with it):\n${input.postBody.slice(0, 1500)}` : ""}`;

  return { system, user, role: "writer", temperature: 0.7, maxTokens: 3000, op: "carousel" };
}

// --- Blog article (writer model) -----------------------------------------------

/** Strip an accidental surrounding code fence from a Markdown blog reply. */
export function parseBlog(text: string): string {
  return stripDashes(text.replace(/^```+\w*\n?/, "").replace(/\n?```+\s*$/, "").trim());
}

export function buildBlogPrompt(input: {
  title: string;
  url: string;
  content: string;
  angle?: string | null;
  postBody?: string;
  samples?: string;
}): ChatOptions {
  const system = `You write a blog article for Bilal's personal website, based on a news item. It should read like a thoughtful engineer's blog post — not a LinkedIn post, not marketing copy.

${WRITER_PERSONA}

BLOG RULES:
- Output GitHub-flavored Markdown. Begin with a single "# Title" (one H1) — specific and concrete, never clickbait.
- Then: a short hook opening (2-3 sentences), 3-5 sections each under a "## " H2 heading, and a brief closing takeaway.
- 600-1000 words. Clear, plain prose. Explain the story and why it matters, with his point of view — the engineering angle, not just the news.
- Be concrete, drawn from the STORY (real names, numbers, what actually happened). Never invent facts, numbers, or personal anecdotes, and never name his past clients or projects.
- No hashtags, no emojis, no "in today's fast-paced world" filler, no "it's not X, it's Y" antithesis. Vary sentence length.
- Output ONLY the Markdown article. Do not wrap the whole thing in a code fence.`;

  const user = `SOURCE ITEM
Title: ${input.title}
URL: ${input.url}
${input.angle ? `Angle: ${input.angle}\n` : ""}Content (may be truncated):
${input.content.slice(0, 5000)}
${input.postBody ? `\nThe companion LinkedIn post (keep the article consistent with this take, but longer and standalone):\n${input.postBody.slice(0, 1500)}` : ""}
${input.samples ? `\nBILAL'S REAL BLOG WRITING (match this voice and structure for TONE only; don't reuse its subject):\n${input.samples}` : ""}`;

  return { system, user, role: "writer", temperature: 0.8, maxTokens: 4000, op: "blog" };
}
