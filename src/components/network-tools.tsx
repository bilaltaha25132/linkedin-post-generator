"use client";

import { useRef, useState, useTransition } from "react";
import { Check, Copy, ExternalLink, RefreshCw, Sparkles, Upload, UserPlus } from "lucide-react";

import { unwrap, type ActionResult } from "@/lib/action-result";
import { peopleSearchUrl } from "@/lib/links/deep";
import {
  addConnection,
  draftConnectionNote,
  refreshConnections,
  runProfileReview,
  setConnectionStatus,
} from "@/lib/network/actions";
import { NOTE_MAX, SOURCE_LABEL, wantsNote } from "@/lib/network/format";
import type { Connection, ConnectionStatus, ProfileReview } from "@/lib/network/types";

// What each status can move to, in button order.
const NEXT: Record<ConnectionStatus, { to: ConnectionStatus; label: string }[]> = {
  suggested: [],
  incoming: [
    { to: "accepted", label: "I accepted" },
    { to: "ignored", label: "Ignore" },
  ],
  sent: [
    { to: "accepted", label: "Accepted" },
    { to: "ignored", label: "No answer" },
  ],
  accepted: [{ to: "talking", label: "We're talking" }],
  talking: [],
  ignored: [{ to: "suggested", label: "Restore" }],
};

export function ConnectionCard({ c, canSend, notesLeft }: { c: Connection; canSend: boolean; notesLeft: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState(c.note_draft ?? "");
  const [copied, setCopied] = useState(false);
  const href = c.profile_url ?? peopleSearchUrl(c.search_query ?? c.name);
  const follow = c.kind === "follow";

  const run = <T,>(work: () => Promise<ActionResult<T>>, then?: (data: T) => void) =>
    startTransition(async () => {
      const result = await work();
      setError(result.ok ? null : result.error);
      if (result.ok) then?.(result.data);
    });

  const copy = async () => {
    await navigator.clipboard.writeText(note);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <article className="wire-row net-row" data-pending={pending}>
      <div style={{ minWidth: 0 }} className="stack-xs">
        <h3>
          <a href={href} target="_blank" rel="noreferrer">
            {c.name}
          </a>
        </h3>
        <div className="meta">
          <span className="launch-tag paper-tag">{follow ? "Follow" : (SOURCE_LABEL[c.source] ?? c.source)}</span>
          {c.headline && <span>{c.headline}</span>}
          {!c.profile_url && <span>find by search</span>}
          {c.status === "sent" && c.note_sent && <span>sent with a note</span>}
        </div>
        {c.reason && <p className="reason">{c.reason}</p>}

        {c.status === "suggested" && !follow && wantsNote(c.source) && (
          <div className="stack-xs">
            {note ? (
              <>
                <textarea
                  className="field"
                  rows={3}
                  maxLength={NOTE_MAX}
                  aria-label={`Note to ${c.name}`}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <span className="small muted">
                  {note.length}/{NOTE_MAX}. {notesLeft} personalised note{notesLeft === 1 ? "" : "s"} left this month; a blank
                  invite is fine for most people.
                </span>
              </>
            ) : null}
          </div>
        )}
        {error && (
          <p className="notice notice-danger" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="row-actions">
        <a className="btn btn-sm" href={href} target="_blank" rel="noreferrer">
          <ExternalLink aria-hidden /> {c.profile_url ? "Open profile" : "Search"}
        </a>
        {c.status === "suggested" &&
          (follow ? (
            <button className="btn btn-dark btn-sm" disabled={pending} onClick={() => run(() => setConnectionStatus(c.id, "accepted"))}>
              <Check aria-hidden /> I followed
            </button>
          ) : (
            <>
              {wantsNote(c.source) && (
                <button
                  className="btn btn-sm"
                  disabled={pending}
                  onClick={() => run(() => draftConnectionNote(c.id), (d) => setNote(d.note))}
                >
                  <Sparkles aria-hidden /> {note ? "Redraft note" : "Draft a note"}
                </button>
              )}
              {note && (
                <button className="btn btn-sm" onClick={copy}>
                  {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? "Copied" : "Copy note"}
                </button>
              )}
              <button
                className="btn btn-dark btn-sm"
                disabled={pending || !canSend}
                title={canSend ? undefined : "Today's or this week's invites are used up"}
                onClick={() => run(() => setConnectionStatus(c.id, "sent", { withNote: Boolean(note) && notesLeft > 0 }))}
              >
                <UserPlus aria-hidden /> I sent it
              </button>
            </>
          ))}
        {NEXT[c.status].map((n) => (
          <button key={n.to} className="btn btn-sm" disabled={pending} onClick={() => run(() => setConnectionStatus(c.id, n.to))}>
            {n.label}
          </button>
        ))}
        {c.status === "suggested" && (
          <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => run(() => setConnectionStatus(c.id, "ignored"))}>
            Skip
          </button>
        )}
      </div>
    </article>
  );
}

export function RefreshQueueButton() {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  return (
    <>
      {note && (
        <span className="status-text" role="status">
          {note}
        </span>
      )}
      <button
        className="btn btn-dark"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              const { added } = unwrap(await refreshConnections());
              setNote(added ? `${added} new suggestion${added > 1 ? "s" : ""}` : "No one new");
            } catch (err) {
              setNote((err as Error).message);
            }
          })
        }
      >
        <RefreshCw aria-hidden className={pending ? "spin" : undefined} />
        {pending ? "Looking…" : "Find people"}
      </button>
    </>
  );
}

export function AddConnectionForm() {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      setError(null);
      try {
        unwrap(await addConnection({ name, url, reason }));
        setName("");
        setUrl("");
        setReason("");
      } catch (err) {
        setError((err as Error).message);
      }
    });

  return (
    <details className="panel reveal">
      <summary>Add someone yourself</summary>
      <div className="stack-sm" style={{ marginTop: 12 }}>
        <input className="field" placeholder="Name" aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input
          className="field"
          placeholder="LinkedIn profile link (optional)"
          aria-label="LinkedIn profile link"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <input
          className="field"
          placeholder="Why connect, e.g. wrote the paper on agent evals I posted about"
          aria-label="Why connect"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <button className="btn btn-primary btn-sm" style={{ justifySelf: "start" }} disabled={pending || !name.trim()} onClick={submit}>
          {pending ? "Adding…" : "Add to queue"}
        </button>
        {error && (
          <p className="notice notice-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    </details>
  );
}

export function ProfileReviewPanel({ initialProfile, initialReview }: { initialProfile: string; initialReview: ProfileReview | null }) {
  const [profile, setProfile] = useState(initialProfile);
  const [review, setReview] = useState(initialReview);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setError(null);
    try {
      const { parseProfileArchive } = await import("@/lib/network/profile-parse");
      setProfile(parseProfileArchive(new Uint8Array(await file.arrayBuffer())));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      if (input.current) input.current.value = "";
    }
  };

  const run = () =>
    startTransition(async () => {
      setError(null);
      try {
        setReview(unwrap(await runProfileReview(profile)));
      } catch (err) {
        setError((err as Error).message);
      }
    });

  return (
    <div className="stack-sm">
      <textarea
        className="field"
        rows={8}
        aria-label="Your LinkedIn profile text"
        placeholder={"Paste your headline, About, experience and skills, or load them from your LinkedIn data archive."}
        value={profile}
        onChange={(e) => setProfile(e.target.value)}
      />
      <div className="plan-actions">
        <button className="btn btn-primary btn-sm" disabled={pending || profile.trim().length < 200} onClick={run}>
          <Sparkles aria-hidden /> {pending ? "Reviewing… (about a minute)" : review ? "Review again" : "Review my profile"}
        </button>
        <button className="btn btn-sm" disabled={pending} onClick={() => input.current?.click()}>
          <Upload aria-hidden /> Load from archive .zip
        </button>
        <input
          ref={input}
          type="file"
          accept=".zip"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
        />
      </div>
      {error && (
        <p className="notice notice-danger" role="alert">
          {error}
        </p>
      )}
      {review && <ReviewCard review={review} />}
    </div>
  );
}

function ReviewCard({ review }: { review: ProfileReview }) {
  const missed = review.queries.filter((q) => q.missing.length);
  return (
    <div className="stack">
      <ul className="list-plain stack-sm">
        {review.elements.map((e) => (
          <li key={e.key} className="net-check">
            <span className={e.status === "pass" ? "chip chip-mint" : "chip chip-amber"}>{e.status === "pass" ? "Good" : "Improve"}</span>
            <div>
              <strong className="small">{e.label}</strong>
              <p className="small">{e.note}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="stack-xs">
        <strong className="small">Headline options</strong>
        {review.headlines.map((h) => (
          <CopyBlock key={h} text={h} hint={`${h.length}/220`} />
        ))}
      </div>

      <div className="stack-xs">
        <strong className="small">About, rewritten</strong>
        <CopyBlock text={review.about} />
      </div>

      {review.skills.length > 0 && (
        <div className="stack-xs">
          <strong className="small">Skills, in this order</strong>
          <ol className="figures" style={{ marginTop: 0 }}>
            {review.skills.map((s, i) => (
              <li key={s}>
                {i + 1}. {s}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="stack-xs">
        <strong className="small">
          Recruiter searches: you match {review.queries.length - missed.length} of {review.queries.length}
        </strong>
        {missed.length ? (
          <ul className="list-plain stack-sm">
            {missed.map((q) => (
              <li key={q.query} className="small">
                <span className="meta-mono">&ldquo;{q.query}&rdquo;</span> misses {q.missing.join(", ")}.{" "}
                <span className="muted">{q.fix}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="small muted">Your profile carries the words for every search.</p>
        )}
      </div>
    </div>
  );
}

function CopyBlock({ text, hint }: { text: string; hint?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="net-copy">
      <p className="small" style={{ whiteSpace: "pre-wrap" }}>
        {text}
      </p>
      <div className="plan-actions">
        {hint && <span className="meta-mono">{hint}</span>}
        <button
          className="btn btn-ghost btn-sm"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
