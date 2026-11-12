import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { SetupNotice } from "@/components/setup-notice";
import { StudyChanges } from "@/components/study-changes";
import { StudyDocuments } from "@/components/study-documents";
import { StudyOverview } from "@/components/study-overview";
import { StudyPrograms } from "@/components/study-programs";
import { StudyTracker, type TrackedRow } from "@/components/study-tracker";
import { CATALOG_AS_OF, PROGRAMS, programById } from "@/lib/study/catalog";
import { targetYears } from "@/lib/study/windows";
import { listDocumentStates, listProgramChanges, listProgramChecks, listTrackedPrograms } from "@/lib/study/queries";
import type { CheckSummary, ProgramChange, StudyStage } from "@/lib/study/types";
import { supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const VIEWS = [
  { view: "programs", label: "Programs" },
  { view: "following", label: "Following" },
  { view: "documents", label: "Documents" },
  { view: "changes", label: "Changes" },
] as const;
type View = (typeof VIEWS)[number]["view"];
// The Changes tab counts what moved in the last fortnight.
const RECENT_DAYS = 14;
// Enough of a page's own words for the details panel, without shipping every snippet of every page to the browser.
const SNIPPETS_PER_CARD = 4;

export default async function StudyPage({ searchParams }: PageProps<"/study">) {
  const raw = (await searchParams).view;
  const view: View = VIEWS.some((v) => v.view === raw) ? (raw as View) : "programs";
  if (!supabaseConfigured()) return <SetupNotice />;
  const { rows, done, checks, changes, loadError, now } = await load();
  const stages = Object.fromEntries(rows.map((r) => [r.program.id, r.tracked.stage])) as Record<string, StudyStage>;
  const universities = new Set(PROGRAMS.map((p) => p.university)).size;
  const states = new Set(PROGRAMS.map((p) => p.state).filter(Boolean)).size;
  const years = targetYears(new Date(now));
  const recentChanges = changes.filter((c) => now - Date.parse(c.detected_at) < RECENT_DAYS * 86_400_000).length;

  return (
    <>
      <PageHeader title="Study in Germany" eyebrow="Study">
        {PROGRAMS.length} English-taught Master&rsquo;s programs at {universities} universities in all {states} states,
        with summer {years.summer} and winter {years.winter} windows for non-EU applicants. Open, closed and days left
        are worked out from today&rsquo;s date. The catalog was built on {CATALOG_AS_OF}, and each program&rsquo;s
        official page is read again every week (daily for the ones you follow) to catch moved dates.
      </PageHeader>

      {loadError ? (
        <p className="notice notice-danger" role="alert">
          <TriangleAlert aria-hidden />
          <span>
            Couldn&rsquo;t load your study tracker ({loadError}). If the tables are missing, run{" "}
            <code>node --env-file=.env.local scripts/migrate.mjs</code>.
          </span>
        </p>
      ) : (
        <div className="stack">
          <nav className="seg" aria-label="View" style={{ justifySelf: "start" }}>
            {VIEWS.map((v) => (
              <Link key={v.view} href={v.view === "programs" ? "/study" : `/study?view=${v.view}`} aria-current={view === v.view ? "page" : undefined}>
                {v.label}
                {v.view === "following" && rows.length > 0 && <span className="seg-count">{rows.length}</span>}
                {v.view === "changes" && recentChanges > 0 && <span className="seg-count">{recentChanges}</span>}
              </Link>
            ))}
          </nav>
          {view === "programs" && (
            <>
              <StudyOverview programs={PROGRAMS} stages={stages} docsDone={done.length} now={now} />
              <StudyPrograms programs={PROGRAMS} stages={stages} checks={checks} now={now} />
            </>
          )}
          {view === "following" && <StudyTracker rows={rows} now={now} />}
          {view === "documents" && <StudyDocuments done={done} />}
          {view === "changes" && <StudyChanges changes={changes} checks={checks} followed={new Set(Object.keys(stages))} />}
        </div>
      )}
    </>
  );
}

async function load(): Promise<{
  rows: TrackedRow[];
  done: string[];
  checks: Record<string, CheckSummary>;
  changes: ProgramChange[];
  loadError: string | null;
  /** Taken once on the server, so day counts agree between the render and hydration. */
  now: number;
}> {
  const now = Date.now();
  try {
    const [tracked, docs, checkRows, changes] = await Promise.all([
      listTrackedPrograms(),
      listDocumentStates(),
      listProgramChecks(),
      listProgramChanges(),
    ]);
    const checks: Record<string, CheckSummary> = Object.fromEntries(
      checkRows.map(({ signals, snippets, ...c }) => [
        c.program_id,
        { ...c, dates: signals.filter((s) => s.startsWith("date:")), snippets: snippets.slice(0, SNIPPETS_PER_CARD) },
      ]),
    );
    // A program dropped from a regenerated catalog leaves its row behind; skip it rather than crash.
    const rows = tracked.flatMap((t) => {
      const program = programById(t.program_id);
      return program ? [{ tracked: t, program, check: checks[t.program_id] }] : [];
    });
    return { rows, done: docs.filter((d) => d.done).map((d) => d.key), checks, changes, loadError: null, now };
  } catch (err) {
    return { rows: [], done: [], checks: {}, changes: [], loadError: err instanceof Error ? err.message : String(err), now };
  }
}
