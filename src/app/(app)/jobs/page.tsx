import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { JobSources } from "@/components/job-sources";
import { JobTracker } from "@/components/job-tracker";
import { JobsList } from "@/components/jobs-list";
import { JobsScanButton } from "@/components/jobs-scan-button";
import { PageHeader } from "@/components/page-header";
import { SetupNotice } from "@/components/setup-notice";
import { listJobSources, listOpenJobs, listTrackedJobs } from "@/lib/jobs/queries";
import { boardUrl } from "@/lib/jobs/sources";
import type { Job, JobSource } from "@/lib/jobs/types";
import { supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
// "Check boards now" runs a pass (100s budget, see jobs/actions.ts).
export const maxDuration = 150;

export default async function JobsPage({ searchParams }: PageProps<"/jobs">) {
  const { view } = await searchParams;
  const tracker = view === "tracker";
  const configured = supabaseConfigured();
  const { jobs, sources, loadError, now } = configured
    ? await load(tracker)
    : { jobs: [], sources: [], loadError: null, now: 0 };
  const boardUrls = Object.fromEntries(
    sources.flatMap((s) => {
      const url = boardUrl(s);
      return url ? [[s.id, url]] : [];
    }),
  );
  return (
    <>
      <PageHeader title="Jobs" eyebrow="Career" action={configured && !loadError ? <JobsScanButton /> : undefined}>
        AI engineering roles from company boards and job sites, scored against your job profile. Saudi Arabia and
        the Gulf first, then Europe and remote. You apply; nothing is sent for you.
      </PageHeader>

      {!configured ? (
        <SetupNotice />
      ) : loadError ? (
        <p className="notice notice-danger" role="alert">
          <TriangleAlert aria-hidden />
          <span>
            Couldn&rsquo;t load jobs ({loadError}). If the tables are missing, run{" "}
            <code>node --env-file=.env.local scripts/migrate.mjs</code>.
          </span>
        </p>
      ) : (
        <div className="stack">
          <div className="seg" role="group" aria-label="View" style={{ justifySelf: "start" }}>
            <Link href="/jobs" aria-current={tracker ? undefined : "page"}>
              Matches
            </Link>
            <Link href="/jobs?view=tracker" aria-current={tracker ? "page" : undefined}>
              Applied
            </Link>
          </div>
          {tracker ? <JobTracker jobs={jobs} /> : <JobsList jobs={jobs} now={now} />}
          <JobSources sources={sources} boardUrls={boardUrls} />
        </div>
      )}
    </>
  );
}

async function load(tracker: boolean): Promise<{
  jobs: Job[];
  sources: JobSource[];
  loadError: string | null;
  /** Taken once on the server, so "New" badges and date filters agree with hydration. */
  now: number;
}> {
  const now = Date.now();
  try {
    const [jobs, sources] = await Promise.all([tracker ? listTrackedJobs() : listOpenJobs(), listJobSources()]);
    return { jobs, sources, loadError: null, now };
  } catch (err) {
    return { jobs: [], sources: [], loadError: err instanceof Error ? err.message : String(err), now };
  }
}
