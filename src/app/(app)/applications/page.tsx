import Link from "next/link";
import { Bot, ExternalLink, TriangleAlert, Wand2 } from "lucide-react";

import { RunLive, RunSentButton } from "@/components/run-tools";
import { LocalTime } from "@/components/local-time";
import { EmptyState, PageHeader } from "@/components/page-header";
import { SetupNotice } from "@/components/setup-notice";
import { listRuns, type AgentRun, type RunStatus } from "@/lib/agent/runs";
import { supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// A run still "running" after this long lost its agent window (closed mid-run); stop auto-refreshing for it.
const LIVE_MS = 30 * 60_000;

const STATUS_LABEL: Record<RunStatus, string> = {
  running: "Working on it",
  submitted: "Submitted",
  ready: "Ready for you to submit",
  needs_you: "Needs you",
  stopped: "Stopped",
  failed: "Hit a problem",
  done: "Finished, not submitted",
};

export default async function ApplicationsPage() {
  if (!supabaseConfigured()) return <SetupNotice />;
  const { runs, loadError, now } = await load();
  const counts = runs.reduce<Partial<Record<RunStatus, number>>>((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {});

  return (
    <>
      <PageHeader title="Applications" eyebrow="Career" action={<RunLive running={runs.some((r) => r.status === "running" && now - Date.parse(r.started_at) < LIVE_MS)} />}>
        Every job the agent worked on, newest first: what the company does, what the role is, what went into the form
        and how it ended.
        {runs.length > 0 &&
          ` ${counts.submitted ?? 0} submitted, ${counts.ready ?? 0} ready for you, ${counts.needs_you ?? 0} need you.`}
      </PageHeader>

      {loadError ? (
        <p className="notice notice-danger" role="alert">
          <TriangleAlert aria-hidden />
          <span>
            Couldn&rsquo;t load the runs ({loadError}). If the table is missing, run{" "}
            <code>node --env-file=.env.local scripts/migrate.mjs</code>.
          </span>
        </p>
      ) : runs.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="Nothing yet"
          action={
            <Link href="/jobs" className="btn btn-dark">
              Go to Jobs
            </Link>
          }
        >
          Press Agentic Apply on a job, or Agentic Apply to recent on Jobs, and each run shows up here.
        </EmptyState>
      ) : (
        <div className="run-list">
          {runs.map((run) => (
            <RunCard key={run.id} run={run} />
          ))}
        </div>
      )}
    </>
  );
}

async function load(): Promise<{ runs: AgentRun[]; loadError: string | null; now: number }> {
  const now = Date.now();
  try {
    return { runs: await listRuns(), loadError: null, now };
  } catch (err) {
    return { runs: [], loadError: err instanceof Error ? err.message : String(err), now };
  }
}

function RunCard({ run }: { run: AgentRun }) {
  const job = run.job;
  const open = run.final_url || run.start_url || job?.url_apply;
  return (
    <article className="run-card" id={`run-${run.id}`}>
      <div className="run-card-head">
        <h3>{job ? `${job.company}: ${job.title}` : "A job that's since been removed"}</h3>
        <span className="run-status" data-status={run.status}>
          {STATUS_LABEL[run.status]}
        </span>
        <span className="small muted">
          {run.auto_submit ? "Auto-submit" : "Fill for review"}, {run.steps} steps, started <LocalTime iso={run.started_at} />
          {job?.location_raw ? `, ${job.location_raw}` : ""}
        </span>
      </div>

      {(run.company_summary || run.role_summary) && (
        <div className="run-about">
          {run.company_summary && (
            <div>
              <h4>The company</h4>
              <p>{run.company_summary}</p>
            </div>
          )}
          {run.role_summary && (
            <div>
              <h4>The work</h4>
              <p>{run.role_summary}</p>
            </div>
          )}
        </div>
      )}

      {run.blocker && (
        <p className={`notice run-blocker${run.status === "failed" ? " notice-danger" : ""}`}>{run.blocker}</p>
      )}
      {run.summary && <p className="small soft run-blocker">{run.summary}</p>}

      {run.fields.length > 0 && (
        <details className="run-fields">
          <summary>What went into the form ({run.fields.length} fields)</summary>
          <dl>
            {run.fields.map((f, i) => (
              <div key={`${f.label}-${i}`} style={{ display: "contents" }}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}

      <div className="row">
        {open && (
          <a href={open} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
            <ExternalLink aria-hidden /> {run.status === "ready" || run.status === "needs_you" ? "Open the form" : "Open the page"}
          </a>
        )}
        {job && (
          <Link href={`/jobs/${job.id}/apply`} className="btn btn-ghost btn-sm">
            <Wand2 aria-hidden /> Apply kit
          </Link>
        )}
        {(run.status === "ready" || run.status === "needs_you" || run.status === "done") && <RunSentButton runId={run.id} />}
      </div>
    </article>
  );
}
