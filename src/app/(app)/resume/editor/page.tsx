import { TriangleAlert } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { ResumeEditor } from "@/components/resume-editor";
import { SetupNotice } from "@/components/setup-notice";
import { getLedger, getVersionLatex, listVersionFiles } from "@/lib/apply/queries";
import { supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ResumeEditorPage({ searchParams }: { searchParams: Promise<{ v?: string | string[] }> }) {
  const { v } = await searchParams;
  const versionId = typeof v === "string" && UUID.test(v) ? v : null;
  const data = supabaseConfigured() ? await load(versionId) : null;

  return (
    <>
      <PageHeader title="Resume editor" eyebrow="Career">
        Your resume as the page will look. Click any line to change it, or open the code beside it. Nothing compiles until you press Download PDF.
      </PageHeader>

      {!data ? (
        <SetupNotice />
      ) : "error" in data ? (
        <p className="notice notice-danger" role="alert">
          <TriangleAlert aria-hidden />
          <span>Couldn&rsquo;t load the resume ({data.error}).</span>
        </p>
      ) : !data.latex ? (
        <p className="notice">
          <span>
            {versionId ? "That tailored version is gone." : "No master resume yet."} Paste your .tex on the{" "}
            <a className="link" href="/resume">
              Resume page
            </a>{" "}
            first.
          </span>
        </p>
      ) : (
        <ResumeEditor
          key={versionId ?? "master"}
          initial={data.latex}
          versionId={versionId}
          files={data.files}
          name={versionId ? `resume-${data.files.find((f) => f.id === versionId)?.company ?? "tailored"}` : "resume"}
        />
      )}
    </>
  );
}

async function load(versionId: string | null) {
  try {
    const [latex, files] = await Promise.all([
      versionId ? getVersionLatex(versionId) : getLedger().then((l) => l.master?.latex ?? null),
      listVersionFiles(),
    ]);
    return { latex, files };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
