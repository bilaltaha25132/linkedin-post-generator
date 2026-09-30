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
 * Samples of Bilal's real writing to imitate: the closest by embedding when
 * there is one, otherwise his most recent pieces. Without this fallback a
 * rate-limited embedding left the writer with no voice to copy at all.
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
    .in("kind", ["linkedin", "blog"])
    .order("created_at", { ascending: false })
    .limit(count);
  return (data ?? []) as VoiceSample[];
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
