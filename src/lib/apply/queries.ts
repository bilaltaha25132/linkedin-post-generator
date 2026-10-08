import "server-only";

import { detectAts, type FormTarget } from "@/lib/apply/forms";
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

export interface VersionFile {
  id: string;
  created_at: string;
  accepted_at: string | null;
  company: string;
  title: string;
}

/** Recent tailored versions for the resume editor's file list, newest first. */
export async function listVersionFiles(limit = 30): Promise<VersionFile[]> {
  const { data, error } = await supabaseAdmin()
    .from("resume_versions")
    .select("id, created_at, accepted_at, jobs(company, title)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((v) => {
    const job = v.jobs as unknown as { company: string; title: string } | null;
    return { id: v.id, created_at: v.created_at, accepted_at: v.accepted_at, company: job?.company ?? "Job", title: job?.title ?? "" };
  });
}

export async function getVersionLatex(id: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin().from("resume_versions").select("latex").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.latex ?? null;
}

export async function getApplication(jobId: string): Promise<Application | null> {
  const { data, error } = await supabaseAdmin().from("applications").select("*").eq("job_id", jobId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { ...data, answers: Array.isArray(data.answers) ? data.answers : [] } : null;
}

export interface AgentJob {
  id: string;
  title: string;
  company: string;
  url_apply?: string;
}

/** The job a page belongs to: by its ATS form id, else by the apply link itself. */
export async function findJobForPage(url: string): Promise<AgentJob | null> {
  const target = detectAts({ url_apply: url, source: "", source_id: "", source_token: null });
  if (target) {
    const job = await findJobForForm(target);
    if (job) return job;
  }
  const u = new URL(url);
  const path = `${u.hostname}${u.pathname}`.replace(/\/+$/, "").replace(/[%_]/g, "");
  if (path.length < 12) return null;
  const { data, error } = await supabaseAdmin().from("jobs").select("id, title, company").ilike("url_apply", `%${path}%`).limit(1);
  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}

/** Jobs he has started an application for, newest first, for the agent's job picker. */
export async function listApplyingJobs(limit = 20): Promise<AgentJob[]> {
  const { data, error } = await supabaseAdmin()
    .from("applications")
    .select("updated_at, status, jobs(id, title, company, url_apply)")
    .eq("status", "draft")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).flatMap((r) => {
    const j = r.jobs as unknown as AgentJob | null;
    return j ? [{ id: j.id, title: j.title, company: j.company, url_apply: j.url_apply }] : [];
  });
}

/** The job whose application form is at this target, for the extension. */
export async function findJobForForm(target: FormTarget): Promise<{ id: string; title: string; company: string } | null> {
  const { data, error } = await supabaseAdmin()
    .from("jobs")
    .select("id, title, company, url_apply, source, source_id, job_sources(token)")
    .ilike("url_apply", `%${target.id.replace(/[%_]/g, "")}%`)
    .limit(20);
  if (error) throw new Error(error.message);
  for (const row of (data ?? []) as unknown as {
    id: string;
    title: string;
    company: string;
    url_apply: string;
    source: string;
    source_id: string;
    job_sources: { token: string } | null;
  }[]) {
    const t = detectAts({ ...row, source_token: row.job_sources?.token ?? null });
    if (t && t.ats === target.ats && t.id === target.id) return { id: row.id, title: row.title, company: row.company };
  }
  return null;
}
