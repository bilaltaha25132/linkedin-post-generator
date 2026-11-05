import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { SetupNotice } from "@/components/setup-notice";
import { StudyDocuments } from "@/components/study-documents";
import { StudyPrograms } from "@/components/study-programs";
import { StudyTracker, type TrackedRow } from "@/components/study-tracker";
import { CATALOG_AS_OF, PROGRAMS, programById } from "@/lib/study/catalog";
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
  const { rows, done, loadError } = await load();
  const stages = Object.fromEntries(rows.map((r) => [r.program.id, r.tracked.stage])) as Record<string, StudyStage>;
  const universities = new Set(PROGRAMS.map((p) => p.university)).size;

  return (
    <>
      <PageHeader title="Study in Germany" eyebrow="Study">
        {PROGRAMS.length} English-taught Master&rsquo;s programs at {universities} universities, mostly public, with
        summer 2027 and winter windows for non-EU applicants. Dates were read on {CATALOG_AS_OF}; check the official
        page before you apply.
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
          {view === "programs" && <StudyPrograms programs={PROGRAMS} stages={stages} />}
          {view === "following" && <StudyTracker rows={rows} />}
          {view === "documents" && <StudyDocuments done={done} />}
        </div>
      )}
    </>
  );
}

async function load(): Promise<{ rows: TrackedRow[]; done: string[]; loadError: string | null }> {
  try {
    const [tracked, docs] = await Promise.all([listTrackedPrograms(), listDocumentStates()]);
    // A program dropped from a regenerated catalog leaves its row behind; skip it rather than crash.
    const rows = tracked.flatMap((t) => {
      const program = programById(t.program_id);
      return program ? [{ tracked: t, program }] : [];
    });
    return { rows, done: docs.filter((d) => d.done).map((d) => d.key), loadError: null };
  } catch (err) {
    return { rows: [], done: [], loadError: err instanceof Error ? err.message : String(err) };
  }
}
