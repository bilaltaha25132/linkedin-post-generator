"use client";

import { useState, useTransition } from "react";
import { Copy, Check, Pencil, Trash2, Send, ExternalLink, Star } from "lucide-react";

import { deletePost, markPosted, setPostQueued, updatePostBody } from "@/lib/posts/actions";
import { copyForLinkedIn } from "@/lib/linkedin";
import { CarouselStudio } from "@/components/carousel-studio";
import { BlogAttachment } from "@/components/blog-attachment";
import type { Post } from "@/lib/db/types";

export function PostCard({ post }: { post: Post }) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.body);
  const [copied, setCopied] = useState(false);
  const [postingUrl, setPostingUrl] = useState<string | null>(null);

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

  return (
    <article className="panel" style={{ display: "grid", gap: 14 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="chip" style={post.status !== "draft" ? { borderColor: "var(--accent)", color: "var(--accent)" } : undefined}>
          {post.status === "queued" ? "to post" : post.status}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-faint)" }}>
          {post.posted_at ? "Posted " : ""}
          {new Date(post.posted_at ?? post.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-faint)", marginLeft: "auto" }}>
          {countWords(post.body)} words
        </span>
      </header>

      {editing ? (
        <textarea className="field" rows={12} value={draft} onChange={(e) => setDraft(e.target.value)} />
      ) : (
        <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{post.body}</p>
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

      <footer style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {editing ? (
          <>
            <button className="btn btn-primary" onClick={save} disabled={pending}>
              Save changes
            </button>
            <button className="btn btn-ghost" onClick={() => { setEditing(false); setDraft(post.body); }}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              className="btn"
              onClick={copy}
              title="Copy with the line spacing LinkedIn keeps"
            >
              {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
            </button>
            <button className="btn btn-ghost" onClick={() => setEditing(true)}>
              <Pencil /> Edit
            </button>
            {post.status === "draft" && (
              <button
                className="btn btn-ghost"
                onClick={() => startTransition(async () => { await setPostQueued(post.id, true); })}
                disabled={pending}
              >
                <Star /> Queue
              </button>
            )}
            {post.status === "queued" && (
              <button
                className="btn btn-ghost"
                style={{ color: "var(--accent)" }}
                onClick={() => startTransition(async () => { await setPostQueued(post.id, false); })}
                disabled={pending}
              >
                <Star fill="currentColor" /> Queued
              </button>
            )}
            {post.status !== "posted" && (
              <button className="btn btn-ghost" onClick={() => setPostingUrl(postingUrl === null ? "" : null)}>
                <Send /> Mark posted
              </button>
            )}
            {post.external_url && (
              <a className="btn btn-ghost" href={post.external_url} target="_blank" rel="noreferrer">
                <ExternalLink /> View
              </a>
            )}
            <button
              className="btn btn-ghost"
              style={{ marginLeft: "auto", color: "var(--danger)" }}
              onClick={() => startTransition(async () => { await deletePost(post.id); })}
              disabled={pending}
              aria-label="Delete post"
            >
              <Trash2 />
            </button>
          </>
        )}
      </footer>

      {postingUrl !== null && !editing && (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            className="field"
            placeholder="LinkedIn post URL (optional)"
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
