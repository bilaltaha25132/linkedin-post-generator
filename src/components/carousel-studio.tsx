"use client";

import { useState, useTransition } from "react";
import { LayoutGrid, Download, RotateCcw, Trash2 } from "lucide-react";

import { generateCarouselAction } from "@/lib/carousel/actions";
import type { Slide } from "@/lib/llm/prompts";

const HANDLE = "Bilal Taha";

export function CarouselStudio({ discoveryId, postBody }: { discoveryId: string; postBody: string }) {
  const [pending, startTransition] = useTransition();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [error, setError] = useState<string | null>(null);

  const build = () =>
    startTransition(async () => {
      setError(null);
      try {
        setSlides(await generateCarouselAction(discoveryId, postBody || undefined));
      } catch (err) {
        setError((err as Error).message);
      }
    });

  const edit = (i: number, patch: Partial<Slide>) =>
    setSlides((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const remove = (i: number) => setSlides((prev) => prev.filter((_, idx) => idx !== i));

  const download = async () => {
    const { downloadCarouselPdf } = await import("@/lib/carousel/pdf");
    downloadCarouselPdf(slides, { handle: HANDLE });
  };

  return (
    <div className="panel" style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h3 style={{ fontSize: 18 }}>Carousel</h3>
        <span style={{ color: "var(--ink-faint)", fontSize: 13 }}>
          A swipeable PDF deck to attach to the post — carousels earn the most reach.
        </span>
        <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={build} disabled={pending}>
          <LayoutGrid /> {pending ? "Designing slides…" : slides.length ? "Rebuild" : "Build carousel"}
        </button>
      </div>

      {error && <p className="notice" style={{ borderColor: "var(--danger)" }}>{error}</p>}

      {slides.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
            {slides.map((s, i) => (
              <SlideCard key={i} slide={s} index={i} total={slides.length} />
            ))}
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {slides.map((s, i) => (
              <div key={i} style={{ display: "grid", gap: 6, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="chip">{i === 0 ? "Cover" : i === slides.length - 1 ? "CTA" : `Slide ${i + 1}`}</span>
                  <button className="btn btn-ghost" style={{ marginLeft: "auto" }} onClick={() => remove(i)} aria-label="Remove slide">
                    <Trash2 />
                  </button>
                </div>
                <input className="field" value={s.heading} onChange={(e) => edit(i, { heading: e.target.value })} />
                <textarea className="field" rows={2} value={s.body} onChange={(e) => edit(i, { body: e.target.value })} />
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" onClick={download}>
              <Download /> Download PDF
            </button>
            <button className="btn btn-ghost" onClick={build} disabled={pending}>
              <RotateCcw /> New slides
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SlideCard({ slide, index, total }: { slide: Slide; index: number; total: number }) {
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
