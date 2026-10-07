"use server";

import { revalidatePath } from "next/cache";

import { attempt, type ActionResult } from "@/lib/action-result";
import { draftAnswers, draftCoverLetter, rememberAnswers } from "@/lib/apply/answers";
import { techTerms } from "@/lib/apply/check";
import { detectAts, formFromQuestions, readForm, type ApplicationForm } from "@/lib/apply/forms";
import { extractNumbers, parseResume, toPlain } from "@/lib/apply/latex";
import { getApplication, getCandidateProfile, getJob, getLedger, latestVersion } from "@/lib/apply/queries";
import { renderTailored } from "@/lib/apply/render";
import { planTailoring } from "@/lib/apply/tailor";
import type { Answer, CandidateProfile, ResumeVersion, VersionReport } from "@/lib/apply/types";
import { fetchDescription } from "@/lib/jobs/sources";
import { supabaseAdmin } from "@/lib/supabase/server";

const MAX_LATEX = 200_000;

/** Saves the master resume and rebuilds the ledger from it. Facts he added stay. */
export async function saveMasterResume(latex: string): Promise<ActionResult<{ roles: number; bullets: number; skills: number }>> {
  return attempt(async () => {
    if (latex.length > MAX_LATEX) throw new Error("That's longer than any resume; paste the .tex source only.");
    if (!/\\begin\{document\}/.test(latex)) throw new Error("Paste the whole .tex file, from \\documentclass to \\end{document}.");
    const parsed = parseResume(latex);
    if (!parsed.roles.length) {
      throw new Error("Couldn't find any roles. The parser reads \\resumeSubheading and \\resumeItem (Jake's Resume and its forks).");
    }
    const db = supabaseAdmin();
    const now = new Date().toISOString();
    const saved = await db
      .from("resume_master")
      .upsert({ id: 1, latex, template: /\\resumeSubheading/.test(latex) ? "jake" : "other", parsed_at: now, updated_at: now });
    if (saved.error) throw new Error(saved.error.message);

    // Added facts hang off roles; keep them by re-pointing at the same employer and title.
    const old = await db.from("ledger_roles").select("id,employer,title");
    const added = await db.from("ledger_bullets").select("*").eq("origin", "added");
    const roleKey = (r: { employer: string; title: string }) => `${r.employer}|${r.title}`.toLowerCase();
    const oldKey = new Map((old.data ?? []).map((r) => [r.id, roleKey(r)]));

    await db.from("ledger_bullets").delete().eq("origin", "resume");
    await db.from("ledger_skills").delete().eq("origin", "resume");
    await db.from("ledger_roles").delete().not("id", "is", null);

    const roles = await db
      .from("ledger_roles")
      .insert(
        parsed.roles.map((r, i) => ({
          section: r.section,
          employer: r.employer,
          title: r.title,
          start_date: r.startDate,
          end_date: r.endDate,
          location: r.location,
          sort: i,
        })),
      )
      .select("id,employer,title,sort");
    if (roles.error) throw new Error(roles.error.message);
    const roleIds = [...roles.data].sort((a, b) => a.sort - b.sort).map((r) => r.id);
    const newByKey = new Map(roles.data.map((r) => [roleKey(r), r.id]));

    const bullets = parsed.roles.flatMap((r, i) =>
      r.bullets.map((b, j) => ({
        role_id: roleIds[i],
        section: r.section,
        latex: b.latex,
        plain: b.plain,
        numbers: extractNumbers(b.plain),
        skills: techTerms(b.plain),
        origin: "resume",
        src_start: b.start,
        src_end: b.end,
        sort: j,
      })),
    );
    if (bullets.length) {
      const res = await db.from("ledger_bullets").insert(bullets);
      if (res.error) throw new Error(res.error.message);
    }
    // Deleting the roles cascaded away the facts tied to them; put those back on the matching role.
    const orphaned = (added.data ?? []).filter((b) => b.role_id);
    if (orphaned.length) {
      const back = orphaned.map((b) => ({
        section: b.section,
        latex: b.latex,
        plain: b.plain,
        numbers: b.numbers,
        skills: b.skills,
        origin: b.origin,
        sort: b.sort,
        role_id: b.role_id ? (newByKey.get(oldKey.get(b.role_id) ?? "") ?? null) : null,
      }));
      await db.from("ledger_bullets").insert(back);
    }

    const skills = parsed.skills.flatMap((line) =>
      line.items.map((item) => ({ name: toPlain(item), category: line.category, origin: "resume" })),
    );
    const unique = [...new Map(skills.map((s, i) => [s.name.toLowerCase(), { ...s, sort: i }])).values()];
    if (unique.length) {
      const res = await db.from("ledger_skills").upsert(unique, { onConflict: "name" });
      if (res.error) throw new Error(res.error.message);
    }
    revalidatePath("/resume");
    return { roles: parsed.roles.length, bullets: bullets.length, skills: unique.length };
  });
}

/** A true fact the resume leaves out, usable in tailoring and answers. */
export async function addFact(input: { roleId: string | null; text: string; skill?: boolean }): Promise<ActionResult<null>> {
  return attempt(async () => {
    const text = input.text.trim();
    if (text.length < 2) throw new Error("Write the fact first.");
    const db = supabaseAdmin();
    if (input.skill) {
      const names = text.split(",").map((s) => s.trim()).filter(Boolean);
      const res = await db
        .from("ledger_skills")
        .upsert(names.map((name) => ({ name, category: "Added", origin: "added", sort: 1000 })), { onConflict: "name", ignoreDuplicates: true });
      if (res.error) throw new Error(res.error.message);
    } else {
      if (text.length > 400) throw new Error("Keep a fact to one or two sentences.");
      const res = await db.from("ledger_bullets").insert({
        role_id: input.roleId,
        section: "added",
        plain: text,
        numbers: extractNumbers(text),
        skills: techTerms(text),
        origin: "added",
        sort: 1000,
      });
      if (res.error) throw new Error(res.error.message);
    }
    revalidatePath("/resume");
    return null;
  });
}

export async function removeFact(id: string, kind: "bullet" | "skill"): Promise<ActionResult<null>> {
  return attempt(async () => {
    const res = await supabaseAdmin()
      .from(kind === "skill" ? "ledger_skills" : "ledger_bullets")
      .delete()
      .eq("id", id)
      .eq("origin", "added");
    if (res.error) throw new Error(res.error.message);
    revalidatePath("/resume");
    return null;
  });
}

export async function saveCandidateProfile(p: CandidateProfile): Promise<ActionResult<null>> {
  return attempt(async () => {
    const clean = (o: Record<string, string | undefined>) =>
      Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v?.trim()]).filter(([, v]) => v));
    const salary = Object.fromEntries(
      Object.entries(p.salary).filter(([, r]) => r.min !== null || r.max !== null),
    );
    for (const [region, r] of Object.entries(salary)) {
      if (r.min !== null && r.max !== null && r.min > r.max) throw new Error(`The ${region} salary's minimum is above its maximum.`);
    }
    const res = await supabaseAdmin()
      .from("candidate_profile")
      .upsert({
        id: 1,
        contact: clean(p.contact),
        links: clean(p.links),
        notice_weeks: p.notice_weeks,
        years_experience: p.years_experience,
        salary,
        languages: p.languages.filter((l) => l.name.trim()),
        work_auth: p.work_auth,
        relocate: p.relocate,
        updated_at: new Date().toISOString(),
      });
    if (res.error) throw new Error(res.error.message);
    revalidatePath("/resume");
    return null;
  });
}

async function jobAd(jobId: string) {
  const job = await getJob(jobId);
  if (!job) throw new Error("That job is gone.");
  let description = job.description;
  if (!description && job.source_id.includes(":")) description = await fetchDescription(job.source, job.source_id).catch(() => null);
  return { job, ad: { title: job.title, company: job.company, description } };
}

export async function tailorResume(jobId: string): Promise<ActionResult<ResumeVersion>> {
  return attempt(async () => {
    const [{ ad }, ledger] = await Promise.all([jobAd(jobId), getLedger()]);
    if (!ledger.master) throw new Error("Add your master resume on the Resume page first.");
    const summary = parseResume(ledger.master.latex).summary?.plain ?? null;
    const plan = await planTailoring(ledger, ad, summary);
    const { latex, report } = renderTailored(ledger, plan);
    const { data, error } = await supabaseAdmin()
      .from("resume_versions")
      .insert({ job_id: jobId, plan, checks: report, latex })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    revalidatePath(`/jobs/${jobId}/apply`);
    return data as ResumeVersion;
  });
}

/** Re-renders with the edits he kept and marks the version as the one he'll send. */
export async function acceptVersion(
  versionId: string,
  declined: string[],
  useSummary: boolean,
): Promise<ActionResult<{ latex: string; report: VersionReport }>> {
  return attempt(async () => {
    const db = supabaseAdmin();
    const { data: version, error } = await db.from("resume_versions").select("*").eq("id", versionId).single();
    if (error) throw new Error(error.message);
    const { latex, report } = renderTailored(await getLedger(), (version as ResumeVersion).plan, {
      declined: new Set(declined),
      useSummary,
    });
    const res = await db.from("resume_versions").update({ latex, checks: report, accepted_at: new Date().toISOString() }).eq("id", versionId);
    if (res.error) throw new Error(res.error.message);
    await db.from("applications").upsert({ job_id: version.job_id, resume_version_id: versionId, updated_at: new Date().toISOString() }, { onConflict: "job_id" });
    revalidatePath(`/jobs/${version.job_id}/apply`);
    return { latex, report };
  });
}

/** Reads the form (or takes pasted questions) and drafts every answer. */
export async function prepareAnswers(jobId: string, pasted?: string): Promise<ActionResult<{ form: ApplicationForm; answers: Answer[] }>> {
  return attempt(async () => {
    const [{ job, ad }, ledger, profile, existing] = await Promise.all([jobAd(jobId), getLedger(), getCandidateProfile(), getApplication(jobId)]);
    let form: ApplicationForm;
    if (pasted?.trim()) form = formFromQuestions(pasted);
    else {
      const target = detectAts(job);
      if (!target) throw new Error("This form's site isn't one Signal Desk can read. Paste its questions instead.");
      form = await readForm(target);
    }
    if (!form.fields.length) throw new Error("No questions found.");
    const experience = ledger.roles.filter((r) => r.section === "experience");
    const latestRole = experience.find((r) => !r.end_date || /present|current|now/i.test(r.end_date)) ?? experience[0] ?? null;
    const answers = await draftAnswers({
      form,
      job: ad,
      ledger,
      ctx: { profile, latestRole, job, coverLetter: existing?.cover_letter ?? null, now: Date.now() },
    });
    const res = await supabaseAdmin()
      .from("applications")
      .upsert({ job_id: jobId, form, answers, updated_at: new Date().toISOString() }, { onConflict: "job_id" });
    if (res.error) throw new Error(res.error.message);
    revalidatePath(`/jobs/${jobId}/apply`);
    return { form, answers };
  });
}

export async function saveAnswer(jobId: string, key: string, value: string): Promise<ActionResult<null>> {
  return attempt(async () => {
    const app = await getApplication(jobId);
    if (!app) throw new Error("Draft the answers first.");
    const answers = app.answers.map((a) => (a.key === key && a.source !== "you" ? { ...a, value: value.trim() || null } : a));
    const res = await supabaseAdmin().from("applications").update({ answers, updated_at: new Date().toISOString() }).eq("job_id", jobId);
    if (res.error) throw new Error(res.error.message);
    return null;
  });
}

export async function writeCoverLetter(jobId: string): Promise<ActionResult<string>> {
  return attempt(async () => {
    const [{ job, ad }, ledger, profile] = await Promise.all([jobAd(jobId), getLedger(), getCandidateProfile()]);
    const letter = await draftCoverLetter({ job: { ...ad, countries: job.countries, region: job.region, location_raw: job.location_raw }, ledger, profile });
    const res = await supabaseAdmin()
      .from("applications")
      .upsert({ job_id: jobId, cover_letter: letter, updated_at: new Date().toISOString() }, { onConflict: "job_id" });
    if (res.error) throw new Error(res.error.message);
    return letter;
  });
}

export async function saveCoverLetter(jobId: string, letter: string): Promise<ActionResult<null>> {
  return attempt(async () => {
    const res = await supabaseAdmin()
      .from("applications")
      .upsert({ job_id: jobId, cover_letter: letter.trim() || null, updated_at: new Date().toISOString() }, { onConflict: "job_id" });
    if (res.error) throw new Error(res.error.message);
    return null;
  });
}

/** He pressed Submit on the employer's site. Records what went and moves the job to Applied. */
export async function markSubmitted(jobId: string): Promise<ActionResult<null>> {
  return attempt(async () => {
    const db = supabaseAdmin();
    const [app, version] = await Promise.all([getApplication(jobId), latestVersion(jobId)]);
    const now = new Date().toISOString();
    const res = await db.from("applications").upsert(
      {
        job_id: jobId,
        status: "submitted",
        submitted_at: now,
        resume_version_id: app?.resume_version_id ?? version?.id ?? null,
        updated_at: now,
      },
      { onConflict: "job_id" },
    );
    if (res.error) throw new Error(res.error.message);
    const job = await db.from("jobs").update({ status: "applied" }).eq("id", jobId);
    if (job.error) throw new Error(job.error.message);
    if (app?.answers.length) await rememberAnswers(jobId, app.answers);
    revalidatePath(`/jobs/${jobId}/apply`);
    revalidatePath("/jobs");
    return null;
  });
}
