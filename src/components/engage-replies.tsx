"use client";

import { useState, useTransition } from "react";
import { Check, Copy, ExternalLink, MessageCircleReply, TriangleAlert } from "lucide-react";

import type { ActionResult } from "@/lib/action-result";
import { draftEventReply, draftPastedReply, markEventDone } from "@/lib/engage/actions";
import { ageText } from "@/lib/engage/format";
import type { EngagementEvent } from "@/lib/engage/types";

/** Comments on his own posts, from the email bridge or pasted, each with a reply draft. */
export function EngageReplies({ events, now }: { events: EngagementEvent[]; now: number }) {
  const [pasted, setPasted] = useState("");
  const [pastedReply, setPastedReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = <T,>(work: () => Promise<ActionResult<T>>, then?: (data: T) => void) =>
    startTransition(async () => {
      setError(null);
      const result = await work();
      if (!result.ok) setError(result.error);
      else then?.(result.data);
    });

  return (
    <section className="panel stack-sm reveal" aria-labelledby="replies-title">
      <div className="panel-head" style={{ marginBottom: 0 }}>
        <span className="panel-icon">
          <MessageCircleReply aria-hidden />
        </span>
        <h2 id="replies-title">Replies</h2>
        <p>
          Comments on your posts. Answering inside the first hour keeps the thread, and the post, going.
        </p>
      </div>

      {events.length > 0 ? (
        <ul className="list-plain stack-sm">
          {events.map((e) => (
            <li key={e.id} className="stack-xs" style={{ borderTop: "1px solid var(--hairline)", paddingTop: 10 }}>
              <div className="row small" style={{ gap: 8 }}>
                <strong>{e.actor_name ?? "Someone"}</strong>
                <span className="muted">{e.kind === "mention" ? "mentioned you" : "commented"}</span>
                <span className="meta-mono">{ageText(e.occurred_at, now)}</span>
                {e.post_url && (
                  <a className="btn btn-ghost btn-sm push" href={e.post_url} target="_blank" rel="noreferrer">
                    <ExternalLink aria-hidden /> Open
                  </a>
                )}
              </div>
              {e.preview && <p className="small soft">{e.preview}</p>}
              {e.reply_draft ? <ReplyBox key={e.reply_draft} text={e.reply_draft} /> : null}
              <div className="row" style={{ gap: 6 }}>
                {e.preview && (
                  <button className="btn btn-sm" disabled={pending} onClick={() => run(() => draftEventReply(e.id))}>
                    {e.reply_draft ? "Another reply" : "Draft a reply"}
                  </button>
                )}
                <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => run(() => markEventDone(e.id))}>
                  <Check aria-hidden /> Done
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small">
          No comments waiting. With the email bridge on, new comments on your posts show up here.
        </p>
      )}

      <details>
        <summary className="small">Paste a comment someone left</summary>
        <div className="stack-xs" style={{ marginTop: 10 }}>
          <textarea
            className="field"
            rows={3}
            aria-label="Their comment"
            placeholder="Their comment"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
          />
          <button
            className="btn btn-sm"
            style={{ justifySelf: "start" }}
            disabled={pending || !pasted.trim()}
            onClick={() => run(() => draftPastedReply(pasted), (d) => setPastedReply(d.reply))}
          >
            {pending ? "Drafting…" : "Draft a reply"}
          </button>
          {pastedReply && <ReplyBox key={pastedReply} text={pastedReply} />}
        </div>
      </details>

      {error && (
        <p className="notice notice-danger" role="alert">
          <TriangleAlert aria-hidden />
          <span>{error}</span>
        </p>
      )}
    </section>
  );
}

function ReplyBox({ text }: { text: string }) {
  const [body, setBody] = useState(text);
  const [copied, setCopied] = useState(false);
  return (
    <div className="stack-xs">
      <textarea className="field" rows={2} aria-label="Reply draft" value={body} onChange={(e) => setBody(e.target.value)} />
      <button
        className="btn btn-sm"
        style={{ justifySelf: "start" }}
        onClick={async () => {
          await navigator.clipboard.writeText(body);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
