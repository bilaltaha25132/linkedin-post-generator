"use client";

import { useState, useTransition } from "react";
import { Copy, Check, Pencil, Trash2, Send, ExternalLink, Star, Share2, TriangleAlert } from "lucide-react";

import { unwrap } from "@/lib/action-result";
import { titleFromCover } from "@/lib/carousel/title";
import { deletePost, markPosted, setPostQueued, updatePostBody } from "@/lib/posts/actions";
import { publishToLinkedIn, stageCarousel } from "@/lib/publish/actions";
import { copyForLinkedIn } from "@/lib/linkedin";
import { CarouselStudio } from "@/components/carousel-studio";
import { BlogAttachment } from "@/components/blog-attachment";
import type { Post } from "@/lib/db/types";

export function PostCard({ post, index = 0 }: { post: Post; index?: number }) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.body);
  const [copied, setCopied] = useState(false);
  const [postingUrl, setPostingUrl] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [withCarousel, setWithCarousel] = useState(true);
  const [publishError, setPublishError] = useState<string | null>(null);
  const slides = post.carousel ?? [];
  const attachCarousel = withCarousel && slides.length > 0;

  const copy = async () => {
    await copyForLinkedIn(post.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const save = () =>
    startTransition(async () => {
      await updatePostBody(post.id, draft);
      setEditing(false);
    });

  const confirmPosted = () =>
    startTransition(async () => {
      await markPosted(post.id, postingUrl?.trim() || undefined);
      setPostingUrl(null);
    });

  // The carousel PDF is drawn in the browser (it needs the page's fonts), staged
  // in private storage, then handed to LinkedIn by the server.
  const publish = () =>
    startTransition(async () => {
      setPublishError(null);
      try {
        let carouselPath: string | undefined;
        if (attachCarousel) {
          const { path, uploadUrl } = unwrap(await stageCarousel(post.id));
          const { buildCarouselPdf } = await import("@/lib/carousel/pdf");
          const pdf = await buildCarouselPdf(slides, post.carousel_title?.trim() || titleFromCover(slides));
          const res = await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": "application/pdf" },
            body: pdf.output("blob"),
          });
          if (!res.ok) throw new Error(`Couldn't upload the carousel PDF (HTTP ${res.status}). Nothing was posted.`);
          carouselPath = path;
        }
        unwrap(await publishToLinkedIn(post.id, carouselPath));
        setPublishing(false);
      } catch (err) {
        setPublishError(err instanceof Error ? err.message : String(err));
      }
    });

  const statusChip =
    post.status === "posted" ? "chip chip-mint" : post.status === "queued" ? "chip chip-brand" : "chip";
  const statusLabel = post.status === "queued" ? "To post" : post.status === "posted" ? "Posted" : "Draft";

  return (
    <article
      className="panel post reveal"
      style={{ "--reveal-delay": `${Math.min(index, 6) * 50 + 60}ms` } as React.CSSProperties}
    >
      <header className="post-head">
        <span className={statusChip}>{statusLabel}</span>
        <span className="meta-mono">
          {post.posted_at ? "Posted " : ""}
          {new Date(post.posted_at ?? post.created_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
        <span className="meta-mono push">{countWords(post.body)} words</span>
      </header>

      {editing ? (
        <textarea
          className="field editor"
          rows={12}
          value={draft}
          aria-label="Post text"
          onChange={(e) => setDraft(e.target.value)}
        />
      ) : (
        <p className="post-body">{post.body}</p>
      )}

      {!editing && (
        <CarouselStudio
          inline
          postId={post.id}
          discoveryId={post.discovery_id}
          postBody={post.body}
          initialSlides={post.carousel ?? []}
          initialTitle={post.carousel_title ?? ""}
        />
      )}

      {!editing && post.blog && <BlogAttachment blog={post.blog} />}

      <footer className="post-foot">
        {editing ? (
          <>
            <button className="btn btn-primary" onClick={save} disabled={pending}>
              <Check aria-hidden /> Save changes
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setEditing(false);
                setDraft(post.body);
              }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button className="btn" onClick={copy} title="Copy with the line spacing LinkedIn keeps">
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? "Copied" : "Copy"}
            </button>
            <button className="btn btn-ghost" onClick={() => setEditing(true)}>
              <Pencil aria-hidden /> Edit
            </button>
            {post.status === "draft" && (
              <button
                className="btn btn-ghost"
                onClick={() =>
                  startTransition(async () => {
                    await setPostQueued(post.id, true);
                  })
                }
                disabled={pending}
              >
                <Star aria-hidden /> Queue
              </button>
            )}
            {post.status === "queued" && (
              <button
                className="btn btn-ghost"
                aria-pressed
                onClick={() =>
                  startTransition(async () => {
                    await setPostQueued(post.id, false);
                  })
                }
                disabled={pending}
              >
                <Star aria-hidden fill="currentColor" /> Queued
              </button>
            )}
            {post.status !== "posted" && (
              <button
                className="btn"
                aria-expanded={publishing}
                onClick={() => {
                  setPublishing(!publishing);
                  setPostingUrl(null);
                }}
              >
                <Share2 aria-hidden /> Publish
              </button>
            )}
            {post.status !== "posted" && (
              <button
                className="btn btn-ghost"
                aria-expanded={postingUrl !== null}
                onClick={() => {
                  setPostingUrl(postingUrl === null ? "" : null);
                  setPublishing(false);
                }}
              >
                <Send aria-hidden /> Mark posted
              </button>
            )}
            {post.external_url && (
              <a className="btn btn-ghost" href={post.external_url} target="_blank" rel="noreferrer">
                <ExternalLink aria-hidden /> View
              </a>
            )}
            <button
              className="btn btn-ghost btn-icon btn-danger push"
              onClick={() =>
                startTransition(async () => {
                  await deletePost(post.id);
                })
              }
              disabled={pending}
              aria-label="Delete post"
              title="Delete post"
            >
              <Trash2 aria-hidden />
            </button>
          </>
        )}
      </footer>

      {publishing && !editing && (
        <div className="stack-sm">
          <p className="small">
            Publish this post to your LinkedIn profile now
            {attachCarousel ? `, with its ${slides.length}-slide carousel as a PDF` : ""}? It goes out publicly, once.
          </p>
          {slides.length > 0 && (
            <label className="row small">
              <input type="checkbox" checked={withCarousel} onChange={(e) => setWithCarousel(e.target.checked)} />
              Attach the carousel
            </label>
          )}
          <div className="row">
            <button className="btn btn-primary" onClick={publish} disabled={pending}>
              <Share2 aria-hidden /> {pending ? "Publishing…" : "Publish to LinkedIn"}
            </button>
            <button className="btn btn-ghost" onClick={() => setPublishing(false)} disabled={pending}>
              Cancel
            </button>
          </div>
          {publishError && (
            <p className="notice notice-danger" role="alert">
              <TriangleAlert aria-hidden />
              <span>{publishError}</span>
            </p>
          )}
        </div>
      )}

      {postingUrl !== null && !editing && (
        <div className="row" style={{ flexWrap: "nowrap" }}>
          <input
            className="field"
            placeholder="LinkedIn post URL (optional)"
            aria-label="LinkedIn post URL (optional)"
            value={postingUrl}
            onChange={(e) => setPostingUrl(e.target.value)}
          />
          <button className="btn btn-primary" onClick={confirmPosted} disabled={pending}>
            Confirm
          </button>
        </div>
      )}
    </article>
  );
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
