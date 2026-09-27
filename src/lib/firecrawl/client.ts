import { env } from "@/lib/env";

// Search uses v2: it's the only version that accepts `sources: [news, web]` and
// returns the news/web buckets (v1 rejects `sources` and returns a flat `data`
// array). Scrape stays on v1 where the flat response is stable.
const SEARCH_ENDPOINT = "https://api.firecrawl.dev/v2/search";
const SCRAPE_ENDPOINT = "https://api.firecrawl.dev/v1/scrape";

export interface FirecrawlSearchHit {
  url: string;
  title?: string;
  description?: string;
  date?: string;
  bucket: "news" | "web";
}

interface SearchItem {
  url?: string;
  title?: string;
  snippet?: string;
  description?: string;
  date?: string;
}

interface SearchResponse {
  data?: { news?: SearchItem[]; web?: SearchItem[] } | SearchItem[];
  news?: SearchItem[];
  web?: SearchItem[];
}

/** What Firecrawl answers when a key is out of credits or otherwise unusable. */
const KEY_EXHAUSTED = new Set([401, 402, 403, 429]);

// Round-robin cursor and the keys parked as out-of-credits. Both are per-process
// state, which is the right scope: one monitoring pass makes many calls, so a
// key that proves dry is skipped for the rest of that pass and only costs one
// wasted request in the next one. Keys are forgotten once every key is dry, in
// case a quota topped up mid-process.
let nextKey = 0;
const parked = new Set<string>();

/**
 * The keys to try, in order: the round-robin favourite first, the remaining keys
 * behind it as fallbacks. Parked keys are skipped while any live key remains.
 */
function keyOrder(): string[] {
  const keys = env.firecrawlKeys();
  let live = keys.filter((key) => !parked.has(key));
  if (live.length === 0) {
    parked.clear();
    live = keys;
  }
  const start = nextKey++ % live.length;
  return [...live.slice(start), ...live.slice(0, start)];
}

/**
 * POST to a Firecrawl endpoint, moving to the next key when this one is dry.
 * A non-credit failure (a bad URL, a 5xx) belongs to the request, not the key,
 * so it's returned for the caller to raise rather than retried on every key.
 */
async function firecrawlPost(url: string, body: unknown, timeoutMs: number): Promise<Response> {
  const keys = keyOrder();
  for (let i = 0; i < keys.length; i += 1) {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${keys[i]}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const lastKey = i === keys.length - 1;
    if (response.ok || lastKey || !KEY_EXHAUSTED.has(response.status)) return response;
    parked.add(keys[i]);
  }
  throw new Error("No Firecrawl API keys are configured");
}

function httpError(label: string, response: Response): Error {
  const hint = KEY_EXHAUSTED.has(response.status)
    ? " — every Firecrawl API key is out of credits or blocked"
    : "";
  return new Error(`Firecrawl ${label} returned HTTP ${response.status}${hint}`);
}

/**
 * Firecrawl `/search`. Applies the Google `tbs` time filter, requests both the
 * `news` and `web` buckets, then flattens them into a single URL-deduped list
 * (news first, so news metadata wins).
 *
 * Deliberately no `scrapeOptions`: scraping every hit costs a credit per page,
 * `limit` applies per source (news+web doubles it), and most hits on a 6-hourly
 * schedule are pages we already stored. Search alone is 2 credits per 10
 * results; the monitor scrapes only the items that turn out to be new.
 *
 * @param timeRange Google tbs value: qdr:h | qdr:d | qdr:w | qdr:m
 */
export async function search(
  query: string,
  limit: number,
  timeRange: string,
): Promise<FirecrawlSearchHit[]> {
  const response = await firecrawlPost(
    SEARCH_ENDPOINT,
    { query, limit, tbs: timeRange, sources: ["news", "web"] },
    20_000,
  );

  if (!response.ok) throw httpError(`search for query="${query}"`, response);

  return flattenSearchResults((await response.json()) as SearchResponse);
}

/**
 * Flatten a `/search` response into deduped hits, reading `news` then `web` so a
 * URL seen in `news` keeps its news snippet/date. The v2 API nests the buckets
 * under `data` (`{ data: { news, web } }`); we also accept top-level buckets and
 * the legacy flat `data[]` array for forward/backward compatibility.
 */
function flattenSearchResults(json: SearchResponse): FirecrawlSearchHit[] {
  const seen = new Set<string>();
  const hits: FirecrawlSearchHit[] = [];

  const take = (items: SearchItem[] | undefined, bucket: "news" | "web"): void => {
    for (const item of items ?? []) {
      const url = item.url;
      if (!url || seen.has(url)) continue;
      seen.add(url);
      hits.push({
        url,
        title: item.title,
        // News items expose `snippet`; web items expose `description`.
        description: item.snippet ?? item.description,
        date: item.date,
        bucket,
      });
    }
  };

  const data = json.data;
  if (data && !Array.isArray(data)) {
    take(data.news, "news");
    take(data.web, "web");
  }
  take(json.news, "news");
  take(json.web, "web");
  if (Array.isArray(data)) take(data, "web");

  return hits;
}

export interface FirecrawlScrapeHit {
  markdown?: string;
  metadata?: Record<string, unknown>;
}

/** Scrape a single page to markdown. Returns null on an empty response. */
export async function scrape(url: string): Promise<FirecrawlScrapeHit | null> {
  const response = await firecrawlPost(
    SCRAPE_ENDPOINT,
    { url, formats: ["markdown"], onlyMainContent: true },
    45_000,
  );

  if (!response.ok) throw httpError(`scrape of "${url}"`, response);

  const json = (await response.json()) as { data?: FirecrawlScrapeHit };
  return json.data ?? null;
}
