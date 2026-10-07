import "server-only";

import { embed } from "@/lib/llm/embeddings";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Scans don't embed stories (that spent the free embeddings quota on hundreds a
 * day). Features that need a vector embed just the few strong, recent stories
 * they look at, once each; the vector is kept on the row.
 */
export async function embedTopStories(opts: { hours?: number; minScore?: number; limit?: number } = {}): Promise<number> {
  const since = new Date(Date.now() - (opts.hours ?? 72) * 3_600_000).toISOString();
  const db = supabaseAdmin();
  const { data } = await db
    .from("discoveries")
    .select("id,title,snippet,suggested_angle")
    .is("embedding", null)
    .gte("discovered_at", since)
    .gte("relevance_score", opts.minScore ?? 60)
    .in("status", ["new", "saved"])
    .order("relevance_score", { ascending: false })
    .limit(opts.limit ?? 12);

  const queue = data ?? [];
  let cursor = 0;
  let done = 0;
  const worker = async () => {
    while (cursor < queue.length) {
      const d = queue[cursor++];
      const vector = await embed([d.title, d.snippet, d.suggested_angle].filter(Boolean).join("\n\n"));
      // A refusal is usually the quota; the rest would be refused too.
      if (!vector) return;
      await db.from("discoveries").update({ embedding: vector }).eq("id", d.id);
      done++;
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  return done;
}
