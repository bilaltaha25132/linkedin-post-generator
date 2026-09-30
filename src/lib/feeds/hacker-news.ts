import { normalizeUrl } from "@/lib/dedup/url-hash";
import { clip, htmlToText } from "@/lib/feeds/text";
import type { Discussion, DiscussionComment } from "@/lib/db/types";

// Both APIs are public and keyless. Algolia answers search; the official API
// returns a story's comments in the order HN ranks them, which Algolia doesn't.
const ALGOLIA = "https://hn.algolia.com/api/v1";
const OFFICIAL = "https://hacker-news.firebaseio.com/v0";

export interface HnStory {
  id: string;
  title: string;
  /** The linked article, or the HN thread itself for Ask/Show HN text posts. */
  url: string;
  date: string;
  /** Body of a text post; empty for link posts. */
  text: string;
  discussion: Discussion;
}

interface AlgoliaHit {
  objectID: string;
  title?: string;
  url?: string | null;
  story_text?: string | null;
  points?: number | null;
  num_comments?: number | null;
  created_at: string;
}

const threadUrl = (id: string) => `https://news.ycombinator.com/item?id=${id}`;

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Hacker News returned HTTP ${response.status} for ${url}`);
  return (await response.json()) as T;
}

function discussionOf(hit: AlgoliaHit): Discussion {
  return {
    platform: "Hacker News",
    url: threadUrl(hit.objectID),
    points: hit.points ?? null,
    comments: hit.num_comments ?? null,
  };
}

/** Stories from the last `hours` that cleared `minPoints`, most upvoted first. */
export async function topStories(minPoints: number, hours: number): Promise<HnStory[]> {
  const since = Math.floor(Date.now() / 1000) - hours * 3600;
  const json = await getJson<{ hits: AlgoliaHit[] }>(
    `${ALGOLIA}/search?tags=story&numericFilters=created_at_i>${since},points>=${minPoints}&hitsPerPage=50`,
  );
  return json.hits
    .filter((hit) => hit.title)
    .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
    .map((hit) => ({
      id: hit.objectID,
      title: hit.title!,
      url: hit.url || threadUrl(hit.objectID),
      date: hit.created_at,
      text: hit.story_text ? htmlToText(hit.story_text) : "",
      discussion: discussionOf(hit),
    }));
}

/**
 * The HN thread about a URL, if one has real traction. Lets a story found in a
 * lab's own feed carry the engineers' reaction to it.
 */
export async function findThread(url: string): Promise<{ id: string; discussion: Discussion } | null> {
  const target = normalizeUrl(url);
  const json = await getJson<{ hits: AlgoliaHit[] }>(
    `${ALGOLIA}/search?query=${encodeURIComponent(url)}&restrictSearchableAttributes=url&tags=story&hitsPerPage=5`,
  );
  const best = json.hits
    .filter((hit) => hit.url && normalizeUrl(hit.url) === target)
    .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))[0];
  if (!best || ((best.points ?? 0) < 20 && (best.num_comments ?? 0) < 10)) return null;
  return { id: best.objectID, discussion: discussionOf(best) };
}

interface OfficialItem {
  by?: string;
  text?: string;
  kids?: number[];
  deleted?: boolean;
  dead?: boolean;
}

/** The thread's top-ranked comments, as plain text. */
export async function topComments(storyId: string, count = 5): Promise<DiscussionComment[]> {
  const story = await getJson<OfficialItem>(`${OFFICIAL}/item/${storyId}.json`);
  // A few spares, since the top slots are sometimes deleted or flagged.
  const kids = (story.kids ?? []).slice(0, count + 3);
  const items = await Promise.all(
    kids.map((id) => getJson<OfficialItem | null>(`${OFFICIAL}/item/${id}.json`).catch(() => null)),
  );
  return items
    .filter((item): item is OfficialItem => Boolean(item?.text && item.by && !item.deleted && !item.dead))
    .slice(0, count)
    .map((item) => ({ author: item.by!, text: clip(htmlToText(item.text!), 600) }));
}
