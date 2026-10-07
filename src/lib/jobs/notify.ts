import "server-only";

import { env } from "@/lib/env";
import { payText, whereText } from "@/lib/jobs/format";
import type { ScoreDetail } from "@/lib/jobs/types";
import { emailConfigured, sendEmail } from "@/lib/notify/email";
import { supabaseAdmin } from "@/lib/supabase/server";

const ALERTS_PER_PASS = 3;
const DIGEST_SIZE = 10;

type Row = {
  id: string;
  company: string;
  title: string;
  location_raw: string | null;
  remote_scope: string;
  pay_min: number | null;
  pay_max: number | null;
  currency: string | null;
  pay_period: string | null;
  url_apply: string;
  source_credit: string | null;
  score: number | null;
  score_detail: ScoreDetail | null;
};
const COLUMNS =
  "id,company,title,location_raw,remote_scope,pay_min,pay_max,currency,pay_period,url_apply,source_credit,score,score_detail";

/** An email for each new strong match, a few per pass so a backlog can't flood the inbox. */
export async function sendJobAlerts(baseUrl: string): Promise<{ sent: number }> {
  if (!emailConfigured()) return { sent: 0 };
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("jobs")
    .select(COLUMNS)
    .gte("score", env.jobs().alertMinScore)
    .is("notified_at", null)
    .is("closed_at", null)
    .eq("status", "new")
    .order("score", { ascending: false })
    .limit(ALERTS_PER_PASS);
  if (error) throw new Error(error.message);
  const jobs = (data ?? []) as Row[];

  for (const job of jobs) {
    await sendEmail(`Job match ${job.score}: ${job.title} at ${job.company}`, page([job], baseUrl, ""), textOf([job], baseUrl));
    await db.from("jobs").update({ notified_at: new Date().toISOString() }).eq("id", job.id);
  }
  return { sent: jobs.length };
}

/** The morning list: the day's best new matches. */
export async function sendJobDigest(baseUrl: string): Promise<{ sent: number }> {
  if (!emailConfigured()) return { sent: 0 };
  const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const { data, error } = await supabaseAdmin()
    .from("jobs")
    .select(COLUMNS)
    .gte("score", env.jobs().digestMinScore)
    .gte("first_seen_at", since)
    .is("closed_at", null)
    .in("status", ["new", "saved"])
    .order("score", { ascending: false })
    .limit(DIGEST_SIZE);
  if (error) throw new Error(error.message);
  const jobs = (data ?? []) as Row[];
  if (jobs.length === 0) return { sent: 0 };

  await sendEmail(
    `Signal Desk: ${jobs.length} new job match${jobs.length > 1 ? "es" : ""}`,
    page(jobs, baseUrl, `${jobs.length} new role${jobs.length > 1 ? "s" : ""} worth a look from the last day.`),
    textOf(jobs, baseUrl),
  );
  return { sent: jobs.length };
}

function textOf(jobs: Row[], baseUrl: string): string {
  return jobs
    .map((j) => `[${j.score}] ${j.title} at ${j.company}\n${whereText(j)}\n${j.score_detail?.why ?? ""}\n${j.url_apply}`)
    .concat(`All matches: ${baseUrl}/jobs`)
    .join("\n\n");
}

function page(jobs: Row[], baseUrl: string, intro: string): string {
  const rows = jobs
    .map((j) => {
      const pay = payText(j);
      const facts = [j.company, whereText(j), pay, j.source_credit ? `via ${j.source_credit}` : null]
        .filter((f): f is string => Boolean(f))
        .map(esc)
        .join(" &nbsp;·&nbsp; ");
      const skills = j.score_detail?.stack_overlap.length
        ? `<div style="font:13px system-ui;color:#2d6a3e;margin-bottom:10px;">${esc(j.score_detail.stack_overlap.join(", "))}</div>`
        : "";
      return `
      <tr><td style="padding:16px 0;border-top:1px solid #d7d4c9;">
        <div style="font:600 13px monospace;color:#2c40bd;">${j.score ?? "-"} / 100 fit</div>
        <div style="font:600 18px Georgia,serif;color:#1a1d22;margin:6px 0 2px;">${esc(j.title)}</div>
        <div style="font:14px system-ui;color:#1a1d22;margin-bottom:6px;">${facts}</div>
        <div style="font:14px system-ui;color:#555a62;margin-bottom:8px;">${esc(j.score_detail?.why ?? "")}</div>
        ${skills}
        <a href="${esc(j.url_apply)}" style="font:600 14px system-ui;color:#fff;background:#2c40bd;padding:8px 14px;border-radius:6px;text-decoration:none;">Open the posting</a>
      </td></tr>`;
    })
    .join("");

  return `<div style="max-width:600px;margin:0 auto;padding:24px;background:#f1f0ea;font-family:system-ui;">
    <div style="font:600 20px Georgia,serif;color:#1a1d22;">Signal Desk jobs</div>
    ${intro ? `<div style="font:14px system-ui;color:#555a62;margin:4px 0 8px;">${esc(intro)}</div>` : ""}
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
    <div style="font:12px system-ui;color:#8b909a;margin-top:20px;"><a href="${baseUrl}/jobs" style="color:#2c40bd;">All matches</a></div>
  </div>`;
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}
