"use client";

import { useState, useTransition } from "react";
import { Check, Copy, ExternalLink, RefreshCw, Send, Trash2, TriangleAlert } from "lucide-react";

import type { ActionResult } from "@/lib/action-result";
import {
  logCommentPosted,
  redraftComments,
  removeCaptured,
  saveDraftEdit,
  setAuthor,
  setCapturedText,
} from "@/lib/engage/actions";
import { PASS_SCORE, SHAPE_LABEL, ageText, timingAdvice } from "@/lib/engage/format";
import type { CapturedPost, CommentDraft } from "@/lib/engage/types";

const TIMING_CHIP = { good: "chip chip-mint", ok: "chip chip-blue", late: "chip chip-amber" } as const;

export function CapturedPostCard({ post, now }: { post: CapturedPost; now: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [showText, setShowText] = useState(false);
  const [showWeak, setShowWeak] = useState(false);
  const [author, setAuthorName] = useState(post.author_name ?? "");
  const timing = timingAdvice(post.posted_at, now);
  const strong = post.drafts.filter((d) => (d.score ?? 0) >= PASS_SCORE || d.posted_at);
  // When nothing passed, the best one still shows, marked as weak.
  const shown = strong.length ? strong : post.drafts.slice(0, 1);
  const hidden = post.drafts.filter((d) => !shown.includes(d));

  const run = (work: () => Promise<ActionResult<unknown>>) =>
    startTransition(async () => {
      setError(null);
      const result = await work();
      if (!result.ok) setError(result.error);
    });

  return (
    <article className="panel stack-sm" id={`post-${post.id}`}>
      <header className="row" style={{ gap: 8 }}>
        <input
          className="field"
          style={{ maxWidth: 220 }}
          placeholder="Author"
          aria-label="Author"
          value={author}
          onChange={(e) => setAuthorName(e.target.value)}
          onBlur={() => author !== (post.author_name ?? "") && run(() => setAuthor(post.id, author))}
        />
        {post.posted_at && <span className="meta-mono">posted {ageText(post.posted_at, now)}</span>}
        {timing && <span className={TIMING_CHIP[timing.tone]}>{timing.label}</span>}
        {post.via === "email" && <span className="chip">From your notifications</span>}
        <span className="push row" style={{ gap: 4 }}>
          {post.url && (
            <a className="btn btn-ghost btn-sm" href={post.url} target="_blank" rel="noreferrer">
              <ExternalLink aria-hidden /> Open post
            </a>
          )}
          <button
            className="btn btn-ghost btn-icon btn-danger"
            aria-label="Remove"
            title="Remove"
            onClick={() => run(() => removeCaptured(post.id))}
            disabled={pending}
          >
            <Trash2 aria-hidden />
          </button>
        </span>
      </header>

      {post.story && (
        <p className="small soft">
          About a story on your wire:{" "}
          <a className="link" href={post.story.url} target="_blank" rel="noreferrer">
            {post.story.title ?? post.story.url}
          </a>
        </p>
      )}

      {post.text ? (
        <>
          <p className="small" style={{ whiteSpace: "pre-wrap" }}>
            {showText || post.text.length <= 280 ? post.text : `${post.text.slice(0, 280)}…`}
          </p>
          {post.text.length > 280 && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ justifySelf: "start" }}
              onClick={() => setShowText(!showText)}
            >
              {showText ? "Show less" : "Show the whole post"}
            </button>
          )}
        </>
      ) : (
        <div className="stack-xs">
          <textarea
            className="field"
            rows={3}
            placeholder="Paste the post's text to get drafts"
            aria-label="Post text"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            className="btn btn-primary btn-sm"
            style={{ justifySelf: "start" }}
            disabled={pending || !text.trim()}
            onClick={() => run(() => setCapturedText(post.id, text))}
          >
            {pending ? "Drafting…" : "Draft comments"}
          </button>
        </div>
      )}

      {shown.map((d) => (
        <DraftEditor key={d.id} draft={d} weak={!strong.includes(d)} />
      ))}
      {hidden.length > 0 && (
        <>
          <button className="btn btn-ghost btn-sm" style={{ justifySelf: "start" }} onClick={() => setShowWeak(!showWeak)}>
            {showWeak ? "Hide" : "Show"} {hidden.length} weaker draft{hidden.length === 1 ? "" : "s"}
          </button>
          {showWeak && hidden.map((d) => <DraftEditor key={d.id} draft={d} weak />)}
        </>
      )}

      {post.text && (
        <button
          className="btn btn-ghost btn-sm"
          style={{ justifySelf: "start" }}
          disabled={pending}
          onClick={() => run(() => redraftComments(post.id))}
        >
          <RefreshCw aria-hidden className={pending ? "spin" : undefined} />{" "}
          {post.drafts.length ? "New drafts" : "Draft comments"}
        </button>
      )}
      {error && (
        <p className="notice notice-danger" role="alert">
          <TriangleAlert aria-hidden />
          <span>{error}</span>
        </p>
      )}
    </article>
  );
}

function DraftEditor({ draft, weak }: { draft: CommentDraft; weak: boolean }) {
  const [body, setBody] = useState(draft.edited_body ?? draft.body);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const [posted, setPosted] = useState(Boolean(draft.posted_at));
  // A nudge to make it his before it goes out, not a lock.
  const edited = newWords(draft.body, body) >= 3;

  return (
    <div className="stack-xs" style={{ borderTop: "1px solid var(--hairline)", paddingTop: 10 }}>
      <div className="row small" style={{ gap: 8 }}>
        <strong>{SHAPE_LABEL[draft.shape]}</strong>
        {draft.score !== null && (
          <span className={weak ? "chip chip-amber" : "chip chip-mint"} title={draft.rubric?.notes ?? undefined}>
            {draft.score}/12
          </span>
        )}
        {weak && draft.rubric?.notes && <span className="muted">{draft.rubric.notes}</span>}
      </div>
      <textarea
        className="field"
        rows={3}
        value={body}
        aria-label={`${SHAPE_LABEL[draft.shape]} draft`}
        onChange={(e) => setBody(e.target.value)}
        onBlur={() => body !== (draft.edited_body ?? draft.body) && void saveDraftEdit(draft.id, body)}
      />
      <div className="row" style={{ gap: 6 }}>
        <button
          className="btn btn-sm"
          onClick={async () => {
            await navigator.clipboard.writeText(body);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}{" "}
          {copied ? "Copied" : edited ? "Copy" : "Copy (edit first?)"}
        </button>
        <button
          className="btn btn-ghost btn-sm"
          aria-pressed={posted}
          disabled={pending || posted}
          onClick={() =>
            startTransition(async () => {
              const result = await logCommentPosted(draft.id, body);
              if (result.ok) setPosted(true);
            })
          }
        >
          <Send aria-hidden /> {posted ? "Posted" : "I posted it"}
        </button>
      </div>
    </div>
  );
}

/** Words in the edit that weren't in the draft. */
function newWords(before: string, after: string): number {
  const seen = new Set(before.toLowerCase().split(/\s+/));
  return after
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w && !seen.has(w)).length;
}
