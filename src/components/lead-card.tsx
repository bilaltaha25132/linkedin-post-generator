"use client";

import { useState, useTransition } from "react";
import { Check, Copy, ExternalLink, EyeOff, RefreshCw } from "lucide-react";

import { SignalScore } from "@/components/signal-score";
import type { ActionResult } from "@/lib/action-result";
import { redraftOpener, setLeadStatus, snoozeLead } from "@/lib/leads/actions";
import { KIND_LABEL, SOURCE_LABEL } from "@/lib/leads/format";
import type { Lead, LeadStatus } from "@/lib/leads/types";

const DAY = 86_400_000;

// What each pipeline stage can move to, in button order.
const NEXT: Record<LeadStatus, { to: LeadStatus; label: string }[]> = {
  new: [{ to: "contacted", label: "I reached out" }],
  contacted: [
    { to: "talking", label: "They replied" },
    { to: "lost", label: "No reply" },
  ],
  talking: [
    { to: "won", label: "Won" },
    { to: "lost", label: "Lost" },
  ],
  won: [{ to: "talking", label: "Reopen" }],
  lost: [{ to: "new", label: "Reopen" }],
  hidden: [{ to: "new", label: "Unhide" }],
};

/** `now` comes from the server render, so ages don't shift on hydration. */
export function LeadCard({ lead, now }: { lead: Lead; now: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [opener, setOpener] = useState(lead.opener ?? "");
  const [copied, setCopied] = useState(false);
  const detail = lead.score_detail;
  const nudgeDue = lead.status === "contacted" && lead.nudge_at && Date.parse(lead.nudge_at) <= now;
  const link = lead.url && /^https?:/.test(lead.url) ? lead.url : null;

  const run = <T,>(work: () => Promise<ActionResult<T>>, then?: (data: T) => void) =>
    startTransition(async () => {
      const result = await work();
      setError(result.ok ? null : result.error);
      if (result.ok) then?.(result.data);
    });

  return (
    <article className="wire-row" data-pending={pending} id={`lead-${lead.id}`}>
      <SignalScore score={lead.score} label="Fit" />

      <div style={{ minWidth: 0 }} className="stack-xs">
        <h3>
          {link ? (
            <a href={link} target="_blank" rel="noreferrer">
              {lead.wants ?? "Untitled lead"}
            </a>
          ) : (
            (lead.wants ?? "Untitled lead")
          )}
        </h3>

        <div className="meta">
          <span className="launch-tag paper-tag">{KIND_LABEL[lead.kind] ?? lead.kind}</span>
          {lead.who && <strong className="soft">{lead.who}</strong>}
          {detail?.who_type && detail.who_type !== "unknown" && <span>{detail.who_type}</span>}
          {lead.budget && <span>{lead.budget}</span>}
          {(lead.region || lead.remote === "yes") && (
            <span>{[lead.region, lead.remote === "yes" ? "remote" : null].filter(Boolean).join(", ")}</span>
          )}
          <span>{age(now, lead.posted_at ?? lead.created_at, lead.posted_at ? "posted" : "found")}</span>
          <span>{SOURCE_LABEL[lead.source] ?? lead.source}</span>
        </div>

        {detail ? (
          <p className="reason">
            {detail.why}
            {detail.capped && <span className="muted"> ({detail.capped})</span>}
          </p>
        ) : (
          <p className="reason muted">Not scored yet. The next pass scores it.</p>
        )}
        {lead.stack.length > 0 && (
          <ul className="figures" aria-label="Stack">
            {lead.stack.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        )}
        {nudgeDue && <p className="chip chip-amber" style={{ justifySelf: "start" }}>Follow up today</p>}

        {lead.status !== "won" && lead.status !== "lost" && (opener || lead.score !== null) && (
          <details open={lead.status === "new" && Boolean(opener) && (lead.score ?? 0) >= 60}>
            <summary className="small">A reply you could send</summary>
            <div className="stack-xs" style={{ marginTop: 8 }}>
              <textarea
                className="field"
                rows={3}
                aria-label="Opener"
                value={opener}
                onChange={(e) => setOpener(e.target.value)}
              />
              <div className="row" style={{ gap: 6 }}>
                <button
                  className="btn btn-sm"
                  disabled={!opener}
                  onClick={async () => {
                    await navigator.clipboard.writeText(opener);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? "Copied" : "Copy"}
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={pending}
                  onClick={() => run(() => redraftOpener(lead.id), (d) => setOpener(d.opener))}
                >
                  <RefreshCw aria-hidden className={pending ? "spin" : undefined} /> Another
                </button>
              </div>
            </div>
          </details>
        )}

        {error && (
          <p className="notice notice-danger" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="row-actions">
        {link && (
          <a href={link} target="_blank" rel="noreferrer" className="btn btn-primary">
            <ExternalLink aria-hidden /> Open
          </a>
        )}
        {NEXT[lead.status].map((n) => (
          <button key={n.to} className="btn btn-ghost" disabled={pending} onClick={() => run(() => setLeadStatus(lead.id, n.to))}>
            {n.label}
          </button>
        ))}
        {lead.status === "contacted" && (
          <button className="btn btn-ghost" disabled={pending} onClick={() => run(() => snoozeLead(lead.id, 3))}>
            Nudge in 3 days
          </button>
        )}
        {lead.status === "new" && (
          <button className="btn btn-ghost" disabled={pending} onClick={() => run(() => setLeadStatus(lead.id, "hidden"))}>
            <EyeOff aria-hidden /> Hide
          </button>
        )}
      </div>
    </article>
  );
}

function age(now: number, iso: string, verb: string): string {
  const days = Math.floor((now - Date.parse(iso)) / DAY);
  if (days < 1) return `${verb} today`;
  if (days === 1) return `${verb} yesterday`;
  return `${verb} ${days} days ago`;
}
