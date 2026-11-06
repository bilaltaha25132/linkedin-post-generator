import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { SetupNotice } from "@/components/setup-notice";
import { StudyDocuments } from "@/components/study-documents";
import { StudyOverview } from "@/components/study-overview";
import { StudyPrograms } from "@/components/study-programs";
import { StudyTracker, type TrackedRow } from "@/components/study-tracker";
import { CATALOG_AS_OF, PROGRAMS, programById } from "@/lib/study/catalog";
import { targetYears } from "@/lib/study/windows";
import { listDocumentStates, listTrackedPrograms } from "@/lib/study/queries";
import type { StudyStage } from "@/lib/study/types";
import { supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const VIEWS = [
  { view: "programs", label: "Programs" },
  { view: "following", label: "Following" },
  { view: "documents", label: "Documents" },
] as const;
type View = (typeof VIEWS)[number]["view"];

export default async function StudyPage({ searchParams }: PageProps<"/study">) {
  const raw = (await searchParams).view;
  const view: View = VIEWS.some((v) => v.view === raw) ? (raw as View) : "programs";
  if (!supabaseConfigured()) return <SetupNotice />;
  const { rows, done, loadError, now } = await load();
  const stages = Object.fromEntries(rows.map((r) => [r.program.id, r.tracked.stage])) as Record<string, StudyStage>;
  const universities = new Set(PROGRAMS.map((p) => p.university)).size;
  const states = new Set(PROGRAMS.map((p) => p.state).filter(Boolean)).size;
  const years = targetYears(new Date(now));

  return (
    <>
      <PageHeader title="Study in Germany" eyebrow="Study">
        {PROGRAMS.length} English-taught Master&rsquo;s programs at {universities} universities in all {states} states,
        with summer {years.summer} and winter {years.winter} windows for non-EU applicants. Open, closed and days left
        are worked out from today&rsquo;s date; the dates themselves were read on {CATALOG_AS_OF}, so check the
        official page before you apply.
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
              </Link>
            ))}
          </nav>
          {view === "programs" && (
            <>
              <StudyOverview programs={PROGRAMS} stages={stages} docsDone={done.length} now={now} />
              <StudyPrograms programs={PROGRAMS} stages={stages} now={now} />
            </>
          )}
          {view === "following" && <StudyTracker rows={rows} now={now} />}
          {view === "documents" && <StudyDocuments done={done} />}
        </div>
      )}
    </>
  );
}

async function load(): Promise<{
  rows: TrackedRow[];
  done: string[];
  loadError: string | null;
  /** Taken once on the server, so day counts agree between the render and hydration. */
  now: number;
}> {
  const now = Date.now();
  try {
    const [tracked, docs] = await Promise.all([listTrackedPrograms(), listDocumentStates()]);
    // A program dropped from a regenerated catalog leaves its row behind; skip it rather than crash.
    const rows = tracked.flatMap((t) => {
      const program = programById(t.program_id);
      return program ? [{ tracked: t, program }] : [];
    });
    return { rows, done: docs.filter((d) => d.done).map((d) => d.key), loadError: null, now };
  } catch (err) {
    return { rows: [], done: [], loadError: err instanceof Error ? err.message : String(err), now };
  }
}
