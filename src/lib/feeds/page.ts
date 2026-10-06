import { decodeEntities, htmlToText } from "@/lib/feeds/text";

// Fetching an article ourselves costs nothing; a Firecrawl scrape costs a
// credit. Most blogs and news sites serve their text in plain HTML, so this
// goes first and Firecrawl is only the fallback for pages it can't read
// (JavaScript-rendered sites, bot walls).

export interface FetchedPage {
  text: string;
  title?: string;
  description?: string;
  published?: string;
}

const MAX_BYTES = 3_000_000;
const MAX_TEXT = 30_000;

function meta(html: string, ...names: string[]): string | undefined {
  for (const name of names) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name|itemprop)=["']${name}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name|itemprop)=["']${name}["']`,
      "i",
    );
    const m = re.exec(html);
    const value = m?.[1] ?? m?.[2];
    if (value?.trim()) return decodeEntities(value.trim());
  }
  return undefined;
}

/** The longest block of a given tag, which on most article pages is the article. */
function largest(html: string, tag: string): string | null {
  const blocks = html.match(new RegExp(`<${tag}[\\s>][\\s\\S]*?</${tag}>`, "gi"));
  return blocks?.length ? blocks.reduce((a, b) => (b.length > a.length ? b : a)) : null;
}

/** Plain-text article body and metadata, or null when the page can't be read. */
export async function fetchPage(url: string): Promise<FetchedPage | null> {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SignalDesk/1.0; personal news reader)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok || !(response.headers.get("content-type") ?? "").includes("html")) return null;
    const html = (await response.text()).slice(0, MAX_BYTES);

    const title = meta(html, "og:title", "twitter:title") ?? /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1]?.trim();
    const body = (largest(html, "article") ?? largest(html, "main") ?? largest(html, "body") ?? html).replace(
      /<(nav|header|footer|aside|form|button)[\s>][\s\S]*?<\/\1>/gi,
      " ",
    );
    return {
      text: htmlToText(body).slice(0, MAX_TEXT),
      title: title ? decodeEntities(title) : undefined,
      description: meta(html, "og:description", "description", "twitter:description"),
      published: meta(html, "article:published_time", "datePublished", "date", "citation_publication_date"),
    };
  } catch {
    return null;
  }
}
