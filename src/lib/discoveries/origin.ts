import type { Discovery } from "@/lib/db/types";
import { paperLink } from "@/lib/papers";

/** Where a story came from, as the feed's "From" filter groups it. */
export type Origin = "research" | "models" | "news" | "hn" | "search";

export const ORIGIN_LABEL: Record<Origin, string> = {
  research: "Research & papers",
  models: "New open models",
  news: "News & blogs",
  hn: "Hacker News",
  search: "Web search",
};

// Feeds that publish research write-ups rather than news.
const RESEARCH_FEED = /\bresearch\b|^METR$/i;

/** A paper counts as research wherever it was found: HN, Reddit or a feed. */
export function originOf(d: Pick<Discovery, "url" | "sources">): Origin {
  const kind = d.sources?.kind;
  if (kind === "papers" || paperLink(d.url) || RESEARCH_FEED.test(d.sources?.label ?? "")) return "research";
  if (kind === "models") return "models";
  if (kind === "hn") return "hn";
  if (kind === "search" || kind === "url") return "search";
  return "news";
}
