import "server-only";

import type { Job, JobProfile, JobSource } from "@/lib/jobs/types";
import { supabaseAdmin } from "@/lib/supabase/server";

const JOB_COLUMNS =
  "id,source,source_id,source_credit,company,title,location_raw,countries,region,remote_scope,employment_type,is_contract,pay_min,pay_max,currency,pay_period,url_apply,url_source,posted_at,first_seen_at,closed_at,visa_flag,score,score_detail,status";

export async function getJobProfile(): Promise<JobProfile> {
  const { data, error } = await supabaseAdmin()
    .from("job_profile")
    .select("titles,must_have,nice_to_have,regions,min_pay_usd,seniority,dealbreakers,summary")
    .eq("id", 1)
    .single();
  if (error) throw new Error(error.message);
  return data as JobProfile;
}

/** Open roles for the Matches view, best first. Unscored ones wait at the end. */
export async function listOpenJobs(): Promise<Job[]> {
  const { data, error } = await supabaseAdmin()
    .from("jobs")
    .select(JOB_COLUMNS)
    .is("closed_at", null)
    .in("status", ["new", "saved"])
    .order("score", { ascending: false, nullsFirst: false })
    .order("first_seen_at", { ascending: false })
    .limit(600);
  if (error) throw new Error(error.message);
  return data as Job[];
}

/** Everything he has acted on, closed or not, for the tracker. */
export async function listTrackedJobs(): Promise<Job[]> {
  const { data, error } = await supabaseAdmin()
    .from("jobs")
    .select(JOB_COLUMNS)
    .in("status", ["applied", "interviewing", "offer", "closed"])
    .order("first_seen_at", { ascending: false })
    .limit(300);
  if (error) throw new Error(error.message);
  return data as Job[];
}

export async function listJobSources(): Promise<JobSource[]> {
  const { data, error } = await supabaseAdmin()
    .from("job_sources")
    .select("*")
    .order("kind")
    .order("name");
  if (error) throw new Error(error.message);
  return data as JobSource[];
}
