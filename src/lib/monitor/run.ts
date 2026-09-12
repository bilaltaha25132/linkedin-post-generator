import { env } from "@/lib/env";
import { hashUrl } from "@/lib/dedup/url-hash";
import { search, scrape, type FirecrawlSearchHit } from "@/lib/firecrawl/client";
import { isFreshEnough, parseRelativeDate } from "@/lib/firecrawl/dates";
import { chatJSON } from "@/lib/llm/client";
import { embed } from "@/lib/llm/embeddings";
import { buildRelevancePrompt, relevanceSchema } from "@/lib/llm/prompts";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Source } from "@/lib/db/types";

export interface MonitorResult {
  sourcesRun: number;
  hitsSeen: number;
  newDiscoveries: number;
  skippedDuplicate: number;
  skippedStale: number;
  errors: string[];
}

/**
 * One monitoring pass: for each enabled source, pull items, drop ones we've
 * already seen or that are too old, score them for postability, embed, and
 * store. Runs sequentially to stay within Gemini's free-tier rate limits.
 */
export async function runMonitor(): Promise<MonitorResult> {
  const db = supabaseAdmin();
  const cfg = env.monitor();
  const result: MonitorResult = {
    sourcesRun: 0,
    hitsSeen: 0,
    newDiscoveries: 0,
    skippedDuplicate: 0,
    skippedStale: 0,
    errors: [],
  };

  const { data: sources, error } = await db
    .from("sources")
    .select("*")
    .eq("enabled", true);
  if (error) throw new Error(`Loading sources failed: ${error.message}`);

  // Serverless functions are killed at ~60s. Stop well before then and let the
  // next pass continue where this one left off (dedup makes it resumable). Two
  // tiers: don't START a new source late (each Firecrawl search can take ~20s),
  // and don't process new items past the hard deadline.
  const deadline = Date.now() + cfg.budgetMs;
  const sourceStartBy = deadline - 22_000;

  for (const source of (sources ?? []) as Source[]) {
    if (result.newDiscoveries >= cfg.maxNewPerRun || Date.now() > sourceStartBy) break;
    try {
      const hits = await hitsForSource(source, cfg);
      result.sourcesRun += 1;
      result.hitsSeen += hits.length;

      for (const hit of hits) {
        if (result.newDiscoveries >= cfg.maxNewPerRun || Date.now() > deadline) break;
        const outcome = await ingestHit(hit, source, cfg);
        if (outcome === "new") result.newDiscoveries += 1;
        else if (outcome === "duplicate") result.skippedDuplicate += 1;
        else if (outcome === "stale") result.skippedStale += 1;
      }
    } catch (err) {
      result.errors.push(`source ${source.id} (${source.kind}:${source.value}): ${(err as Error).message}`);
    }
  }

  return result;
}

type MonitorConfig = ReturnType<typeof env.monitor>;
type IngestOutcome = "new" | "duplicate" | "stale" | "error";

async function hitsForSource(source: Source, cfg: MonitorConfig): Promise<FirecrawlSearchHit[]> {
  if (source.kind === "search") {
    return search(source.value, cfg.searchLimit, cfg.timeRange);
  }
  if (source.kind === "url") {
    const page = await scrape(source.value);
    if (!page?.markdown) return [];
    const meta = page.metadata ?? {};
    return [
      {
        url: source.value,
        title: (meta.title as string) ?? source.label ?? source.value,
        description: (meta.description as string) ?? "",
        markdown: page.markdown,
        date: (meta.publishedTime as string) ?? undefined,
        bucket: "web",
      },
    ];
  }
  // RSS sources are configurable but not yet ingested — see docs/architecture.md.
  return [];
}

async function ingestHit(
  hit: FirecrawlSearchHit,
  source: Source,
  cfg: MonitorConfig,
): Promise<IngestOutcome> {
  const db = supabaseAdmin();
  const urlHash = hashUrl(hit.url);

  const { data: existing } = await db
    .from("discoveries")
    .select("id")
    .eq("url_hash", urlHash)
    .maybeSingle();
  if (existing) return "duplicate";

  const publishedAt = parseRelativeDate(hit.date);
  if (!isFreshEnough(publishedAt, cfg.maxAgeDays)) return "stale";

  const content = hit.markdown ?? hit.description ?? "";
  const relevance = await chatJSON({
    ...buildRelevancePrompt({
      title: hit.title ?? "",
      snippet: hit.description ?? "",
      content,
    }),
    schema: relevanceSchema,
  });

  const embedding = await embed(`${hit.title ?? ""}\n\n${content.slice(0, 4000)}`);

  const { error } = await db.from("discoveries").insert({
    url: hit.url,
    url_hash: urlHash,
    title: hit.title ?? null,
    source_name: hostOf(hit.url),
    source_id: source.id,
    published_at: publishedAt,
    snippet: hit.description ?? null,
    content_md: content || null,
    topics: relevance.topics,
    relevance_score: relevance.score,
    relevance_reason: relevance.reason,
    suggested_angle: relevance.angle,
    embedding,
  });
  if (error) throw new Error(`insert discovery failed: ${error.message}`);

  return "new";
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
