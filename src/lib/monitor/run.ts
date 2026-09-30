import { env } from "@/lib/env";
import { hashUrl } from "@/lib/dedup/url-hash";
import { search, scrape, type FirecrawlScrapeHit } from "@/lib/firecrawl/client";
import { isFreshEnough, parseRelativeDate } from "@/lib/firecrawl/dates";
import { findThread, topComments, topStories } from "@/lib/feeds/hacker-news";
import { readFeed } from "@/lib/feeds/rss";
import { chatJSON } from "@/lib/llm/client";
import { buildRelevancePrompt, formatDiscussion, relevanceSchema } from "@/lib/llm/prompts";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Discussion, DiscussionComment, Source } from "@/lib/db/types";

export interface MonitorResult {
  sourcesRun: number;
  hitsSeen: number;
  newDiscoveries: number;
  skippedDuplicate: number;
  skippedStale: number;
  errors: string[];
}

/** A story a source surfaced, before it's checked, scraped and scored. */
interface WireHit {
  url: string;
  title?: string;
  description?: string;
  /** The date as the source gave it: ISO, RFC 822, or "3 hours ago". */
  date?: string;
  /** Article text the source already carries; long enough, it saves a scrape. */
  content?: string;
  /** Set for Hacker News stories, whose thread needn't be looked up. */
  hn?: { id: string; discussion: Discussion };
}

type MonitorConfig = ReturnType<typeof env.monitor>;
type IngestOutcome = "new" | "duplicate" | "stale" | "error";

// Read on every pass: free, and current to the hour. Search and page sources
// cost credits and rotate instead.
const FEED_KINDS = new Set<Source["kind"]>(["hn", "rss"]);
const HN_WINDOW_HOURS = 24;
// Newest entries considered per feed. Some feeds carry their whole archive.
const FEED_ITEMS = 10;
// A feed's own text above this length is the article; no need to pay for a scrape.
const FULL_TEXT_CHARS = 1500;
// Stop starting items this long before the deadline, so the last scrape and
// scoring finish inside the function limit.
const ITEM_TAIL_MS = 40_000;

/**
 * One monitoring pass: read every feed and, when due, one search source; drop
 * what's already stored or too old; then scrape, attach the public discussion,
 * score and store the rest, a few at a time, until the time budget runs out.
 * Anything left over is still in its feed for the next pass.
 */
export async function runMonitor(opts: { budgetMs?: number } = {}): Promise<MonitorResult> {
  const db = supabaseAdmin();
  const cfg = env.monitor();
  const deadline = Date.now() + (opts.budgetMs ?? cfg.budgetMs);
  const result: MonitorResult = {
    sourcesRun: 0,
    hitsSeen: 0,
    newDiscoveries: 0,
    skippedDuplicate: 0,
    skippedStale: 0,
    errors: [],
  };

  // Least-recently-scanned first, so rotating sources take turns.
  const { data, error } = await db
    .from("sources")
    .select("*")
    .eq("enabled", true)
    .order("last_scanned_at", { ascending: true, nullsFirst: true });
  if (error) throw new Error(`Loading sources failed: ${error.message}`);
  const sources = (data ?? []) as Source[];

  const feeds = sources.filter((s) => FEED_KINDS.has(s.kind));
  const rotating = sources.filter((s) => !FEED_KINDS.has(s.kind));
  const toRead = [...feeds, ...(searchDue(rotating, cfg) ? rotating.slice(0, 1) : [])];

  const fetched = await Promise.all(
    toRead.map(async (source) => {
      try {
        const hits = await hitsForSource(source, cfg);
        result.sourcesRun += 1;
        await db.from("sources").update({ last_scanned_at: new Date().toISOString() }).eq("id", source.id);
        return { source, hits };
      } catch (err) {
        result.errors.push(`${source.label ?? source.value}: ${(err as Error).message}`);
        return { source, hits: [] as WireHit[] };
      }
    }),
  );

  const queue = await unseenInTurn(fetched, cfg, result);

  // Workers share one cursor; `taken` caps each source's share of the pass.
  const taken = new Map<string, number>();
  let cursor = 0;
  const worker = async () => {
    while (cursor < queue.length) {
      if (result.newDiscoveries >= cfg.maxNewPerRun || Date.now() > deadline - ITEM_TAIL_MS) return;
      const { source, hit } = queue[cursor++];
      const count = taken.get(source.id) ?? 0;
      if (count >= cfg.maxItemsPerSource) continue;
      taken.set(source.id, count + 1);
      try {
        const outcome = await ingestHit(hit, source, cfg);
        if (outcome === "new") result.newDiscoveries += 1;
        else if (outcome === "duplicate") result.skippedDuplicate += 1;
        else if (outcome === "stale") result.skippedStale += 1;
      } catch (err) {
        result.errors.push(`${hit.url}: ${(err as Error).message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: cfg.concurrency }, worker));

  return result;
}

/** A search is due when no rotating source has been scanned within the interval. */
function searchDue(rotating: Source[], cfg: MonitorConfig): boolean {
  if (rotating.length === 0) return false;
  const latest = Math.max(...rotating.map((s) => (s.last_scanned_at ? Date.parse(s.last_scanned_at) : 0)));
  return Date.now() - latest >= cfg.searchIntervalHours * 3_600_000;
}

/**
 * Drop stale and already-stored hits (one query, before anything costs money),
 * then interleave the sources so every feed gets a turn early in the pass.
 */
async function unseenInTurn(
  fetched: { source: Source; hits: WireHit[] }[],
  cfg: MonitorConfig,
  result: MonitorResult,
): Promise<{ source: Source; hit: WireHit; hash: string }[]> {
  const perSource = fetched.map(({ source, hits }) => {
    result.hitsSeen += hits.length;
    return hits.flatMap((hit) => {
      if (!isFreshEnough(parseRelativeDate(hit.date), cfg.maxAgeDays)) {
        result.skippedStale += 1;
        return [];
      }
      return [{ source, hit, hash: hashUrl(hit.url) }];
    });
  });

  const stored = await storedHashes(perSource.flat().map((c) => c.hash));
  const seen = new Set<string>();
  const unseen = perSource.map((candidates) =>
    candidates.filter((c) => {
      if (stored.has(c.hash) || seen.has(c.hash)) {
        result.skippedDuplicate += 1;
        return false;
      }
      seen.add(c.hash);
      return true;
    }),
  );

  const longest = Math.max(0, ...unseen.map((c) => c.length));
  return Array.from({ length: longest }, (_, i) => unseen.flatMap((c) => (c[i] ? [c[i]] : []))).flat();
}

async function storedHashes(hashes: string[]): Promise<Set<string>> {
  const db = supabaseAdmin();
  const found = new Set<string>();
  for (let i = 0; i < hashes.length; i += 200) {
    const { data, error } = await db.from("discoveries").select("url_hash").in("url_hash", hashes.slice(i, i + 200));
    if (error) throw new Error(`Checking stored items failed: ${error.message}`);
    for (const row of data ?? []) found.add(row.url_hash as string);
  }
  return found;
}

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

async function hitsForSource(source: Source, cfg: MonitorConfig): Promise<WireHit[]> {
  switch (source.kind) {
    case "hn": {
      const minPoints = Number.parseInt(source.value, 10) || 100;
      const stories = await topStories(minPoints, HN_WINDOW_HOURS);
      return stories.map((story) => ({
        url: story.url,
        title: story.title,
        date: story.date,
        description: story.text.slice(0, 300),
        content: story.text,
        hn: { id: story.id, discussion: story.discussion },
      }));
    }
    case "rss": {
      const items = await readFeed(source.value);
      return items.slice(0, FEED_ITEMS).map((item) => ({
        url: item.url,
        title: item.title,
        date: item.date ?? undefined,
        description: item.summary.slice(0, 500),
        content: item.content,
      }));
    }
    case "search": {
      const hits = await search(`${source.value} ${EXCLUDE_QUERY}`, cfg.searchLimit, cfg.timeRange);
      return hits.filter((hit) => !isExcludedHost(hit.url));
    }
    case "url":
      // Title and published time come from the scrape in ingestHit.
      return [{ url: source.value }];
  }
}

async function ingestHit(hit: WireHit, source: Source, cfg: MonitorConfig): Promise<IngestOutcome> {
  // Scraping is the one credit an item costs, so skip it when the feed already
  // carries the article, or the link is a social post or an HN text thread. A
  // failed scrape degrades to the feed's own text rather than losing the story.
  const needsScrape =
    (hit.content?.length ?? 0) < FULL_TEXT_CHARS &&
    !isExcludedHost(hit.url) &&
    hostOf(hit.url) !== "news.ycombinator.com";
  const [page, thread] = await Promise.all([
    needsScrape ? scrape(hit.url).catch(() => null) : null,
    threadFor(hit),
  ]);

  const title = hit.title ?? scrapedMeta(page, "title") ?? (source.kind === "url" ? source.label : null);
  const snippet = hit.description || scrapedMeta(page, "description") || null;
  const content = page?.markdown || hit.content || snippet || "";
  // Nothing to score — e.g. a url source whose page wouldn't scrape. A linked
  // tweet with a lively HN thread still has something to say.
  if (!content && !thread) return "error";

  const publishedAt =
    parseRelativeDate(hit.date) ??
    parseRelativeDate(scrapedMeta(page, "publishedTime", "publishedDate", "date"));
  if (!isFreshEnough(publishedAt, cfg.maxAgeDays)) return "stale";

  const relevance = await chatJSON({
    ...buildRelevancePrompt({
      title: title ?? "",
      snippet: snippet ?? "",
      content: content || (title ?? ""),
      discussion: formatDiscussion(thread?.discussion ?? null, thread?.comments ?? null, 300),
    }),
    schema: relevanceSchema,
  });

  const { error } = await supabaseAdmin().from("discoveries").insert({
    url: hit.url,
    url_hash: hashUrl(hit.url),
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
    key_numbers: relevance.key_numbers,
    is_launch: relevance.launch,
    discussion: thread?.discussion ?? null,
    discussion_comments: thread?.comments ?? null,
  });
  // Two feeds can carry the same story in one pass; the second insert loses.
  if (error?.code === "23505") return "duplicate";
  if (error) throw new Error(`insert discovery failed: ${error.message}`);

  return "new";
}

/**
 * The story's Hacker News thread and its top comments, when it has one. Purely
 * additive: a lookup failure leaves the story without a discussion.
 */
async function threadFor(
  hit: WireHit,
): Promise<{ discussion: Discussion; comments: DiscussionComment[] } | null> {
  try {
    const thread = hit.hn ?? (await findThread(hit.url));
    if (!thread) return null;
    return { discussion: thread.discussion, comments: await topComments(thread.id) };
  } catch {
    return null;
  }
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
