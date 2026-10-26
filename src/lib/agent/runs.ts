import "server-only";

import { z } from "zod";

import { markSubmitted } from "@/lib/apply/actions";
import { getJob } from "@/lib/apply/queries";
import { chatJSON } from "@/lib/llm/client";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * The record of each job the browser agent works on. The extension opens a run
 * when it starts on a job and closes it when the run ends; the Applications tab
 * reads them back. A run that reaches "submitted" moves the job to Applied,
 * the same as his own "I submitted".
 */

export const RUN_STATUSES = ["running", "submitted", "ready", "needs_you", "stopped", "failed", "done"] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

export interface AgentRun {
  id: string;
  job_id: string | null;
  status: RunStatus;
  auto_submit: boolean;
  steps: number;
  start_url: string | null;
  final_url: string | null;
  summary: string | null;
  blocker: string | null;
  fields: { label: string; value: string }[];
  company_summary: string | null;
  role_summary: string | null;
  started_at: string;
  finished_at: string | null;
  job: { id: string; title: string; company: string; url_apply: string; location_raw: string | null } | null;
}

export const startRunSchema = z.object({
  jobId: z.string().uuid().nullable(),
  autoSubmit: z.boolean(),
  url: z.string().max(2000).optional(),
});

export const updateRunSchema = z.object({
  status: z.enum(RUN_STATUSES).optional(),
  steps: z.number().int().min(0).max(1000).optional(),
  url: z.string().max(2000).optional(),
  summary: z.string().max(4000).optional(),
  blocker: z.string().max(1200).optional(),
  fields: z.array(z.object({ label: z.string().max(300), value: z.string().max(2000) })).max(120).optional(),
});

export async function startRun(input: z.infer<typeof startRunSchema>): Promise<string> {
  const { data, error } = await supabaseAdmin()
    .from("agent_runs")
    .insert({ job_id: input.jobId, auto_submit: input.autoSubmit, start_url: input.url ?? null })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

/** Applies the extension's update. Reaching "submitted" records the application. */
export async function updateRun(id: string, input: z.infer<typeof updateRunSchema>): Promise<void> {
  const db = supabaseAdmin();
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { updated_at: now };
  if (input.status) patch.status = input.status;
  if (input.status && input.status !== "running") patch.finished_at = now;
  if (input.steps !== undefined) patch.steps = input.steps;
  if (input.url) patch.final_url = input.url;
  if (input.summary !== undefined) patch.summary = input.summary;
  if (input.blocker !== undefined) patch.blocker = input.blocker;
  if (input.fields) patch.fields = input.fields;
  const { data, error } = await db.from("agent_runs").update(patch).eq("id", id).select("job_id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No such run.");
  if (input.status === "submitted" && data.job_id) {
    const marked = await markSubmitted(data.job_id);
    if (!marked.ok) throw new Error(marked.error);
  }
}

const summarySchema = z.object({ company: z.string().min(1).max(700), role: z.string().min(1).max(900) });

/**
 * A short read on the company and the work, from the job ad alone, so the
 * Applications tab says what each application was for. Never fatal: a run
 * without a summary still shows.
 */
export async function summarizeRun(id: string, jobId: string): Promise<void> {
  const job = await getJob(jobId);
  if (!job) return;
  const ad = (job.description ?? "").replace(/\s+/g, " ").trim().slice(0, 9000);
  const result = await chatJSON({
    system: `You summarise a job ad for the candidate's own records. Use only what the ad says; if it says nothing about something, leave it out rather than guess. Plain English, no hype, no dashes as punctuation.`,
    user: `Job: ${job.title} at ${job.company}${job.location_raw ? ` (${job.location_raw})` : ""}

AD TEXT
${ad || "(the ad text wasn't saved: say only what the title and company tell you, and say the ad text is missing)"}

Reply with ONLY a JSON object:
{"company":"2 or 3 sentences: what the company does, who for, and anything notable the ad says about it","role":"2 to 4 sentences: what the person in this role will actually work on, the main stack, and the seniority or must-haves"}`,
    schema: summarySchema,
    role: "utility",
    temperature: 0.2,
    maxTokens: 600,
    op: "agent-run-summary",
  });
  const { error } = await supabaseAdmin()
    .from("agent_runs")
    .update({ company_summary: result.company, role_summary: result.role })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** Every run, newest first, with its job, for the Applications tab. */
export async function listRuns(limit = 200): Promise<AgentRun[]> {
  const { data, error } = await supabaseAdmin()
    .from("agent_runs")
    .select("*, job:jobs(id, title, company, url_apply, location_raw)")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ ...r, fields: Array.isArray(r.fields) ? r.fields : [] })) as AgentRun[];
}
