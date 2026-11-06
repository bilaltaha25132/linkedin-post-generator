"use client";

import { useState, useTransition } from "react";
import { ExternalLink, GraduationCap, X } from "lucide-react";

import { EmptyState } from "@/components/page-header";
import { FITS, INTAKES, STAGES, STATUS_CHIP, STATUS_LABEL, feeWarning, stateName } from "@/lib/study/catalog";
import { trackProgram, untrackProgram, type TrackChange } from "@/lib/study/actions";
import type { Program, StudyFit, StudyIntake, StudyStage, TrackedProgram } from "@/lib/study/types";
import { formatDay, nextDeadline, summerStatus } from "@/lib/study/windows";

export type TrackedRow = { tracked: TrackedProgram; program: Program };

/** Programs he follows, by stage, each with his fit verdict, intake and notes. */
export function StudyTracker({ rows, now: nowMs }: { rows: TrackedRow[]; now: number }) {
  const now = new Date(nowMs);
  if (rows.length === 0) {
    return (
      <EmptyState icon={GraduationCap} title="Not following any programs yet">
        Press Follow on a program and it moves here, where you can take it from shortlist to admission.
      </EmptyState>
    );
  }
  return (
    <div className="stack">
      {STAGES.map(({ stage, label }) => {
        // Soonest deadline first; programs with no open window go last.
        const inStage = rows
          .filter((r) => r.tracked.stage === stage)
          .sort((a, b) => (nextDeadline(a.program, now)?.end.getTime() ?? Infinity) - (nextDeadline(b.program, now)?.end.getTime() ?? Infinity));
        if (inStage.length === 0) return null;
        return (
          <section key={stage} className="panel stack-sm" aria-label={label}>
            <div className="panel-head" style={{ marginBottom: 0 }}>
              <h2>
                {label} <span className="muted">{inStage.length}</span>
              </h2>
            </div>
            {inStage.map((r) => (
              <TrackedProgramRow key={r.program.id} row={r} now={now} />
            ))}
          </section>
        );
      })}
    </div>
  );
}

function TrackedProgramRow({ row: { tracked: t, program: p }, now }: { row: TrackedRow; now: Date }) {
  const next = nextDeadline(p, now);
  const status = summerStatus(p, now);
  const fee = feeWarning(p);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState(t.notes);
  const fit = FITS.find((f) => f.fit === t.fit);

  const save = (change: TrackChange) =>
    startTransition(async () => {
      const result = await trackProgram(p.id, change);
      setError(result.ok ? null : result.error);
    });
  const remove = () =>
    startTransition(async () => {
      const result = await untrackProgram(p.id);
      setError(result.ok ? null : result.error);
    });

  return (
    <div className="study-tracked" style={{ opacity: pending ? 0.55 : 1 }}>
      <div className="row" style={{ alignItems: "flex-start" }}>
        <div style={{ minWidth: 0, flex: "1 1 280px" }}>
          {p.source ? (
            <a href={p.source} target="_blank" rel="noreferrer">
              <strong>{p.program}</strong> <ExternalLink aria-hidden size={12} />
            </a>
          ) : (
            <strong>{p.program}</strong>
          )}
          <div className="meta">
            <span className="soft">{p.university}</span>
            <span>{stateName(p.state)}</span>
            <span className={`chip ${STATUS_CHIP[status]}`}>Summer: {STATUS_LABEL[status]}</span>
            {next ? (
              <span className={`chip ${next.daysLeft <= 14 ? "chip-rose" : "chip-blue"}`}>
                {next.intake === "summer" ? "Summer" : "Winter"} {next.year} {next.status === "upcoming" ? "opens" : "closes"}{" "}
                {formatDay(next.status === "upcoming" && next.start ? next.start : next.end)}
                {next.status === "open" ? `, ${next.daysLeft} days left` : ""}
              </span>
            ) : (
              <span>{p.winter ? `Winter ${p.winter}` : "No dated window"}</span>
            )}
            {p.facts.tuition && <span>{fee ? "EUR 1,500 state fee" : p.facts.tuition}</span>}
            {fit && <span className={`chip ${fit.chip}`}>{fit.label}</span>}
          </div>
          {t.fit_note && <p className="small soft study-note">{t.fit_note}</p>}
        </div>
        <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={remove} disabled={pending} aria-label={`Stop following ${p.program}`}>
          <X aria-hidden />
        </button>
      </div>

      <div className="row">
        <select
          className="field"
          aria-label={`Stage for ${p.program}`}
          value={t.stage}
          disabled={pending}
          onChange={(e) => save({ stage: e.target.value as StudyStage })}
          style={{ width: "auto" }}
        >
          {STAGES.map((s) => (
            <option key={s.stage} value={s.stage}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          className="field"
          aria-label={`Intake for ${p.program}`}
          value={t.intake}
          disabled={pending}
          onChange={(e) => save({ intake: e.target.value as StudyIntake })}
          style={{ width: "auto" }}
        >
          {INTAKES.map((i) => (
            <option key={i.intake} value={i.intake}>
              {i.label}
            </option>
          ))}
        </select>
        <select
          className="field"
          aria-label={`Fit for ${p.program}`}
          value={t.fit ?? ""}
          disabled={pending}
          onChange={(e) => save({ fit: (e.target.value || null) as StudyFit | null })}
          style={{ width: "auto" }}
        >
          <option value="">Fit not judged</option>
          {FITS.map((f) => (
            <option key={f.fit} value={f.fit}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <label className="stack-xs">
        <span className="small muted">Your notes</span>
        <textarea
          className="field"
          rows={2}
          value={notes}
          placeholder="Portal login sent, VPD requested, documents still missing…"
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== t.notes && save({ notes })}
        />
      </label>

      {error && (
        <p className="notice notice-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
