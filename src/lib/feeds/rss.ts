import { decodeEntities, htmlToText } from "@/lib/feeds/text";

export interface FeedItem {
  url: string;
  title: string;
  /** ISO timestamp, or null when the feed doesn't date the entry. */
  date: string | null;
  summary: string;
  /** The full article when the feed carries it; empty otherwise. */
  content: string;
}

const USER_AGENT = "SignalDesk/1.0 (personal news monitor)";

/**
 * Read an RSS 2.0 or Atom feed, newest first. The monitor watches a handful of
 * known feeds, so a tolerant tag reader is enough — no XML dependency.
 */
export async function readFeed(url: string): Promise<FeedItem[]> {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Feed ${url} returned HTTP ${response.status}`);
  return parseFeed(await response.text(), url);
}

export function parseFeed(xml: string, feedUrl: string): FeedItem[] {
  const blocks = [...xml.matchAll(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi)].map((m) => m[0]);
  const items: FeedItem[] = [];
  for (const block of blocks) {
    const url = linkOf(block, feedUrl);
    const title = htmlToText(tag(block, "title"));
    if (!url || !title) continue;
    const content = htmlToText(tag(block, "content:encoded") || tag(block, "content"));
    const summary = htmlToText(tag(block, "description") || tag(block, "summary"));
    items.push({
      url,
      title,
      date: dateOf(block),
      summary: summary || content.slice(0, 500),
      content,
    });
  }
  return items.sort((a, b) => Date.parse(b.date ?? "0") - Date.parse(a.date ?? "0"));
}

/** Inner text of the first `<name>` element, CDATA unwrapped and entities decoded once. */
function tag(block: string, name: string): string {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  if (!match) return "";
  const cdata = match[1].match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  // CDATA holds raw HTML; otherwise the HTML arrives entity-escaped.
  return cdata ? cdata[1] : decodeEntities(match[1]);
}

function linkOf(block: string, feedUrl: string): string | null {
  const alternate =
    block.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i)?.[1] ??
    block.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']alternate["']/i)?.[1];
  const atomHref = block.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1];
  const raw = alternate ?? (tag(block, "link").trim() || atomHref);
  if (!raw) return null;
  try {
    return new URL(decodeEntities(raw.trim()), feedUrl).toString();
  } catch {
    return null;
  }
}

function dateOf(block: string): string | null {
  for (const name of ["pubDate", "published", "updated", "dc:date"]) {
    const raw = tag(block, name).trim();
    const parsed = raw ? Date.parse(raw) : NaN;
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }
  return null;
}
