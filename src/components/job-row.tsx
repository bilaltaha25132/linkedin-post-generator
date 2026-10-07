"use client";

import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck, ExternalLink, EyeOff, Send } from "lucide-react";

import { LocalTime } from "@/components/local-time";
import { SignalScore } from "@/components/signal-score";
import { setJobStatus } from "@/lib/jobs/actions";
import { VISA_LABEL, payText, whereText } from "@/lib/jobs/format";
import type { Job, JobStatus } from "@/lib/jobs/types";

const DAY = 86_400_000;

/** `now` comes from the server render, so the New badge doesn't shift on hydration. */
export function JobRow({ job, now }: { job: Job; now: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const detail = job.score_detail;
  const pay = payText(job);
  const age = now - Date.parse(job.posted_at ?? job.first_seen_at);

  const move = (status: JobStatus) =>
    startTransition(async () => {
      const result = await setJobStatus(job.id, status);
      setError(result.ok ? null : result.error);
    });

  return (
    <article className="wire-row" data-pending={pending} id={`job-${job.id}`}>
      <SignalScore score={job.score} label="Fit" />

      <div style={{ minWidth: 0 }}>
        <h3>
          <a href={job.url_apply} target="_blank" rel="noreferrer">
            {job.title}
          </a>
        </h3>

        <div className="meta">
          {age < DAY && <span className="launch-tag">New</span>}
          <strong className="soft">{job.company}</strong>
          <span>{whereText(job)}</span>
          {pay && <span>{pay}</span>}
          {job.is_contract && <span className="launch-tag paper-tag">Contract</span>}
          {VISA_LABEL[job.visa_flag] && <span>{VISA_LABEL[job.visa_flag]}</span>}
          <span>
            {job.posted_at ? "Posted " : "Found "}
            <LocalTime iso={job.posted_at ?? job.first_seen_at} withTime={false} />
          </span>
          {job.source_credit && job.source_credit !== job.company && (
            <a href={job.url_source ?? job.url_apply} target="_blank" rel="noreferrer" className="thread-link">
              via {job.source_credit}
            </a>
          )}
        </div>

        {detail ? (
          <>
            <p className="reason">
              {detail.why}
              {detail.capped && <span className="muted"> ({detail.capped})</span>}
            </p>
            {(detail.stack_overlap.length > 0 || detail.gaps.length > 0) && (
              <ul className="figures" aria-label="Skills">
                {detail.stack_overlap.map((s) => (
                  <li key={`has-${s}`} className="skill-has">
                    {s}
                  </li>
                ))}
                {detail.gaps.map((s) => (
                  <li key={`gap-${s}`} className="skill-gap" title="Asked for, not on your profile">
                    {s}
                  </li>
                ))}
              </ul>
            )}
            {detail.red_flags.length > 0 && <p className="reason small">Watch for: {detail.red_flags.join(", ")}</p>}
          </>
        ) : (
          <p className="reason muted">Not scored yet. The next pass scores it.</p>
        )}
        {error && (
          <p className="notice notice-danger" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="row-actions">
        <a href={job.url_apply} target="_blank" rel="noreferrer" className="btn btn-primary">
          <ExternalLink aria-hidden /> Apply
        </a>
        {job.status === "saved" ? (
          <button className="btn btn-ghost" onClick={() => move("new")} disabled={pending}>
            <BookmarkCheck aria-hidden /> Saved
          </button>
        ) : (
          <button className="btn btn-ghost" onClick={() => move("saved")} disabled={pending}>
            <Bookmark aria-hidden /> Save
          </button>
        )}
        <button className="btn btn-ghost" onClick={() => move("applied")} disabled={pending}>
          <Send aria-hidden /> Applied
        </button>
        <button className="btn btn-ghost" onClick={() => move("hidden")} disabled={pending}>
          <EyeOff aria-hidden /> Hide
        </button>
      </div>
    </article>
  );
}
