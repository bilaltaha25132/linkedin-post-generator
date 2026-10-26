import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { AgentApply } from "@/components/agent-apply";
import { DeepLinks, type DeepLink } from "@/components/deep-links";
import { JobSources } from "@/components/job-sources";
import { JobTracker } from "@/components/job-tracker";
import { JobsList } from "@/components/jobs-list";
import { JobsScanButton } from "@/components/jobs-scan-button";
import { PageHeader } from "@/components/page-header";
import { SetupNotice } from "@/components/setup-notice";
import { getJobProfile, listJobSources, listOpenJobs, listTrackedJobs } from "@/lib/jobs/queries";
import { agentCanApply, type AgentJob } from "@/lib/agent/bridge";
import { triedJobIds } from "@/lib/agent/runs";
import { boardUrl } from "@/lib/jobs/sources";
import type { Job, JobProfile, JobRegion, JobSource } from "@/lib/jobs/types";
import { jobSearchUrl, type JobGeo } from "@/lib/links/deep";
import { linkOpens } from "@/lib/links/queries";
import { supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
// "Check boards now" runs a pass (100s budget, see jobs/actions.ts).
export const maxDuration = 150;

export default async function JobsPage({ searchParams }: PageProps<"/jobs">) {
  const { view } = await searchParams;
  const tracker = view === "tracker";
  const configured = supabaseConfigured();
  const { jobs, sources, links, tried, loadError, now } = configured
    ? await load(tracker)
    : { jobs: [], sources: [], links: [], tried: new Set<string>(), loadError: null, now: 0 };
  const boardUrls = Object.fromEntries(
    sources.flatMap((s) => {
      const url = boardUrl(s);
      return url ? [[s.id, url]] : [];
    }),
  );
  return (
    <>
      <PageHeader
        title="Jobs"
        eyebrow="Career"
        action={
          configured && !loadError ? (
            <>
              <JobsScanButton />
              {!tracker && <AgentApply jobs={recentForAgent(jobs, now, tried)} label="Agentic Apply to recent" className="btn btn-primary" />}
            </>
          ) : undefined
        }
      >
        AI engineering roles from company boards and job sites, scored against your job profile. Saudi Arabia and
        the Gulf first, then Europe and remote. Agentic Apply fills the forms in your browser; it submits only when
        you pick Auto-submit.
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
          {!tracker && links.length > 0 && (
            <section className="stack-xs" aria-label="Search LinkedIn">
              <p className="small soft">
                LinkedIn&rsquo;s own listings from the last 24 hours, newest first. They open in your browser.
              </p>
              <DeepLinks links={links} now={now} />
            </section>
          )}
          {tracker ? <JobTracker jobs={jobs} /> : <JobsList jobs={jobs} now={now} />}
          <JobSources sources={sources} boardUrls={boardUrls} />
        </div>
      )}
    </>
  );
}

// Three weeks, not one: the best fits often surface a week or two after posting.
const RECENT_DAYS = 21;
const RECENT_MAX = 25;

// Himalayas checks the applicant's country against the job's list before it shows a form.
const himalayasShut = (j: Job) => /(^|\.)himalayas\.app$/i.test(new URL(j.url_apply).hostname) && !/worldwide|anywhere|pakistan/i.test(j.location_raw ?? "");

// The batch for "Agentic Apply to recent": open jobs from the last three weeks with a
// form the agent can reach and that it hasn't been through already, best fit first.
function recentForAgent(jobs: Job[], now: number, tried: Set<string>): AgentJob[] {
  return jobs
    .filter((j) => (j.status === "new" || j.status === "saved") && agentCanApply(j.url_apply) && !tried.has(j.id) && !himalayasShut(j))
    .filter((j) => now - Date.parse(j.posted_at ?? j.first_seen_at) < RECENT_DAYS * 86_400_000)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    // The same post on two boards (arbeitnow.co.uk and .ch) is one application.
    .filter((j, i, all) => all.findIndex((o) => o.company.toLowerCase() === j.company.toLowerCase() && o.title.toLowerCase() === j.title.toLowerCase()) === i)
    .slice(0, RECENT_MAX)
    .map((j) => ({ id: j.id, title: j.title, company: j.company, url_apply: j.url_apply }));
}

// LinkedIn job-search places for each region, in his order.
const REGION_GEOS: Record<JobRegion, { geo: JobGeo; label: string; remote?: boolean }[]> = {
  saudi: [{ geo: "Saudi Arabia", label: "Saudi Arabia" }],
  gulf: [
    { geo: "UAE", label: "UAE" },
    { geo: "Qatar", label: "Qatar" },
  ],
  europe: [
    { geo: "Germany", label: "Germany" },
    { geo: "Netherlands", label: "Netherlands" },
    { geo: "UK", label: "UK" },
  ],
  remote: [{ geo: "Worldwide", label: "Remote", remote: true }],
  pakistan: [{ geo: "Pakistan", label: "Pakistan" }],
  other: [],
};

async function searchLinks(profile: JobProfile): Promise<DeepLink[]> {
  const query = profile.titles[0] ?? "AI Engineer";
  const places = profile.regions.flatMap((r) => REGION_GEOS[r as JobRegion] ?? []);
  const links = places.map((p) => ({
    key: `jobs:${p.geo}:${p.remote ? "remote" : "any"}`,
    label: p.label,
    href: jobSearchUrl(query, p.geo, { hours: 24, remote: p.remote }),
  }));
  const opens = await linkOpens(links.map((l) => l.key));
  return links.map((l) => ({ ...l, openedAt: opens[l.key] ?? null }));
}

async function load(tracker: boolean): Promise<{
  jobs: Job[];
  sources: JobSource[];
  links: DeepLink[];
  tried: Set<string>;
  loadError: string | null;
  /** Taken once on the server, so "New" badges and date filters agree with hydration. */
  now: number;
}> {
  const now = Date.now();
  try {
    const [jobs, sources, profile, tried] = await Promise.all([
      tracker ? listTrackedJobs() : listOpenJobs(),
      listJobSources(),
      getJobProfile(),
      tracker ? new Set<string>() : triedJobIds(),
    ]);
    // The links are a convenience: a failure there doesn't hide the jobs.
    const links = tracker ? [] : await searchLinks(profile).catch(() => []);
    return { jobs, sources, links, tried, loadError: null, now };
  } catch (err) {
    return { jobs: [], sources: [], links: [], tried: new Set<string>(), loadError: err instanceof Error ? err.message : String(err), now };
  }
}
