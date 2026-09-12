"use client";

import { Download, LayoutGrid } from "lucide-react";

import type { Slide } from "@/lib/llm/prompts";

const HANDLE = "Bilal Taha";

/** A single slide thumbnail — the on-screen preview of one PDF page. */
export function SlideCard({ slide, index, total }: { slide: Slide; index: number; total: number }) {
  const isCover = index === 0;
  const isCta = index === total - 1 && total > 1;
  const bg = isCover ? "var(--accent)" : isCta ? "#15171b" : "#f1f0ea";
  const fg = isCover || isCta ? "#ffffff" : "#1a1d22";
  const muted = isCover || isCta ? "rgba(255,255,255,.72)" : "#5c6268";

  return (
    <div
      style={{
        flex: "0 0 auto",
        width: 168,
        aspectRatio: "1080 / 1350",
        background: bg,
        color: fg,
        borderRadius: 8,
        border: "1px solid var(--line)",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {!isCover && !isCta && (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>
          {String(index).padStart(2, "0")}
        </div>
      )}
      <div style={{ fontFamily: "var(--font-display)", fontSize: isCover ? 18 : 15, fontWeight: 600, lineHeight: 1.15, marginTop: isCover ? "auto" : 8 }}>
        {slide.heading}
      </div>
      {slide.body && (
        <div style={{ fontSize: 10.5, color: muted, marginTop: 8, lineHeight: 1.35 }}>{slide.body}</div>
      )}
      <div style={{ marginTop: "auto", fontSize: 9, color: muted }}>
        {isCover ? "swipe →" : `${index + 1} / ${total}`}
      </div>
    </div>
  );
}

/** Read-only deck attached to a saved post: thumbnails + a download button. */
export function CarouselAttachment({ slides }: { slides: Slide[] }) {
  if (!slides.length) return null;

  const download = async () => {
    const { downloadCarouselPdf } = await import("@/lib/carousel/pdf");
    downloadCarouselPdf(slides, { handle: HANDLE });
  };

  return (
    <div style={{ display: "grid", gap: 10, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="chip">
          <LayoutGrid style={{ width: 13, height: 13 }} /> Carousel · {slides.length} slides
        </span>
        <button className="btn btn-ghost" style={{ marginLeft: "auto" }} onClick={download}>
          <Download /> Download PDF
        </button>
      </div>
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
        {slides.map((s, i) => (
          <SlideCard key={i} slide={s} index={i} total={slides.length} />
        ))}
      </div>
    </div>
  );
}
