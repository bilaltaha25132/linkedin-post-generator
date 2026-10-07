import "server-only";

import { z } from "zod";

import { parseEmail, type AlertJob, type ParsedEmail } from "@/lib/email/parse";
import { sendJobAlerts } from "@/lib/jobs/notify";
import { ingestJobs, scoreBacklog } from "@/lib/jobs/run";
import type { JobSource, RawJob } from "@/lib/jobs/types";
import { activityIdOf, canonicalJobUrl, cleanLinkedInUrl, postedAtFromId } from "@/lib/links/deep";
import { chatJSON } from "@/lib/llm/client";
import { supabaseAdmin } from "@/lib/supabase/server";

export interface PushedEmail {
  id: string;
  from: string;
  subject: string;
  date: string;
  body: string;
}

/** Senders that always carry items: parsing one to nothing means a template changed. */
const EXPECTS_ITEMS = new Set(["job_alert", "notification", "invitation", "message"]);

/**
 * Stores each new email raw, then parses it into jobs, engagement events,
 * connections and leads. Emails already stored (same Gmail ID) are skipped, so
 * the script can resend safely.
 */
export async function ingestEmails(emails: PushedEmail[], baseUrl: string): Promise<{ stored: number; items: number }> {
  const db = supabaseAdmin();
  const rows = emails.map((e) => ({
    gmail_id: e.id,
    sender: e.from.slice(0, 300),
    subject: e.subject.slice(0, 500),
    received_at: new Date(e.date).toISOString(),
    body_text: stripTracking(e.body).slice(0, 40_000),
  }));
  const { data: fresh, error } = await db
    .from("inbound_emails")
    .upsert(rows, { onConflict: "gmail_id", ignoreDuplicates: true })
    .select("id,sender,subject,body_text,received_at");
  if (error) throw new Error(error.message);

  let items = 0;
  let newJobs = 0;
  for (const row of fresh ?? []) {
    const result = await applyEmail(row);
    items += result.items;
    newJobs += result.jobs;
  }

  // A job alert should become a scored card within minutes, not at the next hourly pass.
  if (newJobs > 0) {
    await scoreBacklog(Math.min(newJobs, 10), Date.now() + 60_000);
    await sendJobAlerts(baseUrl);
  }
  return { stored: fresh?.length ?? 0, items };
}

/** Parses one stored email again, for a template that changed after it arrived. */
export async function reparseEmail(id: string): Promise<number> {
  const { data, error } = await supabaseAdmin()
    .from("inbound_emails")
    .select("id,sender,subject,body_text,received_at")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return (await applyEmail(data)).items;
}

interface StoredEmail {
  id: string;
  sender: string;
  subject: string;
  body_text: string;
  received_at: string;
}

async function applyEmail(email: StoredEmail): Promise<{ items: number; jobs: number }> {
  const db = supabaseAdmin();
  let parsed: ParsedEmail;
  let items = 0;
  let jobs = 0;
  let failure: string | null = null;
  try {
    parsed = parseEmail({ sender: email.sender, subject: email.subject, body: email.body_text });
    if (parsed.kind === "job_alert" && parsed.jobs.length === 0) parsed.jobs = await extractJobs(email.body_text);

    jobs = await storeAlertJobs(parsed.jobs, email.received_at);
    items += parsed.jobs.length;
    items += await applyApplications(parsed);
    items += await storeEvents(email, parsed);
    items += await storePeople(email, parsed);
    if (parsed.weekly) {
      await db.from("weekly_stats").upsert({
        week: weekOf(email.received_at),
        search_appearances: parsed.weekly.appearances,
        found_by: parsed.weekly.foundBy,
      });
      items += 1;
    }
    if (items === 0 && EXPECTS_ITEMS.has(parsed.kind)) failure = "Parsed to nothing. The email's layout may have changed.";
  } catch (err) {
    parsed = { kind: "other", jobs: [], events: [], applications: [], people: [], weekly: null };
    failure = err instanceof Error ? err.message : String(err);
  }

  await db
    .from("inbound_emails")
    .update({ kind: parsed.kind, items, parsed_at: new Date().toISOString(), error: failure })
    .eq("id", email.id);
  return { items, jobs };
}

// ── Job alerts ──────────────────────────────────────────────────────────────

async function linkedInSource(): Promise<JobSource> {
  const { data, error } = await supabaseAdmin()
    .from("job_sources")
    .upsert(
      { kind: "linkedin_alert", token: "", name: "LinkedIn job alerts", region: "other" },
      { onConflict: "kind,token" },
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as JobSource;
}

async function storeAlertJobs(alertJobs: AlertJob[], receivedAt: string): Promise<number> {
  if (!alertJobs.length) return 0;
  const raws: RawJob[] = alertJobs.map((j) => ({
    sourceId: j.jobId,
    company: j.company,
    title: j.title,
    location: j.location,
    countries: [],
    remote: /\bremote\b/i.test(j.location) ? true : null,
    hybrid: /\bhybrid\b/i.test(j.location),
    employmentType: null,
    payMin: null,
    payMax: null,
    currency: null,
    payPeriod: null,
    urlApply: canonicalJobUrl(j.jobId),
    urlSource: null,
    postedAt: receivedAt,
    // LinkedIn's hint lines are all the alert says; the scorer judges from the title.
    description: j.insights.join("\n"),
  }));
  const { added } = await ingestJobs(await linkedInSource(), raws, false);
  return added;
}

const extractedSchema = z.object({
  jobs: z.array(z.object({ jobId: z.string(), title: z.string(), company: z.string(), location: z.string() })),
});

/** The fallback when a job-alert layout stops matching: the model reads the cards. */
async function extractJobs(body: string): Promise<AlertJob[]> {
  const { jobs } = await chatJSON({
    system:
      'Extract the job cards from this LinkedIn job alert email. Return ONLY {"jobs":[{"jobId":"digits from the /jobs/view/ link","title":"","company":"","location":""}]}. Use only what the email says.',
    user: body.slice(0, 12_000),
    schema: extractedSchema,
    role: "utility",
    temperature: 0,
    maxTokens: 1500,
    op: "email-parse",
  });
  // Every ID has to be in the email, so nothing invented gets a card.
  return jobs
    .filter((j) => /^\d{6,}$/.test(j.jobId) && body.includes(`/jobs/view/${j.jobId}`))
    .map((j) => ({ ...j, insights: [] }));
}

// ── Applications ────────────────────────────────────────────────────────────

async function applyApplications(parsed: ParsedEmail): Promise<number> {
  const db = supabaseAdmin();
  let applied = 0;
  for (const update of parsed.applications) {
    applied += 1;
    if (update.outcome !== "rejected") continue;
    let query = db
      .from("jobs")
      .update({ status: "closed" })
      .in("status", ["applied", "interviewing"])
      .ilike("company", update.company.replace(/[%_]/g, ""));
    if (update.title) query = query.ilike("title", `%${update.title.replace(/[%_]/g, "")}%`);
    await query;
  }
  return applied;
}

// ── Engagement ──────────────────────────────────────────────────────────────

async function storeEvents(email: StoredEmail, parsed: ParsedEmail): Promise<number> {
  if (!parsed.events.length) return 0;
  const db = supabaseAdmin();
  const { error } = await db.from("engagement_events").insert(
    parsed.events.map((e) => ({
      email_id: email.id,
      kind: e.kind,
      actor_name: e.actor,
      preview: e.preview,
      post_url: e.postUrl,
      occurred_at: email.received_at,
      // Only comments, mentions and fresh posts ask for something; the rest is a record.
      done: !["comment", "mention", "post_alert"].includes(e.kind),
    })),
  );
  if (error) throw new Error(error.message);

  // A bell notification is a fresh post from someone he follows: straight into Engage.
  for (const e of parsed.events) {
    if (e.kind !== "post_alert" || !e.postUrl) continue;
    const activityId = activityIdOf(e.postUrl);
    await db.from("captured_posts").upsert(
      {
        url: e.postUrl,
        activity_id: activityId,
        posted_at: (activityId && postedAtFromId(activityId)?.toISOString()) || email.received_at,
        author_name: e.actor,
        text: e.preview ?? "",
        via: "email",
      },
      { onConflict: "url", ignoreDuplicates: true },
    );
  }
  return parsed.events.length;
}

// ── Invitations and messages ────────────────────────────────────────────────

async function storePeople(email: StoredEmail, parsed: ParsedEmail): Promise<number> {
  const db = supabaseAdmin();
  for (const person of parsed.people) {
    if (parsed.kind === "invitation") {
      const status = person.accepted ? "accepted" : "incoming";
      const existing = person.profileUrl
        ? await db.from("connections").select("id").eq("profile_url", person.profileUrl).maybeSingle()
        : await db.from("connections").select("id").ilike("name", person.name).maybeSingle();
      if (existing.data) {
        await db
          .from("connections")
          .update({ status, updated_at: new Date().toISOString() })
          .eq("id", existing.data.id);
      } else {
        await db.from("connections").insert({
          name: person.name,
          profile_url: person.profileUrl,
          headline: person.headline,
          source: "invitation",
          status,
        });
      }
    } else if (parsed.kind === "message") {
      // A recruiter or client writing to him is a lead; the leads pass scores it.
      await db.from("leads").upsert(
        {
          kind: "recruiter_message",
          source: "linkedin_message",
          url: person.profileUrl ? `${person.profileUrl}#${email.id}` : `email:${email.id}`,
          posted_at: email.received_at,
          who: person.name,
          snippet: person.preview,
          wants: email.subject.slice(0, 300),
        },
        { onConflict: "url", ignoreDuplicates: true },
      );
    }
  }
  return parsed.people.length;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Every LinkedIn link in the text, cleaned of tracking and login tokens. */
function stripTracking(body: string): string {
  return body.replace(/https?:\/\/[^\s<>"')\]]*linkedin\.com[^\s<>"')\]]*/gi, (url) => cleanLinkedInUrl(url) ?? "");
}

/** The Monday of the week a date falls in, as YYYY-MM-DD. */
function weekOf(iso: string): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
