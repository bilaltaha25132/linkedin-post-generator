"use server";

import { revalidatePath } from "next/cache";

import { attempt, type ActionResult } from "@/lib/action-result";
import { runJobs, type JobsRunResult } from "@/lib/jobs/run";
import { PULLERS } from "@/lib/jobs/sources";
import type { JobProfile, JobSource, JobStatus } from "@/lib/jobs/types";
import { supabaseAdmin } from "@/lib/supabase/server";

const STATUSES: JobStatus[] = ["new", "saved", "applied", "interviewing", "offer", "closed", "hidden"];
const REGIONS = ["saudi", "gulf", "europe", "remote", "pakistan"];
// Someone is watching the button, so a manual pass is shorter than the cron's.
const MANUAL_BUDGET_MS = 100_000;

export async function setJobStatus(id: string, status: JobStatus): Promise<ActionResult<null>> {
  return attempt(async () => {
    if (!STATUSES.includes(status)) throw new Error(`Unknown status: ${status}`);
    const { error } = await supabaseAdmin().from("jobs").update({ status }).eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/jobs");
    return null;
  });
}

export async function runJobsNow(): Promise<ActionResult<JobsRunResult>> {
  return attempt(async () => {
    const result = await runJobs({ budgetMs: MANUAL_BUDGET_MS });
    revalidatePath("/jobs");
    return result;
  });
}

export async function saveJobProfile(profile: JobProfile): Promise<ActionResult<null>> {
  return attempt(async () => {
    const list = (items: string[]) => [...new Set(items.map((i) => i.trim()).filter(Boolean))].slice(0, 40);
    const regions = list(profile.regions).filter((r) => REGIONS.includes(r));
    if (!profile.summary.trim()) throw new Error("Add a short summary of who you are; every job is scored against it.");
    const { error } = await supabaseAdmin()
      .from("job_profile")
      .update({
        titles: list(profile.titles),
        must_have: list(profile.must_have),
        nice_to_have: list(profile.nice_to_have),
        regions,
        min_pay_usd: profile.min_pay_usd && profile.min_pay_usd > 0 ? Math.round(profile.min_pay_usd) : null,
        seniority: profile.seniority?.trim() || null,
        dealbreakers: list(profile.dealbreakers),
        summary: profile.summary.trim().slice(0, 2000),
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    revalidatePath("/settings");
    return null;
  });
}

/** Score the open, untouched matches again, after the profile changed. */
export async function rescoreJobs(): Promise<ActionResult<{ queued: number }>> {
  return attempt(async () => {
    const { data, error } = await supabaseAdmin()
      .from("jobs")
      .update({ score: null, score_detail: null, scored_at: null })
      .is("closed_at", null)
      .eq("status", "new")
      .select("id");
    if (error) throw new Error(error.message);
    revalidatePath("/jobs");
    return { queued: data.length };
  });
}

// Careers-page URLs and the board each one points at.
const BOARD_PATTERNS: [RegExp, string][] = [
  [/jobs\.ashbyhq\.com\/([^/?#]+)/i, "ashby"],
  [/(?:job-boards|boards)(?:\.eu)?\.greenhouse\.io\/(?:embed\/job_board\?for=)?([^/?#&]+)/i, "greenhouse"],
  [/jobs\.eu\.lever\.co\/([^/?#]+)/i, "lever-eu"],
  [/jobs\.lever\.co\/([^/?#]+)/i, "lever"],
  [/apply\.workable\.com\/([^/?#]+)/i, "workable"],
  [/(?:careers|jobs)\.smartrecruiters\.com\/([^/?#]+)/i, "smartrecruiters"],
  [/([a-z0-9-]+)\.recruitee\.com/i, "recruitee"],
  [/([a-z0-9-]+)\.pinpointhq\.com/i, "pinpoint"],
  [/([a-z0-9-]+)\.jobs\.personio\.(?:de|com)/i, "personio"],
  [/([a-z0-9-]+)\.teamtailor\.com/i, "teamtailor"],
];

/** Add a company from its careers-page URL, after checking its board answers. */
export async function addJobSource(url: string, name: string): Promise<ActionResult<{ jobs: number }>> {
  return attempt(async () => {
    const match = BOARD_PATTERNS.map(([re, kind]) => ({ m: url.trim().match(re), kind })).find((x) => x.m);
    if (!match?.m) {
      throw new Error(
        "That link isn't a board Signal Desk can read. Paste the company's Ashby, Greenhouse, Lever, Workable, SmartRecruiters, Recruitee, Pinpoint, Personio or Teamtailor jobs page.",
      );
    }
    const token = match.kind === "lever-eu" ? `eu:${match.m[1]}` : decodeURIComponent(match.m[1]);
    const kind = match.kind === "lever-eu" ? "lever" : match.kind;
    const source = { kind, token, name: name.trim() || token.replace(/^eu:/, ""), region: null } as JobSource;

    const { jobs } = await PULLERS[kind](source).catch((err: Error) => {
      throw new Error(`The ${kind} board "${token}" didn't answer (${err.message}). Check the link.`);
    });
    const { error } = await supabaseAdmin()
      .from("job_sources")
      .upsert({ kind, token, name: source.name, enabled: true }, { onConflict: "kind,token" });
    if (error) throw new Error(error.message);
    revalidatePath("/jobs");
    return { jobs: jobs.length };
  });
}

export async function setJobSourceEnabled(id: string, enabled: boolean): Promise<ActionResult<null>> {
  return attempt(async () => {
    const { error } = await supabaseAdmin().from("job_sources").update({ enabled }).eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/jobs");
    return null;
  });
}
