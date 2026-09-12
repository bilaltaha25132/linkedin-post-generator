"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { LayoutGrid, Download, RotateCcw, Trash2, Check } from "lucide-react";

import { generateCarouselAction, saveCarouselForPost } from "@/lib/carousel/actions";
import { SlideCard } from "@/components/carousel-attachment";
import type { Slide } from "@/lib/llm/prompts";

const HANDLE = "Bilal Taha";

export function CarouselStudio({
  discoveryId,
  postBody,
  postId,
  initialSlides = [],
}: {
  discoveryId: string;
  postBody: string;
  postId?: string | null;
  initialSlides?: Slide[];
}) {
  const [pending, startTransition] = useTransition();
  const [slides, setSlides] = useState<Slide[]>(initialSlides);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(initialSlides.length > 0);
  const lastSavedRef = useRef<string>(JSON.stringify(initialSlides));

  // Persist the deck to its post so it travels with the post everywhere.
  useEffect(() => {
    if (!postId) return;
    const serialized = JSON.stringify(slides);
    if (serialized === lastSavedRef.current) return;
    setSaved(false);
    const timer = setTimeout(async () => {
      try {
        await saveCarouselForPost(postId, slides);
        lastSavedRef.current = serialized;
        setSaved(true);
      } catch {
        /* left unsaved; a later edit or rebuild retries */
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [slides, postId]);

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

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn btn-primary" onClick={download}>
              <Download /> Download PDF
            </button>
            <button className="btn btn-ghost" onClick={build} disabled={pending}>
              <RotateCcw /> New slides
            </button>
            {postId && saved && (
              <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Check style={{ width: 13, height: 13 }} /> Saved to post
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
