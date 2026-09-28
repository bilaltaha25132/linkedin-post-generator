import "server-only";

import { chat } from "@/lib/llm/client";
import { embed } from "@/lib/llm/embeddings";
import { buildEnhancePrompt, buildFactCheckPrompt, parseVariants } from "@/lib/llm/prompts";
import { supabaseAdmin } from "@/lib/supabase/server";

const MIN_DRAFT_CHARS = 20;

/** Rewrite a post Bilal wrote himself into publish-ready versions in his voice. */
export async function enhanceDraft(draft: string, guidance?: string): Promise<string[]> {
  const text = draft.trim();
  if (text.length < MIN_DRAFT_CHARS) {
    throw new Error("Write at least a sentence or two first, then enhance it.");
  }

  const db = supabaseAdmin();
  const queryEmbedding = await embed(text.slice(0, 4000));
  const [voiceRes, recentRes] = await Promise.all([
    queryEmbedding
      ? db.rpc("match_voice", { query_embedding: queryEmbedding, match_count: 3 })
      : Promise.resolve({ data: [] }),
    db.from("posts").select("body").order("created_at", { ascending: false }).limit(5),
  ]);

  const raw = await chat(
    buildEnhancePrompt({
      draft: text,
      guidance,
      voiceSamples: (voiceRes.data ?? []) as { title: string | null; content: string }[],
      recentPosts: ((recentRes.data ?? []) as { body: string }[]).map((r) => r.body),
    }),
  );
  const versions = parseVariants(raw);
  if (versions.length === 0) throw new Error("The writer returned nothing usable. Try again.");

  // A failed check keeps the unchecked version rather than losing the rewrite.
  return Promise.all(
    versions.map(async (version) => {
      const checked = await chat(buildFactCheckPrompt(text, version)).catch(() => "");
      return parseVariants(checked)[0] || version;
    }),
  );
}
