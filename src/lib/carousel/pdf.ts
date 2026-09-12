import { jsPDF } from "jspdf";

import type { Slide } from "@/lib/llm/prompts";

// LinkedIn-recommended portrait carousel canvas.
const W = 1080;
const H = 1350;
const M = 96; // margin

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

/** Draw wrapped text; returns the y just below the block. */
function paragraph(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxW: number,
  pt: number,
  weight: "normal" | "bold",
  lineFactor = 1.28,
): number {
  doc.setFont("helvetica", weight);
  doc.setFontSize(pt);
  const lineH = pt * PT_TO_PX * lineFactor;
  const lines = doc.splitTextToSize(text, maxW) as string[];
  lines.forEach((line, i) => doc.text(line, x, y + i * lineH));
  return y + lines.length * lineH;
}

function renderCover(doc: jsPDF, slide: Slide, handle: string) {
  fill(doc, COLOR.cobalt);
  doc.rect(0, 0, W, H, "F");

  // accent tick
  fill(doc, COLOR.white);
  doc.rect(M, M, 54, 8, "F");

  ink(doc, COLOR.white);
  let y = 360;
  y = paragraph(doc, slide.heading, M, y, W - 2 * M, 60, "bold", 1.15);
  if (slide.body) {
    y += 34;
    ink(doc, [225, 228, 245]);
    paragraph(doc, slide.body, M, y, W - 2 * M, 28, "normal");
  }

  ink(doc, [210, 215, 240]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(20);
  doc.text(handle, M, H - M);
  doc.text("swipe →", W - M, H - M, { align: "right" });
}

function renderBody(doc: jsPDF, slide: Slide, handle: string, n: number, total: number) {
  fill(doc, COLOR.paper);
  doc.rect(0, 0, W, H, "F");

  // index
  ink(doc, COLOR.cobalt);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.text(String(n - 1).padStart(2, "0"), M, M + 40);
  fill(doc, COLOR.cobalt);
  doc.rect(M, M + 60, 44, 6, "F");

  let y = 300;
  ink(doc, COLOR.ink);
  y = paragraph(doc, slide.heading, M, y, W - 2 * M, 44, "bold", 1.18);
  if (slide.body) {
    y += 40;
    ink(doc, COLOR.mutedLight);
    paragraph(doc, slide.body, M, y, W - 2 * M, 28, "normal", 1.35);
  }

  // footer
  ink(doc, COLOR.mutedLight);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(18);
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
  y = paragraph(doc, slide.heading, M, y, W - 2 * M, 46, "bold", 1.18);
  if (slide.body) {
    y += 34;
    ink(doc, COLOR.mutedDark);
    paragraph(doc, slide.body, M, y, W - 2 * M, 28, "normal", 1.35);
  }

  ink(doc, COLOR.mutedDark);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(18);
  doc.text(handle, M, H - M);
  doc.text(`${n} / ${total}`, W - M, H - M, { align: "right" });
}
