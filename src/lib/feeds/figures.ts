import { clip, htmlToText } from "@/lib/feeds/text";
import { paperFullTextUrl } from "@/lib/papers";

// Figures a carousel can show: a paper's charts, a lab's benchmark charts, the
// diagrams in an engineering post or a model card. arXiv's HTML edition keeps
// each figure in a <figure class="ltx_figure"> with its caption; other pages
// are read for images in the article body, described by their caption, alt
// text, file name and the heading above them so the writer can pick.

export interface SourceFigure {
  /** Absolute image URL on the source's own site or CDN. */
  src: string;
  /** What the figure shows, for the writer to choose by. */
  caption: string;
  /** The credit printed under it, e.g. "Figure 3 from the paper". */
  credit: string;
}

const MAX_FIGURES = 8;
// Author logos, icons and avatars are images too; real figures are wider.
const MIN_WIDTH = 150;
const UA = { "User-Agent": "Mozilla/5.0 (compatible; SignalDesk/1.0; personal news reader)" };

// News publishers' images are licensed photos and stock art, not the source's
// own figures, so their stories get no figures. Labs, companies, engineering
// blogs and model cards publish charts of their own work, credited by host.
const NO_FIGURE_HOSTS =
  /(^|\.)(techcrunch\.com|theverge\.com|technologyreview\.com|the-decoder\.com|arstechnica\.com|techmeme\.com|venturebeat\.com|wired\.com|reuters\.com|bloomberg\.com|nytimes\.com|cnbc\.com|theinformation\.com|businessinsider\.com|engadget\.com|zdnet\.com|404media\.co|platformer\.news|niemanlab\.org|axios\.com|ft\.com|wsj\.com|reddit\.com|news\.ycombinator\.com|x\.com|twitter\.com|youtube\.com|linkedin\.com)$/i;
const JUNK = /logo|icon|avatar|sprite|badge|placeholder|emoji|favicon|banner-ad|tracking|pixel|\.svg(\?|$)|\.gif(\?|$)/i;

/** Figures for a discovery's URL, or [] when it has none worth showing. */
export async function sourceFigures(url: string): Promise<SourceFigure[]> {
  if (paperFullTextUrl(url)) return paperFigures(url);
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return [];
  }
  if (NO_FIGURE_HOSTS.test(host)) return [];
  const model = /^https:\/\/huggingface\.co\/([\w.-]+\/[\w.-]+)\/?$/.exec(url);
  return model ? modelCardFigures(model[1]) : articleFigures(url, host);
}

/** The figures of an arXiv paper, in order, or [] when it has no HTML edition. */
export async function paperFigures(url: string): Promise<SourceFigure[]> {
  const page = paperFullTextUrl(url);
  if (!page) return [];
  const fetched = await fetchText(page);
  // Image paths are relative to the page's final URL, which carries the version.
  return fetched ? parsePaperFigures(fetched.text, fetched.url) : [];
}

export function parsePaperFigures(html: string, pageUrl: string): SourceFigure[] {
  const figures: SourceFigure[] = [];
  for (const match of html.matchAll(/<figure[^>]*class="ltx_figure[^"]*"[^>]*>([\s\S]*?)<\/figure>/g)) {
    const body = match[1];
    const img = [...body.matchAll(/<img[^>]*>/g)]
      .map((m) => m[0])
      .find((tag) => Number(attr(tag, "width") ?? MIN_WIDTH) >= MIN_WIDTH);
    const src = img && attr(img, "src");
    if (!src) continue;

    const absolute = new URL(src, pageUrl).toString();
    if (!absolute.startsWith("https://arxiv.org/")) continue;
    const caption = clip(textOf(/<figcaption[\s\S]*?<\/figcaption>/.exec(body)?.[0] ?? ""), 300);
    const n = /^(?:Figure|Fig\.?)\s*(\d+)/i.exec(caption)?.[1];
    figures.push({ src: absolute, caption, credit: n ? `Figure ${n} from the paper` : "Figure from the paper" });
    if (figures.length === MAX_FIGURES) break;
  }
  return figures;
}

/** Images in an article's body, described well enough for the writer to choose. */
async function articleFigures(url: string, host: string): Promise<SourceFigure[]> {
  const fetched = await fetchText(url);
  return fetched ? parseArticleFigures(fetched.text, fetched.url, host) : [];
}

export function parseArticleFigures(html: string, pageUrl: string, host: string): SourceFigure[] {
  const body = mainContent(html);
  const credit = `From ${host.replace(/^www\./, "")}`;
  const figures: SourceFigure[] = [];
  const seen = new Set<string>();

  for (const match of body.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const src = imageUrl(attr(tag, "src") ?? attr(tag, "data-src"), pageUrl);
    if (!src || seen.has(src) || JUNK.test(src)) continue;
    const width = Number(attr(tag, "width") ?? 0);
    if (width && width < 400) continue;
    const alt = decode(attr(tag, "alt") ?? "");
    if (/avatar|logo|headshot|portrait|profile/i.test(alt)) continue;

    const before = body.slice(Math.max(0, (match.index ?? 0) - 3000), match.index);
    // An image inside a link is a card pointing at another post, unless the
    // link just opens the image full size.
    const open = before.lastIndexOf("<a ");
    if (open > before.lastIndexOf("</a>")) {
      const href = attr(before.slice(open, before.indexOf(">", open) + 1), "href") ?? "";
      if (!/\.(png|jpe?g|webp|avif)(\?|$)/i.test(href)) continue;
    }
    // A thumbnail the site resized for a sidebar or a card.
    const resized = Number(/[?&](?:resize|w|width)=(\d+)/.exec(src)?.[1] ?? 0);
    if (resized && resized < 500) continue;

    // Most sites leave alt text empty, so the figure's caption, the heading and
    // paragraph above it and its file name are what say what a chart shows.
    const heading = [...before.matchAll(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi)].at(-1)?.[1];
    const paragraph = [...before.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].at(-1)?.[1];
    const after = body.slice(match.index, (match.index ?? 0) + 1500);
    const figcaption = /<figcaption[\s\S]*?<\/figcaption>/i.exec(after)?.[0];
    const caption = [
      figcaption && textOf(figcaption),
      alt !== "image" && alt,
      heading && `under the heading "${textOf(heading)}"`,
      paragraph && `after the text "${clip(textOf(paragraph), 160)}"`,
      fileWords(src) && `file: ${fileWords(src)}`,
    ]
      .filter(Boolean)
      .join("; ");
    // The writer picks figures by what they show; one it can't read is a guess.
    if (!caption) continue;

    seen.add(src);
    figures.push({ src, caption: clip(caption, 300), credit });
    if (figures.length === MAX_FIGURES) break;
  }
  return figures;
}

/** Images in a Hugging Face model card, usually its benchmark charts. */
async function modelCardFigures(id: string): Promise<SourceFigure[]> {
  const fetched = await fetchText(`https://huggingface.co/${id}/raw/main/README.md`);
  if (!fetched) return [];
  const base = `https://huggingface.co/${id}/resolve/main/`;
  const figures: SourceFigure[] = [];
  const seen = new Set<string>();
  const found = [
    ...[...fetched.text.matchAll(/!\[([^\]]*)\]\(([^)\s]+)/g)].map((m) => ({ alt: m[1], src: m[2], index: m.index ?? 0 })),
    ...[...fetched.text.matchAll(/<img\b[^>]*>/gi)].map((m) => ({
      alt: attr(m[0], "alt") ?? "",
      src: attr(m[0], "src") ?? "",
      index: m.index ?? 0,
    })),
  ].sort((a, b) => a.index - b.index);

  for (const { alt, src: raw, index } of found) {
    const src = imageUrl(raw, base);
    if (!src || seen.has(src) || JUNK.test(src) || /logo|avatar/i.test(alt)) continue;
    const heading = [...fetched.text.slice(0, index).matchAll(/^#{1,4}\s+(.+)$/gm)].at(-1)?.[1];
    const caption = [alt, heading && `under the heading "${heading.trim()}"`, `file: ${fileWords(src)}`]
      .filter(Boolean)
      .join("; ");
    seen.add(src);
    figures.push({ src, caption: clip(caption, 300), credit: `From the ${id} model card` });
    if (figures.length === MAX_FIGURES) break;
  }
  return figures;
}

async function fetchText(url: string): Promise<{ text: string; url: string } | null> {
  try {
    const response = await fetch(url, { headers: UA, signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return null;
    return { text: await response.text(), url: response.url || url };
  } catch {
    return null;
  }
}

/**
 * The page body minus its chrome. Picking the largest <article> breaks on
 * pages that nest them (Hugging Face's blog), so the whole body is read and
 * link cards are skipped image by image instead.
 */
function mainContent(html: string): string {
  const body = /<body[\s\S]*<\/body>/i.exec(html)?.[0] ?? html;
  return body.replace(/<(nav|header|footer|aside|form)\b[\s\S]*?<\/\1>/gi, "");
}

/** Absolute https URL for an image, unwrapping Next.js's /_next/image proxy. */
function imageUrl(raw: string | null | undefined, base: string): string | null {
  if (!raw || raw.startsWith("data:")) return null;
  try {
    const url = new URL(decode(raw), base);
    const wrapped = url.pathname.endsWith("/_next/image") ? url.searchParams.get("url") : null;
    const real = wrapped ? new URL(wrapped, url) : url;
    return real.protocol === "https:" ? real.toString() : null;
  } catch {
    return null;
  }
}

function attr(tag: string, name: string): string | null {
  return new RegExp(`\\s${name}="([^"]*)"`, "i").exec(tag)?.[1] ?? null;
}

function decode(text: string): string {
  return text.replace(/&amp;/g, "&").replace(/&#0?38;/g, "&").replace(/&quot;/g, '"');
}

function textOf(html: string): string {
  return htmlToText(html).replace(/\s+/g, " ").trim();
}

/** "code-benchmarks---terminal-bench-4%201-v3_Z2iGo8O.webp" → "code benchmarks terminal bench 4 v3". */
function fileWords(src: string): string {
  const name = decodeURIComponent(new URL(src).pathname.split("/").pop() ?? "");
  return name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/_[A-Za-z0-9]{5,}$/, "")
    .split(/[-_%.\s]+/)
    // Content hashes and pixel sizes say nothing about what a figure shows.
    .filter((w) => w && !/^[0-9a-f]{12,}$/i.test(w) && !/^\d+x\d+$/.test(w) && !/^[A-Za-z0-9]{16,}$/.test(w))
    .join(" ");
}
