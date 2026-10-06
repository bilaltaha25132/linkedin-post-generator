import "server-only";

import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail, emailConfigured } from "@/lib/notify/email";
import { paperLink } from "@/lib/papers";

const LAUNCH_MIN_SCORE = 55;

// A story this strong is worth posting before anyone else does, so it gets its
// own email the pass it's found instead of waiting for the daily digest.
const ALERT_MIN_SCORE = 80;
const ALERT_LAUNCH_MIN_SCORE = 75;
const ALERTS_PER_PASS = 3;
// Older than this and it isn't a head start any more; the digest picks it up.
const ALERT_MAX_AGE_MS = 12 * 3_600_000;

/**
 * One email per breaking story, sent the pass it's found. Each is marked
 * notified, so the digest doesn't repeat it.
 */
export async function sendBreakingAlerts(baseUrl: string, now = new Date()): Promise<{ sent: number }> {
  if (!emailConfigured()) return { sent: 0 };

  const db = supabaseAdmin();
  const since = new Date(now.getTime() - ALERT_MAX_AGE_MS).toISOString();
  const { data, error } = await db
    .from("discoveries")
    .select("id,title,url,relevance_score,suggested_angle,source_name,is_launch,key_numbers")
    .eq("status", "new")
    .eq("notified", false)
    .gte("discovered_at", since)
    .or(`relevance_score.gte.${ALERT_MIN_SCORE},and(is_launch.eq.true,relevance_score.gte.${ALERT_LAUNCH_MIN_SCORE})`)
    .order("relevance_score", { ascending: false })
    .limit(ALERTS_PER_PASS);
  if (error) throw new Error(error.message);

  let sent = 0;
  for (const d of data ?? []) {
    const kind = paperLink(d.url) ? "New paper" : d.is_launch ? "New release" : "Breaking";
    const draftUrl = `${baseUrl}/generate/${d.id}`;
    const numbers = (d.key_numbers ?? []) as string[];
    const text = [
      `${kind}, scored ${d.relevance_score}/100 (${d.source_name ?? "unknown source"})`,
      d.title,
      d.suggested_angle ?? "",
      numbers.map((n) => `- ${n}`).join("\n"),
      `Draft it now: ${draftUrl}`,
      `Source: ${d.url}`,
    ]
      .filter(Boolean)
      .join("\n\n");
    await sendEmail(`${kind}: ${d.title}`, renderAlert(kind, d, numbers, draftUrl), text);
    await db.from("discoveries").update({ notified: true }).eq("id", d.id);
    sent += 1;
  }
  return { sent };
}

/**
 * Email a digest of the best not-yet-notified discoveries, then mark them
 * notified so they never appear again. No-op when email isn't configured or
 * nothing clears the score bar.
 */
export async function sendDigest(baseUrl: string): Promise<{ sent: number }> {
  if (!emailConfigured()) return { sent: 0 };

  const cfg = env.email();
  const db = supabaseAdmin();

  // A new release is worth hearing about while it's still news, so launches
  // clear a lower bar and lead the email.
  const { data, error } = await db
    .from("discoveries")
    .select("id,title,relevance_score,suggested_angle,source_name,is_launch")
    .eq("status", "new")
    .eq("notified", false)
    .or(`relevance_score.gte.${cfg.minScore},and(is_launch.eq.true,relevance_score.gte.${LAUNCH_MIN_SCORE})`)
    .order("is_launch", { ascending: false })
    .order("relevance_score", { ascending: false })
    .limit(cfg.maxItems);
  if (error) throw new Error(error.message);

  const items = data ?? [];
  if (items.length === 0) return { sent: 0 };

  const launch = items.find((i) => i.is_launch);
  const subject = launch
    ? `New release: ${launch.title}${items.length > 1 ? ` (+${items.length - 1} more)` : ""}`
    : `Signal Desk: ${items.length} worth posting about`;
  const text = items
    .map((d) => `[${d.relevance_score}] ${d.title}\n${d.suggested_angle ?? ""}\n${baseUrl}/generate/${d.id}`)
    .join("\n\n");
  const html = renderHtml(items, baseUrl);

  await sendEmail(subject, html, text);
  await db.from("discoveries").update({ notified: true }).in("id", items.map((i) => i.id));

  return { sent: items.length };
}

type Item = {
  id: string;
  title: string | null;
  relevance_score: number | null;
  suggested_angle: string | null;
  source_name: string | null;
  is_launch: boolean;
};

function renderHtml(items: Item[], baseUrl: string): string {
  const rows = items
    .map(
      (d) => `
      <tr><td style="padding:16px 0;border-top:1px solid #d7d4c9;">
        <div style="font:600 13px monospace;color:#2c40bd;">${d.is_launch ? "NEW RELEASE &nbsp;·&nbsp; " : ""}${d.relevance_score ?? "-"} / 100 &nbsp;·&nbsp; ${esc(d.source_name ?? "")}</div>
        <div style="font:600 18px Georgia,serif;color:#1a1d22;margin:6px 0;">${esc(d.title ?? "")}</div>
        <div style="font:14px system-ui;color:#555a62;margin-bottom:10px;">${esc(d.suggested_angle ?? "")}</div>
        <a href="${baseUrl}/generate/${d.id}" style="font:600 14px system-ui;color:#fff;background:#2c40bd;padding:8px 14px;border-radius:6px;text-decoration:none;">Draft this post →</a>
      </td></tr>`,
    )
    .join("");

  return `<div style="max-width:600px;margin:0 auto;padding:24px;background:#f1f0ea;font-family:system-ui;">
    <div style="font:600 20px Georgia,serif;color:#1a1d22;">Signal Desk</div>
    <div style="font:14px system-ui;color:#555a62;margin:4px 0 8px;">${items.length} new item${items.length > 1 ? "s" : ""} worth posting about.</div>
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
    <div style="font:12px system-ui;color:#8b909a;margin-top:20px;">Signal Desk · <a href="${baseUrl}" style="color:#2c40bd;">open the app</a></div>
  </div>`;
}

function renderAlert(
  kind: string,
  d: { title: string | null; url: string; relevance_score: number | null; suggested_angle: string | null; source_name: string | null },
  numbers: string[],
  draftUrl: string,
): string {
  const facts = numbers.length
    ? `<ul style="font:14px system-ui;color:#1a1d22;padding-left:18px;margin:0 0 14px;">${numbers.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>`
    : "";
  return `<div style="max-width:600px;margin:0 auto;padding:24px;background:#f1f0ea;font-family:system-ui;">
    <div style="font:600 13px monospace;color:#2c40bd;">${esc(kind)} &nbsp;·&nbsp; ${d.relevance_score ?? "-"} / 100 &nbsp;·&nbsp; ${esc(d.source_name ?? "")}</div>
    <div style="font:600 20px Georgia,serif;color:#1a1d22;margin:8px 0;">${esc(d.title ?? "")}</div>
    <div style="font:14px system-ui;color:#555a62;margin-bottom:14px;">${esc(d.suggested_angle ?? "")}</div>
    ${facts}
    <a href="${draftUrl}" style="font:600 14px system-ui;color:#fff;background:#2c40bd;padding:9px 16px;border-radius:6px;text-decoration:none;">Draft this post now</a>
    <div style="font:12px system-ui;color:#8b909a;margin-top:18px;"><a href="${esc(d.url)}" style="color:#2c40bd;">Read the source</a></div>
  </div>`;
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}
