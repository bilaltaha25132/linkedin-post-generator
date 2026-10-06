"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { LayoutGrid, Download, RotateCcw, Trash2, Check, Copy, Pencil, TriangleAlert, Image as ImageIcon } from "lucide-react";

import { unwrap } from "@/lib/action-result";
import { generateCarouselAction, saveCarouselForPost } from "@/lib/carousel/actions";
import { figureLabel } from "@/lib/carousel/design";
import { LINKEDIN_TITLE_MAX, titleFromCover } from "@/lib/carousel/title";
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
  initialTitle = "",
  inline = false,
}: {
  postBody: string;
  postId?: string | null;
  /** The news item the post came from; null for posts written from scratch. */
  discoveryId?: string | null;
  initialSlides?: Slide[];
  initialTitle?: string;
  inline?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [slides, setSlides] = useState<Slide[]>(initialSlides);
  // Decks made before titles existed get theirs from their own cover.
  const startTitle = initialTitle || titleFromCover(initialSlides);
  const [title, setTitle] = useState(startTitle);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(initialSlides.length > 0);
  const [editing, setEditing] = useState(!inline);
  const [titleCopied, setTitleCopied] = useState(false);
  const titleId = useId();
  const lastSavedRef = useRef<string>(JSON.stringify({ slides: initialSlides, title: startTitle }));

  // Persist the deck to its post so it travels with the post everywhere.
  useEffect(() => {
    if (!postId) return;
    const serialized = JSON.stringify({ slides, title });
    if (serialized === lastSavedRef.current) return;
    // Flagged when the save starts, not per keystroke (see writer.tsx).
    const timer = setTimeout(async () => {
      setSaved(false);
      try {
        await saveCarouselForPost(postId, slides, title);
        lastSavedRef.current = serialized;
        setSaved(true);
      } catch {
        /* left unsaved; a later edit or rebuild retries */
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [slides, title, postId]);

  const build = () =>
    startTransition(async () => {
      setError(null);
      try {
        const next = unwrap(await generateCarouselAction({ discoveryId, postBody: postBody || undefined }));
        setSlides(next);
        // A fresh deck restates its claim on the cover, so it renames itself.
        setTitle(titleFromCover(next));
      } catch (err) {
        setError((err as Error).message);
      }
    });

  const copyTitle = async () => {
    await navigator.clipboard.writeText(title);
    setTitleCopied(true);
    setTimeout(() => setTitleCopied(false), 1500);
  };

  const edit = (i: number, patch: Partial<Slide>) =>
    setSlides((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const remove = (i: number) => setSlides((prev) => prev.filter((_, idx) => idx !== i));

  const buildLabel = pending ? "Designing slides…" : slides.length ? "Regenerate" : "Build carousel";
  const errorNote = error && (
    <p className="notice notice-danger" role="alert">
      <TriangleAlert aria-hidden />
      {error}
    </p>
  );

  if (inline && slides.length === 0) {
    return (
      <div className="stack-sm" style={{ paddingTop: 12, borderTop: "1px solid var(--border-soft)" }}>
        <div>
          <button className="btn btn-ghost" onClick={build} disabled={pending} style={{ marginLeft: -10 }}>
            <LayoutGrid aria-hidden className={pending ? "spin" : undefined} /> {buildLabel}
          </button>
        </div>
        {errorNote}
      </div>
    );
  }

  const actions = (
    <>
      <button className={inline ? "btn" : "btn btn-primary"} onClick={() => downloadDeck(slides, title)}>
        <Download aria-hidden /> Download PDF
      </button>
      <button className="btn btn-ghost" onClick={build} disabled={pending}>
        <RotateCcw aria-hidden className={pending ? "spin" : undefined} /> {buildLabel}
      </button>
      {inline && (
        <button className="btn btn-ghost" onClick={() => setEditing(!editing)} aria-expanded={editing}>
          {editing ? <Check aria-hidden /> : <Pencil aria-hidden />} {editing ? "Done editing" : "Edit slides"}
        </button>
      )}
      {postId && saved && (
        <span className="status-text status-ok push" role="status">
          <Check aria-hidden /> Saved to post
        </span>
      )}
    </>
  );

  return (
    <section
      className={inline ? "stack" : "panel stack"}
      style={inline ? { paddingTop: 14, borderTop: "1px solid var(--border-soft)" } : undefined}
      aria-label="Carousel"
    >
      {inline ? (
        <div className="row">
          <span className="chip chip-lavender">
            <LayoutGrid aria-hidden /> Carousel, {slides.length} slides
          </span>
        </div>
      ) : (
        <div className="panel-head" style={{ marginBottom: 0 }}>
          <span className="panel-icon">
            <LayoutGrid aria-hidden />
          </span>
          <h2>Carousel</h2>
          <p>A swipeable PDF deck to attach to the post. Carousels earn the most reach.</p>
          {slides.length === 0 && (
            <button className="btn btn-primary push" onClick={build} disabled={pending}>
              <LayoutGrid aria-hidden className={pending ? "spin" : undefined} /> {buildLabel}
            </button>
          )}
        </div>
      )}

      {errorNote}

      {slides.length > 0 && (
        <>
          <div className="stack-sm" style={{ gap: 6 }}>
            <div className="row" style={{ alignItems: "baseline", flexWrap: "nowrap" }}>
              <label className="lbl" htmlFor={titleId} style={{ marginBottom: 0 }}>
                Document title
              </label>
              <span className="meta-mono push">
                {title.length}/{LINKEDIN_TITLE_MAX}
              </span>
            </div>
            <div className="row" style={{ flexWrap: "nowrap" }}>
              <input
                id={titleId}
                className="field"
                value={title}
                maxLength={LINKEDIN_TITLE_MAX}
                placeholder="Name this deck for LinkedIn"
                onChange={(e) => setTitle(e.target.value)}
              />
              <button className="btn" onClick={copyTitle}>
                {titleCopied ? <Check aria-hidden /> : <Copy aria-hidden />} {titleCopied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="field-hint">LinkedIn asks for this when you upload the deck as a document.</p>
          </div>

          <div className="slides scroll-slim" data-pending={pending}>
            {slides.map((s, i) => (
              <SlideCard key={i} slide={s} index={i} total={slides.length} width={inline ? 180 : 220} />
            ))}
          </div>

          <div className="action-bar">{actions}</div>

          {editing && (
            <div className="stack-sm">
              <p className="field-hint">Wrap the end of a heading in [square brackets] to set it in grey.</p>
              {slides.map((s, i) => {
                const name = i === 0 ? "Cover" : i === slides.length - 1 ? "CTA" : `Slide ${i + 1}`;
                return (
                  <div key={i} className="slide-editor">
                    <div className="row" style={{ flexWrap: "nowrap" }}>
                      <span className="chip">{name}</span>
                      <button
                        className="btn btn-ghost btn-icon btn-danger push"
                        onClick={() => remove(i)}
                        aria-label={`Remove ${name.toLowerCase()}`}
                        title="Remove slide"
                      >
                        <Trash2 aria-hidden />
                      </button>
                    </div>
                    <input
                      className="field"
                      aria-label={`${name} heading`}
                      value={s.heading}
                      onChange={(e) => edit(i, { heading: e.target.value })}
                    />
                    <textarea
                      className="field"
                      rows={2}
                      aria-label={`${name} body`}
                      value={s.body}
                      onChange={(e) => edit(i, { body: e.target.value })}
                    />
                    {s.figure && (
                      <div className="row" style={{ flexWrap: "nowrap" }}>
                        <span className="field-hint" style={{ margin: 0 }}>
                          <ImageIcon aria-hidden style={{ width: 14, height: 14, verticalAlign: -2 }} />{" "}
                          {figureLabel(s.figure)}
                        </span>
                        <button className="btn btn-ghost btn-sm push" onClick={() => edit(i, { figure: undefined })}>
                          Remove figure
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}
