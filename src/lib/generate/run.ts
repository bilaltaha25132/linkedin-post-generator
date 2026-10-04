import "server-only";

import { getDiscovery } from "@/lib/discoveries/queries";
import { chat } from "@/lib/llm/client";
import { embed } from "@/lib/llm/embeddings";
import { POST_SHAPES, buildGenerationPrompt, buildRevisePrompt, formatDiscussion, parseVariants } from "@/lib/llm/prompts";
import { supabaseAdmin } from "@/lib/supabase/server";
import { humanize, voiceSamplesFor } from "@/lib/voice/humanize";

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

  // Without an embedding there's no similar-post check; voice samples fall back
  // to his most recent writing.
  const noMatches = Promise.resolve({ data: [] });
  const [voiceSamples, similarRes, recentRes] = await Promise.all([
    voiceSamplesFor(queryEmbedding),
    queryEmbedding ? db.rpc("match_posts", { query_embedding: queryEmbedding, match_count: 3 }) : noMatches,
    db.from("posts").select("body").order("created_at", { ascending: false }).limit(5),
  ]);

  const similarPosts = ((similarRes.data ?? []) as { body: string; similarity: number }[]).map((s) => ({
    body: s.body,
    similarity: s.similarity,
  }));
  const recentPosts = ((recentRes.data ?? []) as { body: string }[]).map((r) => r.body);

  const shapes = [...POST_SHAPES].sort(() => Math.random() - 0.5).slice(0, opts.count ?? 3);
  const takes = await Promise.allSettled(
    shapes.map(async (shape) => {
      const draft = await chat(
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
          shape,
          guidance: opts.guidance,
        }),
      );
      const post = parseVariants(draft)[0];
      return post ? humanize(post, voiceSamples) : "";
    }),
  );
  const variants = takes.flatMap((t) => (t.status === "fulfilled" && t.value ? [t.value] : []));
  if (variants.length === 0) throw new Error("The writer returned no usable draft. Try again.");

  const top = similarPosts[0];
  const duplicateWarning =
    top && top.similarity > NEAR_DUPLICATE_THRESHOLD
      ? `This overlaps a past post (${Math.round(top.similarity * 100)}% similar). Consider a fresh angle so your feed doesn't repeat itself.`
      : null;

  return { variants, similarPosts, duplicateWarning };
}

/** Rewrite one take following Bilal's note on it; the result becomes a new take. */
export async function reviseForDiscovery(discoveryId: string, post: string, instruction: string): Promise<string> {
  if (!instruction.trim()) throw new Error("Say what you'd like changed first.");
  const discovery = await getDiscovery(discoveryId);
  if (!discovery) throw new Error("Discovery not found");

  const voiceSamples = await voiceSamplesFor(null);
  const draft = await chat(
    buildRevisePrompt({
      post,
      instruction,
      discovery: {
        title: discovery.title ?? "",
        url: discovery.url,
        content: discovery.content_md ?? discovery.snippet ?? discovery.title ?? "",
        discussion: formatDiscussion(discovery.discussion, discovery.discussion_comments),
      },
      voiceSamples,
    }),
  );
  const revised = parseVariants(draft)[0];
  if (!revised) throw new Error("The writer returned nothing. Try again.");
  return humanize(revised, voiceSamples);
}
