import { ExternalLink, History } from "lucide-react";

import { EmptyState } from "@/components/page-header";
import { programById, stateName } from "@/lib/study/catalog";
import { describeSignal } from "@/lib/study/extract";
import type { CheckSummary, ProgramChange } from "@/lib/study/types";

const WHEN = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** Every time an official page's dates, scores or fees moved, newest first, with what it said before and after. */
export function StudyChanges({
  changes,
  checks,
  followed,
}: {
  changes: ProgramChange[];
  checks: Record<string, CheckSummary>;
  followed: Set<string>;
}) {
  const all = Object.values(checks);
  const ok = all.filter((c) => c.status === "ok");
  const differs = ok.filter((c) => c.verdict === "differs").length;
  const unreadable = all.length - ok.length;
  const lastRun = all.reduce((m, c) => (c.checked_at > m ? c.checked_at : m), "");

  return (
    <div className="stack">
      <div className="stats" style={{ marginBottom: 0 }}>
        <div className="stat">
          <span className="stat-label">Pages checked</span>
          <span className="stat-value">{all.length}</span>
          <span className="stat-hint">{lastRun ? `Latest read ${WHEN.format(new Date(lastRun))}` : "The first pass hasn't run yet"}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Dates confirmed</span>
          <span className="stat-value">{ok.filter((c) => c.verdict === "match").length}</span>
          <span className="stat-hint">The page shows the closing date listed here</span>
        </div>
        <div className="stat">
          <span className="stat-label">Show other dates</span>
          <span className="stat-value">{differs}</span>
          <span className="stat-hint">Worth opening before you rely on the dates here</span>
        </div>
        <div className="stat">
          <span className="stat-label">Couldn&rsquo;t read</span>
          <span className="stat-value">{unreadable}</span>
          <span className="stat-hint">Refused, PDF or down; check these by hand</span>
        </div>
      </div>

      <p className="small soft" style={{ margin: 0 }}>
        Every page is read again each week and the ones you follow every day. A change is any deadline date, IELTS or TOEFL
        score or fee that appears on or disappears from the page between two reads. Followed programs that change are emailed.
      </p>

      {changes.length === 0 ? (
        <EmptyState icon={History} title="No changes spotted yet">
          The first reads set the baseline. When a page&rsquo;s dates, scores or fees move after that, it shows up here.
        </EmptyState>
      ) : (
        <ul className="list-plain stack-sm">
          {changes.map((c) => {
            const p = programById(c.program_id);
            return (
              <li key={c.id} className="panel stack-sm study-change">
                <div className="row" style={{ alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0, flex: "1 1 260px" }}>
                    <strong>{p?.program ?? c.program_id}</strong>
                    <div className="meta">
                      {p && <span className="soft">{p.university}</span>}
                      {p && <span>{stateName(p.state)}</span>}
                      <span>{WHEN.format(new Date(c.detected_at))}</span>
                      {followed.has(c.program_id) && <span className="chip chip-brand">Following</span>}
                    </div>
                  </div>
                  <a href={c.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                    <ExternalLink aria-hidden /> Open page
                  </a>
                </div>
                <div className="row study-tags">
                  {c.added.map((s) => (
                    <span key={`a${s}`} className="chip chip-mint">Now shows {describeSignal(s)}</span>
                  ))}
                  {c.removed.map((s) => (
                    <span key={`r${s}`} className="chip chip-rose">Gone: {describeSignal(s)}</span>
                  ))}
                </div>
                <div className="study-change-sides">
                  <div>
                    <h4 className="small muted">Before</h4>
                    <ul className="small soft study-snippets">
                      {c.before_snippets.length ? c.before_snippets.map((s) => <li key={s}>{s}</li>) : <li>Nothing dated</li>}
                    </ul>
                  </div>
                  <div>
                    <h4 className="small muted">After</h4>
                    <ul className="small soft study-snippets">
                      {c.after_snippets.length ? c.after_snippets.map((s) => <li key={s}>{s}</li>) : <li>Nothing dated</li>}
                    </ul>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
