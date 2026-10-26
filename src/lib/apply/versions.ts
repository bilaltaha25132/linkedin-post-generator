import "server-only";

import { parseResume } from "@/lib/apply/latex";
import { getJob, getLedger } from "@/lib/apply/queries";
import { renderTailored } from "@/lib/apply/render";
import { planTailoring } from "@/lib/apply/tailor";
import type { ResumeVersion } from "@/lib/apply/types";
import { fetchDescription } from "@/lib/jobs/sources";
import { supabaseAdmin } from "@/lib/supabase/server";

/** The job and its ad text, fetching the ad from its source when it wasn't stored. */
export async function jobAd(jobId: string) {
  const job = await getJob(jobId);
  if (!job) throw new Error("That job is gone.");
  let description = job.description;
  if (!description && job.source_id.includes(":")) description = await fetchDescription(job.source, job.source_id).catch(() => null);
  return { job, ad: { title: job.title, company: job.company, description } };
}

/**
 * A resume tailored to one job, saved as a new version. The Apply page leaves it
 * for his review; the agent accepts it as tailored, every edit checked against
 * his ledger by renderTailored, and attaches it to the form.
 */
export async function createTailoredVersion(jobId: string, { accept = false } = {}): Promise<ResumeVersion> {
  const [{ ad }, ledger] = await Promise.all([jobAd(jobId), getLedger()]);
  if (!ledger.master) throw new Error("Add your master resume on the Resume page first.");
  const summary = parseResume(ledger.master.latex).summary?.plain ?? null;
  const plan = await planTailoring(ledger, ad, summary);
  const { latex, report } = renderTailored(ledger, plan);
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("resume_versions")
    .insert({ job_id: jobId, plan, checks: report, latex, accepted_at: accept ? new Date().toISOString() : null })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  if (accept) {
    await db.from("applications").upsert({ job_id: jobId, resume_version_id: data.id, updated_at: new Date().toISOString() }, { onConflict: "job_id" });
  }
  return data as ResumeVersion;
}
