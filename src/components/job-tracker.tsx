"use client";

import { useState, useTransition } from "react";
import { ClipboardList } from "lucide-react";

import { LocalTime } from "@/components/local-time";
import { EmptyState } from "@/components/page-header";
import { setJobStatus } from "@/lib/jobs/actions";
import { whereText } from "@/lib/jobs/format";
import type { Job, JobStatus } from "@/lib/jobs/types";

const STAGES: { status: JobStatus; label: string }[] = [
  { status: "applied", label: "Applied" },
  { status: "interviewing", label: "Interviewing" },
  { status: "offer", label: "Offer" },
  { status: "closed", label: "Closed" },
];

/** Roles he applied to, by stage. Moving one is a select away. */
export function JobTracker({ jobs }: { jobs: Job[] }) {
  if (jobs.length === 0) {
    return (
      <EmptyState icon={ClipboardList} title="Nothing tracked yet">
        Press Applied on a match and it moves here, where you can follow it through interviews to an offer.
      </EmptyState>
    );
  }
  return (
    <div className="stack">
      {STAGES.map(({ status, label }) => {
        const stage = jobs.filter((j) => j.status === status);
        if (stage.length === 0) return null;
        return (
          <section key={status} className="panel stack-sm">
            <div className="panel-head" style={{ marginBottom: 0 }}>
              <h2>
                {label} <span className="muted">{stage.length}</span>
              </h2>
            </div>
            {stage.map((j) => (
              <TrackedJob key={j.id} job={j} />
            ))}
          </section>
        );
      })}
    </div>
  );
}

function TrackedJob({ job }: { job: Job }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const move = (status: JobStatus) =>
    startTransition(async () => {
      const result = await setJobStatus(job.id, status);
      setError(result.ok ? null : result.error);
    });

  return (
    <div className="row" data-pending={pending} style={{ opacity: pending ? 0.55 : 1 }}>
      <div style={{ minWidth: 0, flex: "1 1 260px" }}>
        <a href={job.url_apply} target="_blank" rel="noreferrer">
          <strong>{job.title}</strong>
        </a>
        <div className="meta">
          <span className="soft">{job.company}</span>
          <span>{whereText(job)}</span>
          {job.score !== null && <span>Fit {job.score}</span>}
          <span>
            Found <LocalTime iso={job.first_seen_at} withTime={false} />
          </span>
        </div>
        {error && (
          <p className="notice notice-danger" role="alert">
            {error}
          </p>
        )}
      </div>
      <select
        className="field"
        aria-label={`Stage for ${job.title}`}
        value={job.status}
        disabled={pending}
        onChange={(e) => move(e.target.value as JobStatus)}
        style={{ width: "auto" }}
      >
        {STAGES.map((s) => (
          <option key={s.status} value={s.status}>
            {s.label}
          </option>
        ))}
        <option value="saved">Back to saved</option>
      </select>
    </div>
  );
}
