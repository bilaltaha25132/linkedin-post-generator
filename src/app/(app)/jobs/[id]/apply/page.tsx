import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList, FileText, Mail, Send, TriangleAlert } from "lucide-react";

import { FormStep, LetterStep, ResumeStep, SubmitStep } from "@/components/apply-tools";
import { PageHeader } from "@/components/page-header";
import { SetupNotice } from "@/components/setup-notice";
import { letterStyle } from "@/lib/apply/answers";
import { detectAts } from "@/lib/apply/forms";
import { getApplication, getJob, getLedger, latestVersion } from "@/lib/apply/queries";
import { payText, whereText } from "@/lib/jobs/format";
import { supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
// Tailoring and drafting are long writer calls.
export const maxDuration = 120;

const LETTER_NOTE: Record<string, string> = {
  gulf: "Gulf employers expect a short cover email, not a full letter.",
  germany: "German employers usually expect an Anschreiben. Write it in English unless the ad is in German.",
  netherlands: "Dutch employers often ask for a motivation letter: why this company, said directly.",
  default: "Often optional here. Worth sending when the form has a box for it.",
};

export default async function ApplyPage({ params }: PageProps<"/jobs/[id]/apply">) {
  const { id } = await params;
  if (!supabaseConfigured()) return <SetupNotice />;

  const data = await load(id);
  if (data && "missing" in data) notFound();

  return (
    <>
      <PageHeader title={data && !("error" in data) ? data.job.title : "Apply kit"} eyebrow="Apply kit">
        {data && !("error" in data) ? (
          <>
            {data.job.company}, {whereText(data.job)}
            {payText(data.job) ? `, ${payText(data.job)}` : ""}. <Link className="link" href={`/jobs#job-${id}`}>Back to jobs</Link>
          </>
        ) : null}
      </PageHeader>

      {!data || "error" in data ? (
        <p className="notice notice-danger" role="alert">
          <TriangleAlert aria-hidden />
          <span>
            Couldn&rsquo;t load this application ({data?.error}). If the tables are missing, run{" "}
            <code>node --env-file=.env.local scripts/migrate.mjs</code>.
          </span>
        </p>
      ) : (
        <div className="stack">
          {!data.hasLedger && data.hasMaster === false && (
            <p className="notice" role="status">
              <TriangleAlert aria-hidden />
              <span>
                Until you add your resume, answers and letters are drafted from your short bio. Add it on the{" "}
                <Link className="link" href="/resume">
                  Resume page
                </Link>{" "}
                for answers built on your real bullets.
              </span>
            </p>
          )}

          <Step icon={FileText} n={1} title="Resume" id="resume">
            <ResumeStep jobId={id} hasMaster={data.hasMaster} initial={data.version} />
          </Step>

          <Step icon={ClipboardList} n={2} title="Application form" id="form">
            <FormStep
              jobId={id}
              canRead={data.canRead}
              initialAnswers={data.application?.answers ?? []}
              initialNotices={data.application?.form?.notices ?? []}
            />
          </Step>

          <Step icon={Mail} n={3} title="Cover letter" id="letter">
            <LetterStep jobId={id} initial={data.application?.cover_letter ?? null} style={LETTER_NOTE[data.letter]} />
          </Step>

          <Step icon={Send} n={4} title="Submit" id="submit">
            <SubmitStep jobId={id} submittedAt={data.application?.submitted_at ?? null} applyUrl={data.job.url_apply} />
          </Step>
        </div>
      )}
    </>
  );
}

function Step({
  icon: Icon,
  n,
  title,
  id,
  children,
}: {
  icon: typeof FileText;
  n: number;
  title: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel stack-sm reveal" aria-labelledby={`${id}-heading`}>
      <div className="panel-head" style={{ marginBottom: 0 }}>
        <span className="panel-icon">
          <Icon aria-hidden />
        </span>
        <h2 id={`${id}-heading`}>
          <span className="muted">{n}.</span> {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

async function load(id: string) {
  try {
    const job = await getJob(id);
    if (!job) return { missing: true as const };
    const [ledger, version, application] = await Promise.all([getLedger(), latestVersion(id), getApplication(id)]);
    return {
      job,
      hasMaster: Boolean(ledger.master),
      hasLedger: ledger.roles.length > 0,
      version,
      application,
      canRead: detectAts(job) !== null,
      letter: letterStyle(job),
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
