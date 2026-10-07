import "server-only";

import type { Application, CandidateProfile, Ledger, ResumeVersion } from "@/lib/apply/types";
import type { Job } from "@/lib/jobs/types";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function getLedger(): Promise<Ledger> {
  const db = supabaseAdmin();
  const [master, roles, bullets, skills] = await Promise.all([
    db.from("resume_master").select("latex,updated_at").eq("id", 1).maybeSingle(),
    db.from("ledger_roles").select("*").order("sort"),
    db.from("ledger_bullets").select("*").order("sort"),
    db.from("ledger_skills").select("*").order("sort"),
  ]);
  for (const r of [master, roles, bullets, skills]) if (r.error) throw new Error(r.error.message);
  return {
    master: master.data ?? null,
    roles: roles.data ?? [],
    bullets: bullets.data ?? [],
    skills: skills.data ?? [],
  };
}

export const EMPTY_PROFILE: CandidateProfile = {
  contact: {},
  links: {},
  notice_weeks: null,
  years_experience: null,
  salary: {},
  languages: [],
  work_auth: {},
  relocate: {},
};

export async function getCandidateProfile(): Promise<CandidateProfile> {
  const { data, error } = await supabaseAdmin().from("candidate_profile").select("*").eq("id", 1).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { ...EMPTY_PROFILE, ...data } : EMPTY_PROFILE;
}

export async function getJob(id: string): Promise<(Job & { description: string | null; source_token: string | null }) | null> {
  const { data, error } = await supabaseAdmin()
    .from("jobs")
    .select("*, job_sources(token)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const { job_sources, ...job } = data as Record<string, unknown> & { job_sources: { token: string } | null };
  // The embedding is large and the page never needs it.
  delete job.embedding;
  return { ...(job as unknown as Job & { description: string | null }), source_token: job_sources?.token ?? null };
}

export async function latestVersion(jobId: string): Promise<ResumeVersion | null> {
  const { data, error } = await supabaseAdmin()
    .from("resume_versions")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getApplication(jobId: string): Promise<Application | null> {
  const { data, error } = await supabaseAdmin().from("applications").select("*").eq("job_id", jobId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { ...data, answers: Array.isArray(data.answers) ? data.answers : [] } : null;
}
