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
 * Samples of Bilal's writing for tone: the closest pieces by embedding, or his
 * most recent blog posts when there's no embedding. Without that fallback a
 * rate-limited embedding left the writer no voice to match. His LinkedIn posts
 * were partly AI-assisted, so they aren't used as a voice reference.
 */
export async function voiceSamplesFor(embedding: number[] | null, count = 3): Promise<VoiceSample[]> {
  const db = supabaseAdmin();
  if (embedding) {
    const { data } = await db.rpc("match_voice", { query_embedding: embedding, match_count: count });
    if (data?.length) return data as VoiceSample[];
  }
  const { data } = await db
    .from("voice_corpus")
    .select("title,content")
    .eq("kind", "blog")
    .order("created_at", { ascending: false })
    .limit(count);
  return (data ?? []) as VoiceSample[];
}

const MAX_EDITS = 3;

/**
 * Edit a post until it reads as his, keeping the facts. One edit left about a
 * third of the tells in place (2026-10), so it goes again while any remain. An
 * edit that fails, guts the post, or adds tells is thrown away.
 */
export async function humanize(post: string, samples: VoiceSample[]): Promise<string> {
  let current = post;
  for (let i = 0; i < MAX_EDITS; i++) {
    const before = aiTells(current);
    if (i > 0 && before.length === 0) break;
    try {
      const edited = parseVariants(await chat(buildHumanizePrompt(current, samples, before)))[0];
      if (!edited || edited.length < current.length * 0.5) break;
      if (aiTells(edited).length > before.length) continue;
      current = edited;
    } catch {
      break;
    }
  }
  return current;
}
