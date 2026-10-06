import { clip, htmlToText } from "@/lib/feeds/text";
import { paperFullTextUrl } from "@/lib/papers";

// arXiv's HTML edition of a paper keeps each figure as an <img> inside a
// <figure class="ltx_figure"> with its caption, and serves the images with an
// open CORS header, so slides can draw them straight onto a canvas.

export interface PaperFigure {
  /** Absolute image URL on arxiv.org. */
  src: string;
  /** "Figure 3: Overview of ...", clipped. */
  caption: string;
}

const MAX_FIGURES = 8;
// Author logos and inline icons are images too; real figures are wider.
const MIN_WIDTH = 150;

/** The figures of an arXiv paper, in order, or [] when it has no HTML edition. */
export async function paperFigures(url: string): Promise<PaperFigure[]> {
  const page = paperFullTextUrl(url);
  if (!page) return [];
  try {
    const response = await fetch(page, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SignalDesk/1.0; personal news reader)" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return [];
    // Image paths are relative to the page's final URL, which carries the version.
    return parseFigures(await response.text(), response.url || page);
  } catch {
    return [];
  }
}

export function parseFigures(html: string, pageUrl: string): PaperFigure[] {
  const figures: PaperFigure[] = [];
  for (const match of html.matchAll(/<figure[^>]*class="ltx_figure[^"]*"[^>]*>([\s\S]*?)<\/figure>/g)) {
    const body = match[1];
    const img = [...body.matchAll(/<img[^>]*>/g)]
      .map((m) => m[0])
      .find((tag) => Number(/width="(\d+)"/.exec(tag)?.[1] ?? MIN_WIDTH) >= MIN_WIDTH);
    const src = img && /src="([^"]+)"/.exec(img)?.[1];
    if (!src) continue;

    const absolute = new URL(src, pageUrl).toString();
    if (!absolute.startsWith("https://arxiv.org/")) continue;
    const caption = htmlToText(/<figcaption[\s\S]*?<\/figcaption>/.exec(body)?.[0] ?? "")
      .replace(/\s+/g, " ")
      .trim();
    figures.push({ src: absolute, caption: clip(caption, 300) });
    if (figures.length === MAX_FIGURES) break;
  }
  return figures;
}
