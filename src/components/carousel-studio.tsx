"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { LayoutGrid, Download, RotateCcw, Trash2, Check, Pencil } from "lucide-react";

import { unwrap } from "@/lib/action-result";
import { generateCarouselAction, saveCarouselForPost } from "@/lib/carousel/actions";
import { SlideCard, downloadDeck } from "@/components/slide-card";
import type { Slide } from "@/lib/llm/prompts";

/**
 * Build, regenerate, edit and download a post's carousel. `inline` is the
 * compact form used on post cards: slide editors stay folded until asked for.
 */
export function CarouselStudio({
  postBody,
  postId,
  discoveryId = null,
  initialSlides = [],
  inline = false,
}: {
  postBody: string;
  postId?: string | null;
  /** The news item the post came from; null for posts written from scratch. */
  discoveryId?: string | null;
  initialSlides?: Slide[];
  inline?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [slides, setSlides] = useState<Slide[]>(initialSlides);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(initialSlides.length > 0);
  const [editing, setEditing] = useState(!inline);
  const lastSavedRef = useRef<string>(JSON.stringify(initialSlides));

  // Persist the deck to its post so it travels with the post everywhere.
  useEffect(() => {
    if (!postId) return;
    const serialized = JSON.stringify(slides);
    if (serialized === lastSavedRef.current) return;
    // Flagged when the save starts, not per keystroke (see writer.tsx).
    const timer = setTimeout(async () => {
      setSaved(false);
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
        setSlides(unwrap(await generateCarouselAction({ discoveryId, postBody: postBody || undefined })));
      } catch (err) {
        setError((err as Error).message);
      }
    });

  const edit = (i: number, patch: Partial<Slide>) =>
    setSlides((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const remove = (i: number) => setSlides((prev) => prev.filter((_, idx) => idx !== i));

  const buildLabel = pending ? "Designing slides…" : slides.length ? "Regenerate" : "Build carousel";
  const errorNote = error && <p className="notice" style={{ borderColor: "var(--danger)" }}>{error}</p>;

  if (inline && slides.length === 0) {
    return (
      <div style={{ display: "grid", gap: 8, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
        <div>
          <button className="btn btn-ghost" onClick={build} disabled={pending}>
            <LayoutGrid /> {buildLabel}
          </button>
        </div>
        {errorNote}
      </div>
    );
  }

  const actions = (
    <>
      <button className={inline ? "btn btn-ghost" : "btn btn-primary"} onClick={() => downloadDeck(slides)}>
        <Download /> Download PDF
      </button>
      <button className="btn btn-ghost" onClick={build} disabled={pending}>
        <RotateCcw /> {buildLabel}
      </button>
      {inline && (
        <button className="btn btn-ghost" onClick={() => setEditing(!editing)}>
          {editing ? <Check /> : <Pencil />} {editing ? "Done editing" : "Edit slides"}
        </button>
      )}
      {postId && saved && (
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--accent)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Check style={{ width: 13, height: 13 }} /> Saved to post
        </span>
      )}
    </>
  );

  return (
    <div
      className={inline ? undefined : "panel"}
      style={{ display: "grid", gap: 16, ...(inline ? { borderTop: "1px solid var(--line)", paddingTop: 14 } : {}) }}
    >
      {inline ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="chip">
            <LayoutGrid style={{ width: 13, height: 13 }} /> Carousel · {slides.length} slides
          </span>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h3 style={{ fontSize: 18 }}>Carousel</h3>
          <span style={{ color: "var(--ink-faint)", fontSize: 13 }}>
            A swipeable PDF deck to attach to the post — carousels earn the most reach.
          </span>
          {slides.length === 0 && (
            <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={build} disabled={pending}>
              <LayoutGrid /> {buildLabel}
            </button>
          )}
        </div>
      )}

      {errorNote}

      {slides.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, opacity: pending ? 0.5 : 1 }}>
            {slides.map((s, i) => (
              <SlideCard key={i} slide={s} index={i} total={slides.length} width={inline ? 180 : 220} />
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>{actions}</div>

          {editing && (
            <div style={{ display: "grid", gap: 12 }}>
              <p style={{ color: "var(--ink-faint)", fontSize: 13 }}>
                Wrap the end of a heading in [square brackets] to set it in grey.
              </p>
              {slides.map((s, i) => (
                <div key={i} style={{ display: "grid", gap: 6, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="chip">{i === 0 ? "Cover" : i === slides.length - 1 ? "CTA" : `Slide ${i + 1}`}</span>
                    <button
                      className="btn btn-ghost"
                      style={{ marginLeft: "auto" }}
                      onClick={() => remove(i)}
                      aria-label="Remove slide"
                    >
                      <Trash2 />
                    </button>
                  </div>
                  <input className="field" value={s.heading} onChange={(e) => edit(i, { heading: e.target.value })} />
                  <textarea className="field" rows={2} value={s.body} onChange={(e) => edit(i, { body: e.target.value })} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
