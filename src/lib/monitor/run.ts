import { env } from "@/lib/env";
import { hashUrl } from "@/lib/dedup/url-hash";
import {
  search,
  scrape,
  type FirecrawlScrapeHit,
  type FirecrawlSearchHit,
} from "@/lib/firecrawl/client";
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

  // Least-recently-scanned first so a bounded run rotates through every source
  // over time instead of always hammering the first few.
  const { data: sources, error } = await db
    .from("sources")
    .select("*")
    .eq("enabled", true)
    .order("last_scanned_at", { ascending: true, nullsFirst: true });
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
      // Mark scanned so the next run rotates to other sources.
      await db.from("sources").update({ last_scanned_at: new Date().toISOString() }).eq("id", source.id);

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

// Social posts and videos scored worst on the wire (facebook alone was ~20% of
// all items at avg 47): they're reactions to a story, not the story. Excluding
// them in the query frees result slots for articles; the host check backs it up
// because search engines treat `-site:` as a hint.
const EXCLUDED_HOSTS = [
  "facebook.com",
  "instagram.com",
  "youtube.com",
  "linkedin.com",
  "x.com",
  "twitter.com",
  "tiktok.com",
  "reddit.com",
  "pinterest.com",
];
const EXCLUDE_QUERY = EXCLUDED_HOSTS.map((host) => `-site:${host}`).join(" ");

function isExcludedHost(url: string): boolean {
  const host = hostOf(url);
  return host !== null && EXCLUDED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

async function hitsForSource(source: Source, cfg: MonitorConfig): Promise<FirecrawlSearchHit[]> {
  if (source.kind === "search") {
    const hits = await search(`${source.value} ${EXCLUDE_QUERY}`, cfg.searchLimit, cfg.timeRange);
    return hits.filter((hit) => !isExcludedHost(hit.url));
  }
  if (source.kind === "url") {
    // Title and published time come from the scrape in ingestHit, which every
    // new item goes through — don't pay for the page twice.
    return [{ url: source.value, description: "", bucket: "web" }];
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

  // Search no longer returns page content, so this is where the one credit per
  // item is spent — and only for URLs that aren't already stored, which is most
  // of the saving on a 6-hourly schedule. A failed scrape degrades to the search
  // snippet rather than losing the story.
  const page = await scrape(hit.url).catch(() => null);
  const title =
    hit.title ?? scrapedMeta(page, "title") ?? (source.kind === "url" ? source.label : null);
  const snippet = hit.description || scrapedMeta(page, "description") || null;
  const content = page?.markdown || snippet || "";
  // Nothing to score — e.g. a url source whose page wouldn't scrape.
  if (!content) return "error";

  const publishedAt =
    parseRelativeDate(hit.date) ??
    parseRelativeDate(scrapedMeta(page, "publishedTime", "publishedDate", "date"));
  if (!isFreshEnough(publishedAt, cfg.maxAgeDays)) return "stale";

  const relevance = await chatJSON({
    ...buildRelevancePrompt({ title: title ?? "", snippet: snippet ?? "", content }),
    schema: relevanceSchema,
  });

  const embedding = await embed(`${title ?? ""}\n\n${content.slice(0, 4000)}`);

  const { error } = await db.from("discoveries").insert({
    url: hit.url,
    url_hash: urlHash,
    title,
    source_name: hostOf(hit.url),
    source_id: source.id,
    published_at: publishedAt,
    snippet,
    content_md: content,
    topics: relevance.topics,
    relevance_score: relevance.score,
    relevance_reason: relevance.reason,
    suggested_angle: relevance.angle,
    embedding,
  });
  if (error) throw new Error(`insert discovery failed: ${error.message}`);

  return "new";
}

/** Read a string field out of a scrape's metadata, trying each key in turn. */
function scrapedMeta(page: FirecrawlScrapeHit | null, ...keys: string[]): string | undefined {
  const meta = page?.metadata ?? {};
  for (const key of keys) {
    const value = meta[key];
    if (typeof value === "string" && value) return value;
  }
  return undefined;
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
