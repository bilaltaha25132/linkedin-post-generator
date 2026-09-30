import "server-only";

import { chat } from "@/lib/llm/client";
import { buildHumanizePrompt, parseVariants } from "@/lib/llm/prompts";
import { supabaseAdmin } from "@/lib/supabase/server";
import { aiTells } from "@/lib/voice/tells";

export interface VoiceSample {
  title: string | null;
  content: string;
}

/**
 * Samples of Bilal's real writing to imitate. His own LinkedIn posts always come
 * first, since that's the register being written; the rest are the closest
 * pieces by embedding, or his most recent when there's no embedding. Without
 * that fallback a rate-limited embedding left the writer no voice to copy.
 */
export async function voiceSamplesFor(embedding: number[] | null, count = 3): Promise<VoiceSample[]> {
  const db = supabaseAdmin();
  const { data: posts } = await db
    .from("voice_corpus")
    .select("title,content")
    .eq("kind", "linkedin")
    .order("created_at", { ascending: false })
    .limit(2);
  const linkedin = (posts ?? []) as VoiceSample[];

  let related: VoiceSample[] = [];
  if (embedding) {
    const { data } = await db.rpc("match_voice", { query_embedding: embedding, match_count: count + linkedin.length });
    related = (data ?? []) as VoiceSample[];
  }
  if (related.length === 0) {
    const { data } = await db
      .from("voice_corpus")
      .select("title,content")
      .eq("kind", "blog")
      .order("created_at", { ascending: false })
      .limit(count);
    related = (data ?? []) as VoiceSample[];
  }

  const seen = new Set(linkedin.map((s) => s.content));
  return [...linkedin, ...related.filter((s) => !seen.has(s.content))].slice(0, Math.max(count, linkedin.length + 1));
}

/**
 * Edit a post until it reads as his, keeping the facts. A failed edit, or one
 * that comes back with more tells than it went in with, keeps the original.
 */
export async function humanize(post: string, samples: VoiceSample[]): Promise<string> {
  const before = aiTells(post);
  try {
    const edited = parseVariants(await chat(buildHumanizePrompt(post, samples, before)))[0];
    if (!edited || edited.length < post.length * 0.5) return post;
    return aiTells(edited).length <= before.length ? edited : post;
  } catch {
    return post;
  }
}
