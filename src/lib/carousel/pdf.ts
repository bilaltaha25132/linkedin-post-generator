import { jsPDF } from "jspdf";

import type { Slide } from "@/lib/llm/prompts";
import { CAROUSEL_HANDLE, headingRuns, type HeadingRun } from "@/lib/carousel/heading";
import {
  FIGURE,
  GAP,
  MARGIN as M,
  SLIDE_H as H,
  SLIDE_W as W,
  TYPE,
  figureLabel,
  figureSrc,
  slideKind,
  themeFor,
  type SlideKind,
  type SlideTheme,
  type TextStyle,
} from "@/lib/carousel/design";

// Slides are drawn to a canvas with the browser's own copy of the font and
// placed in the PDF as images. Embedding Season Sans as text would mean
// converting it to TrueType, and its licence forbids modifying the file.
// 2× keeps text crisp when LinkedIn scales the page up.
const SCALE = 2;

export async function buildCarouselPdf(
  slides: Slide[],
  title: string,
  handle = CAROUSEL_HANDLE,
): Promise<jsPDF> {
  const [family, figures] = await Promise.all([
    loadSlideFonts(),
    Promise.all(slides.map((s) => (s.figure ? loadImage(figureSrc(s.figure.src)) : null))),
  ]);
  const doc = new jsPDF({ unit: "px", format: [W, H], orientation: "portrait" });
  // Carries the document title LinkedIn asks for, so the file describes itself
  // wherever it lands — including the PDF a reader can download.
  doc.setProperties({ title, author: handle });

  slides.forEach((slide, i) => {
    if (i > 0) doc.addPage([W, H], "portrait");
    const kind = slideKind(i, slides.length);
    const canvas = document.createElement("canvas");
    canvas.width = W * SCALE;
    canvas.height = H * SCALE;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(SCALE, SCALE);
    const figure = figures[i];
    if (figure && slide.figure && kind === "body") {
      drawFigureSlide(ctx, family, slide, figure, figureLabel(slide.figure), handle, i + 1, slides.length);
    } else {
      drawSlide(ctx, family, slide, kind, handle, i + 1, slides.length);
    }
    doc.addImage(canvas, "PNG", 0, 0, W, H, undefined, "FAST");
  });

  return doc;
}

export async function downloadCarouselPdf(slides: Slide[], title: string): Promise<void> {
  (await buildCarouselPdf(slides, title)).save("carousel.pdf");
}

/**
 * Canvas draws with whatever fonts are already loaded, so load both weights up
 * front. Returns the family stack: Season Sans when the private font is
 * uploaded, otherwise the Inter Tight webfont.
 */
async function loadSlideFonts(): Promise<string> {
  const interTight = getComputedStyle(document.documentElement).getPropertyValue("--font-slide").trim();
  const families = ['"Season Sans"', interTight].filter(Boolean);
  await Promise.all(
    families.flatMap((family) =>
      [400, 500].map((weight) => document.fonts.load(`${weight} 40px ${family}`).catch(() => [])),
    ),
  );
  return [...families, "system-ui", "sans-serif"].join(", ");
}

function drawSlide(
  ctx: CanvasRenderingContext2D,
  family: string,
  slide: Slide,
  kind: SlideKind,
  handle: string,
  n: number,
  total: number,
) {
  const theme = themeFor(kind);
  drawFrame(ctx, family, theme, kind, handle, n, total);

  const headingStyle = kind === "cover" ? TYPE.coverHeading : TYPE.heading;
  const maxW = W - 2 * M;
  const headingLines = wrap(ctx, family, headingRuns(slide.heading), maxW, headingStyle);
  const bodyLines = slide.body ? wrap(ctx, family, [{ text: slide.body, muted: false }], maxW, TYPE.body) : [];

  const headingH = headingLines.length * headingStyle.size * headingStyle.lineHeight;
  const gap = bodyLines.length ? GAP.body : 0;
  const bodyH = bodyLines.length * TYPE.body.size * TYPE.body.lineHeight;
  const buttonH = kind === "cta" ? GAP.button + 72 : 0;

  // Centre the block between eyebrow and footer, nudged up to the optical centre.
  const top = M + 80;
  const bottom = kind === "cover" ? H - M - 96 : H - M;
  let y = top + (bottom - top - (headingH + gap + bodyH + buttonH)) / 2 - 24;

  for (const line of headingLines) {
    drawLine(ctx, family, line, M, y, headingStyle, theme.ink, theme.tail);
    y += headingStyle.size * headingStyle.lineHeight;
  }
  y += gap;
  for (const line of bodyLines) {
    drawLine(ctx, family, line, M, y, TYPE.body, theme.body, theme.body);
    y += TYPE.body.size * TYPE.body.lineHeight;
  }

  if (kind === "cover") drawSwipe(ctx, family, theme);
  if (kind === "cta") drawFollowButton(ctx, family, theme, handle, y + GAP.button);
}

/** Background, the author's name, and the page counter on all but the cover. */
function drawFrame(
  ctx: CanvasRenderingContext2D,
  family: string,
  theme: SlideTheme,
  kind: SlideKind,
  handle: string,
  n: number,
  total: number,
) {
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "top";
  setFont(ctx, family, TYPE.label);
  ctx.fillStyle = theme.label;
  ctx.fillText(handle, M, M);
  if (kind !== "cover") {
    ctx.fillStyle = theme.counter;
    ctx.textAlign = "right";
    ctx.fillText(`${n} / ${total}`, W - M, M);
    ctx.textAlign = "left";
  }
}

/**
 * A body slide carrying one of the source's figures: the heading on top, the
 * figure on a white panel in the middle, then its credit ("Figure 3 from the
 * paper", "From mistral.ai") and the body line.
 */
function drawFigureSlide(
  ctx: CanvasRenderingContext2D,
  family: string,
  slide: Slide,
  image: HTMLImageElement,
  credit: string,
  handle: string,
  n: number,
  total: number,
) {
  const theme = themeFor("body");
  drawFrame(ctx, family, theme, "body", handle, n, total);

  const maxW = W - 2 * M;
  const headingLines = wrap(ctx, family, headingRuns(slide.heading), maxW, FIGURE.heading);
  const bodyLines = slide.body ? wrap(ctx, family, [{ text: slide.body, muted: false }], maxW, FIGURE.body) : [];

  const top = M + 96;
  const headingH = headingLines.length * FIGURE.heading.size * FIGURE.heading.lineHeight;
  const creditH = TYPE.caption.size * TYPE.caption.lineHeight;
  const bodyH = bodyLines.length * FIGURE.body.size * FIGURE.body.lineHeight;
  const below = (bodyLines.length ? FIGURE.gap + bodyH : 0) + 24 + creditH;
  const room = Math.max(240, H - M - below - top - headingH - FIGURE.gap);

  // Contain the figure, never upscaled past 2x; the panel hugs a wide figure
  // instead of leaving a white band above and below it.
  const boxW = maxW - 2 * FIGURE.pad;
  const scale = Math.min(boxW / image.naturalWidth, (room - 2 * FIGURE.pad) / image.naturalHeight, 2);
  const panelH = image.naturalHeight * scale + 2 * FIGURE.pad;

  // Centre the whole block between the eyebrow and the foot, like text slides.
  let y = top + (H - M - top - (headingH + FIGURE.gap + panelH + below)) / 2;
  for (const line of headingLines) {
    drawLine(ctx, family, line, M, y, FIGURE.heading, theme.ink, theme.tail);
    y += FIGURE.heading.size * FIGURE.heading.lineHeight;
  }
  y += FIGURE.gap;

  ctx.fillStyle = FIGURE.panel;
  ctx.fillRect(M, y, maxW, panelH);
  const w = image.naturalWidth * scale;
  const h = image.naturalHeight * scale;
  ctx.drawImage(image, M + (maxW - w) / 2, y + (panelH - h) / 2, w, h);
  y += panelH;

  setFont(ctx, family, TYPE.caption);
  ctx.fillStyle = theme.label;
  ctx.fillText(credit, M, y + 16);
  y += 24 + creditH;

  if (bodyLines.length) {
    y += FIGURE.gap - 24;
    for (const line of bodyLines) {
      drawLine(ctx, family, line, M, y, FIGURE.body, theme.body, theme.body);
      y += FIGURE.body.size * FIGURE.body.lineHeight;
    }
  }
}

/** A figure image ready to draw, or null when it can't be loaded. */
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    // arXiv sends an open CORS header; without this the canvas is tainted and
    // the PDF can't read it back.
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Bottom rule with a right-aligned "Swipe" and a drawn arrow. */
function drawSwipe(ctx: CanvasRenderingContext2D, family: string, theme: SlideTheme) {
  ctx.fillStyle = theme.hairline;
  ctx.fillRect(M, H - M - 56, W - 2 * M, 2);

  const arrowW = 34;
  setFont(ctx, family, TYPE.label);
  ctx.fillStyle = theme.ink;
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("Swipe", W - M - arrowW - 16, H - M);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  const ay = H - M - TYPE.label.size * 0.34;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(W - M - arrowW, ay);
  ctx.lineTo(W - M, ay);
  ctx.moveTo(W - M - 10, ay - 10);
  ctx.lineTo(W - M, ay);
  ctx.lineTo(W - M - 10, ay + 10);
  ctx.stroke();
}

/** The site's square CTA button, inverted against the slide. */
function drawFollowButton(
  ctx: CanvasRenderingContext2D,
  family: string,
  theme: SlideTheme,
  handle: string,
  y: number,
) {
  const label = `Follow ${handle} for more`;
  setFont(ctx, family, TYPE.button);
  const padX = 36;
  ctx.fillStyle = theme.buttonBg;
  ctx.fillRect(M, y, ctx.measureText(label).width + padX * 2, 72);
  ctx.fillStyle = theme.buttonText;
  ctx.textBaseline = "middle";
  ctx.fillText(label, M + padX, y + 37);
  ctx.textBaseline = "top";
}

/**
 * Greedy word wrap over ink and grey runs. A grey run starts its own line, as
 * the site sets it; explicit newlines are kept.
 */
function wrap(
  ctx: CanvasRenderingContext2D,
  family: string,
  runs: HeadingRun[],
  maxW: number,
  style: TextStyle,
): HeadingRun[][] {
  setFont(ctx, family, style);
  const space = ctx.measureText(" ").width;
  const lines: HeadingRun[][] = [[]];
  let lineW = 0;
  const current = () => lines[lines.length - 1];
  const breakLine = () => {
    if (current().length) lines.push([]);
    lineW = 0;
  };

  runs.forEach((run, i) => {
    if (run.muted && i > 0 && !runs[i - 1].muted) breakLine();
    run.text.split(/(\n)/).forEach((part) => {
      if (part === "\n") return breakLine();
      for (const word of part.split(/\s+/).filter(Boolean)) {
        const width = ctx.measureText(word).width;
        const next = current().length ? lineW + space + width : width;
        if (current().length && next > maxW) {
          lines.push([{ text: word, muted: run.muted }]);
          lineW = width;
        } else {
          current().push({ text: word, muted: run.muted });
          lineW = next;
        }
      }
    });
  });
  return lines.filter((line) => line.length);
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  family: string,
  words: HeadingRun[],
  x: number,
  y: number,
  style: TextStyle,
  color: string,
  mutedColor: string,
) {
  setFont(ctx, family, style);
  const space = ctx.measureText(" ").width;
  let cursor = x;
  let i = 0;
  while (i < words.length) {
    let j = i;
    while (j + 1 < words.length && words[j + 1].muted === words[i].muted) j += 1;
    const text = words
      .slice(i, j + 1)
      .map((w) => w.text)
      .join(" ");
    ctx.fillStyle = words[i].muted ? mutedColor : color;
    ctx.fillText(text, cursor, y);
    cursor += ctx.measureText(text).width + space;
    i = j + 1;
  }
}

function setFont(ctx: CanvasRenderingContext2D, family: string, style: TextStyle) {
  ctx.font = `${style.weight} ${style.size}px ${family}`;
  ctx.letterSpacing = `${style.track * style.size}px`;
}
