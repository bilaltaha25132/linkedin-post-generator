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
  markdown?: string;
  date?: string;
  bucket: "news" | "web";
}

interface SearchItem {
  url?: string;
  title?: string;
  snippet?: string;
  description?: string;
  markdown?: string;
  date?: string;
}

interface SearchResponse {
  data?: { news?: SearchItem[]; web?: SearchItem[] } | SearchItem[];
  news?: SearchItem[];
  web?: SearchItem[];
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${env.firecrawlKey()}`,
    "Content-Type": "application/json",
  };
}

/**
 * Firecrawl `/search`. Applies the Google `tbs` time filter, requests both the
 * `news` and `web` buckets, scrapes each hit to markdown, then flattens the two
 * buckets into a single URL-deduped list (news first, so news metadata wins).
 *
 * @param timeRange Google tbs value: qdr:h | qdr:d | qdr:w | qdr:m
 */
export async function search(
  query: string,
  limit: number,
  timeRange: string,
): Promise<FirecrawlSearchHit[]> {
  const response = await fetch(SEARCH_ENDPOINT, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      query,
      limit,
      tbs: timeRange,
      sources: ["news", "web"],
      scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Firecrawl search returned HTTP ${response.status} for query="${query}"`);
  }

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
        markdown: item.markdown,
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
  const response = await fetch(SCRAPE_ENDPOINT, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    throw new Error(`Firecrawl scrape returned HTTP ${response.status} for url="${url}"`);
  }

  const json = (await response.json()) as { data?: FirecrawlScrapeHit };
  return json.data ?? null;
}
