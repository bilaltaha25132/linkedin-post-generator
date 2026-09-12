import { jsPDF } from "jspdf";

import type { Slide } from "@/lib/llm/prompts";
import {
  FRAUNCES_SEMIBOLD_TTF,
  PLEX_SANS_REGULAR_TTF,
  PLEX_SANS_SEMIBOLD_TTF,
} from "@/lib/carousel/fonts";

// LinkedIn-recommended portrait carousel canvas.
const W = 1080;
const H = 1350;
const M = 96; // margin

// Real brand type embedded into the PDF so the deck doesn't ship in jsPDF's
// built-in Helvetica (the generic/AI-slide look). Fraunces = display serif for
// headings; IBM Plex Sans = body. Registered once per document.
const DISPLAY = "Fraunces";
const SANS = "PlexSans";

function registerFonts(doc: jsPDF) {
  doc.addFileToVFS("Fraunces-SemiBold.ttf", FRAUNCES_SEMIBOLD_TTF);
  doc.addFont("Fraunces-SemiBold.ttf", DISPLAY, "normal");
  doc.addFileToVFS("PlexSans-Regular.ttf", PLEX_SANS_REGULAR_TTF);
  doc.addFont("PlexSans-Regular.ttf", SANS, "normal");
  doc.addFileToVFS("PlexSans-SemiBold.ttf", PLEX_SANS_SEMIBOLD_TTF);
  doc.addFont("PlexSans-SemiBold.ttf", SANS, "bold");
}

type RGB = [number, number, number];
const COLOR: Record<string, RGB> = {
  paper: [241, 240, 234],
  ink: [26, 29, 34],
  cobalt: [44, 64, 189],
  white: [255, 255, 255],
  dark: [21, 23, 27],
  mutedDark: [196, 201, 212],
  mutedLight: [92, 98, 106],
};

// jsPDF font size is in points; the canvas is in px. 1pt ≈ 1.333px.
const PT_TO_PX = 96 / 72;

export interface CarouselOptions {
  handle?: string;
}

export function buildCarouselPdf(slides: Slide[], opts: CarouselOptions = {}): jsPDF {
  const handle = opts.handle ?? "Signal Desk";
  const doc = new jsPDF({ unit: "px", format: [W, H], orientation: "portrait" });
  registerFonts(doc);

  slides.forEach((slide, i) => {
    if (i > 0) doc.addPage([W, H], "portrait");
    const isCover = i === 0;
    const isCta = i === slides.length - 1 && slides.length > 1;
    if (isCover) renderCover(doc, slide, handle);
    else if (isCta) renderCta(doc, slide, handle, i + 1, slides.length);
    else renderBody(doc, slide, handle, i + 1, slides.length);
  });

  return doc;
}

export function downloadCarouselPdf(slides: Slide[], opts: CarouselOptions = {}): void {
  buildCarouselPdf(slides, opts).save("signal-desk-carousel.pdf");
}

function fill(doc: jsPDF, c: RGB) {
  doc.setFillColor(c[0], c[1], c[2]);
}
function ink(doc: jsPDF, c: RGB) {
  doc.setTextColor(c[0], c[1], c[2]);
}

/** Draw wrapped text in a chosen face; returns the y just below the block. */
function paragraph(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxW: number,
  pt: number,
  font: { family: string; style: "normal" | "bold" },
  lineFactor: number,
): number {
  doc.setFont(font.family, font.style);
  doc.setFontSize(pt);
  const lineH = pt * PT_TO_PX * lineFactor;
  const lines = doc.splitTextToSize(text, maxW) as string[];
  lines.forEach((line, i) => doc.text(line, x, y + i * lineH));
  return y + lines.length * lineH;
}

const HEADING = { family: DISPLAY, style: "normal" as const };
const BODY = { family: SANS, style: "normal" as const };

function renderCover(doc: jsPDF, slide: Slide, handle: string) {
  fill(doc, COLOR.cobalt);
  doc.rect(0, 0, W, H, "F");

  // accent tick
  fill(doc, COLOR.white);
  doc.rect(M, M, 54, 8, "F");

  ink(doc, COLOR.white);
  let y = 340;
  // Serif headings read tighter than Helvetica did; a hair more line height.
  y = paragraph(doc, slide.heading, M, y, W - 2 * M, 62, HEADING, 1.12);
  if (slide.body) {
    y += 30;
    ink(doc, [225, 228, 245]);
    paragraph(doc, slide.body, M, y, W - 2 * M, 26, BODY, 1.4);
  }

  ink(doc, [210, 215, 240]);
  doc.setFont(SANS, "normal");
  doc.setFontSize(19);
  doc.text(handle, M, H - M);
  // "swipe" + a drawn triangle: the → glyph isn't in the font's latin subset.
  doc.text("swipe", W - M - 26, H - M, { align: "right" });
  fill(doc, [210, 215, 240]);
  const ty = H - M - 8;
  doc.triangle(W - M - 16, ty - 7, W - M - 16, ty + 7, W - M, ty, "F");
}

function renderBody(doc: jsPDF, slide: Slide, handle: string, n: number, total: number) {
  fill(doc, COLOR.paper);
  doc.rect(0, 0, W, H, "F");

  // index
  ink(doc, COLOR.cobalt);
  doc.setFont(SANS, "bold");
  doc.setFontSize(28);
  doc.text(String(n - 1).padStart(2, "0"), M, M + 40);
  fill(doc, COLOR.cobalt);
  doc.rect(M, M + 60, 44, 6, "F");

  let y = 300;
  ink(doc, COLOR.ink);
  y = paragraph(doc, slide.heading, M, y, W - 2 * M, 46, HEADING, 1.16);
  if (slide.body) {
    y += 36;
    ink(doc, COLOR.mutedLight);
    paragraph(doc, slide.body, M, y, W - 2 * M, 27, BODY, 1.45);
  }

  // footer
  ink(doc, COLOR.mutedLight);
  doc.setFont(SANS, "normal");
  doc.setFontSize(17);
  doc.text(handle, M, H - M);
  doc.text(`${n} / ${total}`, W - M, H - M, { align: "right" });
}

function renderCta(doc: jsPDF, slide: Slide, handle: string, n: number, total: number) {
  fill(doc, COLOR.dark);
  doc.rect(0, 0, W, H, "F");

  fill(doc, COLOR.cobalt);
  doc.rect(M, M, 54, 8, "F");

  let y = 380;
  ink(doc, COLOR.white);
  y = paragraph(doc, slide.heading, M, y, W - 2 * M, 48, HEADING, 1.16);
  if (slide.body) {
    y += 30;
    ink(doc, COLOR.mutedDark);
    paragraph(doc, slide.body, M, y, W - 2 * M, 27, BODY, 1.45);
  }

  ink(doc, COLOR.mutedDark);
  doc.setFont(SANS, "normal");
  doc.setFontSize(17);
  doc.text(handle, M, H - M);
  doc.text(`${n} / ${total}`, W - M, H - M, { align: "right" });
}
