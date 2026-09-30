import "server-only";

import { getDiscovery } from "@/lib/discoveries/queries";
import { chat } from "@/lib/llm/client";
import { embed } from "@/lib/llm/embeddings";
import { buildGenerationPrompt, formatDiscussion, parseVariants } from "@/lib/llm/prompts";
import { supabaseAdmin } from "@/lib/supabase/server";

export interface GenerationResult {
  variants: string[];
  similarPosts: { body: string; similarity: number }[];
  /** Set when the topic overlaps an existing post enough to be worth flagging. */
  duplicateWarning: string | null;
}

const NEAR_DUPLICATE_THRESHOLD = 0.82;

export async function generateForDiscovery(
  discoveryId: string,
  opts: { count?: number; guidance?: string } = {},
): Promise<GenerationResult> {
  const db = supabaseAdmin();
  const discovery = await getDiscovery(discoveryId);
  if (!discovery) throw new Error("Discovery not found");

  const content = discovery.content_md ?? discovery.snippet ?? discovery.title ?? "";
  const queryEmbedding = await embed(`${discovery.title ?? ""}\n\n${content.slice(0, 4000)}`);

  // Without an embedding there's no similarity search: draft from the voice
  // rules and recent posts alone.
  const noMatches = Promise.resolve({ data: [] });
  const [voiceRes, similarRes, recentRes] = await Promise.all([
    queryEmbedding ? db.rpc("match_voice", { query_embedding: queryEmbedding, match_count: 3 }) : noMatches,
    queryEmbedding ? db.rpc("match_posts", { query_embedding: queryEmbedding, match_count: 3 }) : noMatches,
    db.from("posts").select("body").order("created_at", { ascending: false }).limit(5),
  ]);

  const voiceSamples = ((voiceRes.data ?? []) as { title: string | null; content: string }[]).map(
    (v) => ({ title: v.title, content: v.content }),
  );
  const similarPosts = ((similarRes.data ?? []) as { body: string; similarity: number }[]).map((s) => ({
    body: s.body,
    similarity: s.similarity,
  }));
  const recentPosts = ((recentRes.data ?? []) as { body: string }[]).map((r) => r.body);

  const raw = await chat(
    buildGenerationPrompt({
      discovery: {
        title: discovery.title ?? "",
        url: discovery.url,
        content,
        angle: discovery.suggested_angle,
        discussion: formatDiscussion(discovery.discussion, discovery.discussion_comments),
      },
      voiceSamples,
      recentPosts,
      count: opts.count ?? 3,
      guidance: opts.guidance,
    }),
  );
  const variants = parseVariants(raw);
  if (variants.length === 0) throw new Error("The writer returned no usable draft. Try again.");

  const top = similarPosts[0];
  const duplicateWarning =
    top && top.similarity > NEAR_DUPLICATE_THRESHOLD
      ? `This overlaps a past post (${Math.round(top.similarity * 100)}% similar). Consider a fresh angle so your feed doesn't repeat itself.`
      : null;

  return { variants, similarPosts, duplicateWarning };
}
