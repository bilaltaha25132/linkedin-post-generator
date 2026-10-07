import "server-only";

import { env } from "@/lib/env";
import { KIND_LABEL } from "@/lib/leads/format";
import type { LeadDetail } from "@/lib/leads/types";
import { emailConfigured, sendEmail } from "@/lib/notify/email";
import { supabaseAdmin } from "@/lib/supabase/server";

const ALERTS_PER_PASS = 3;

type Row = {
  id: string;
  kind: string;
  url: string | null;
  who: string | null;
  wants: string | null;
  budget: string | null;
  score: number;
  score_detail: LeadDetail | null;
  opener: string | null;
};

/** An email for each new strong lead, and one for nudges that came due. Best-effort. */
export async function sendLeadAlerts(baseUrl: string): Promise<{ sent: number; nudged: number }> {
  if (!emailConfigured()) return { sent: 0, nudged: 0 };
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("leads")
    .select("id,kind,url,who,wants,budget,score,score_detail,opener")
    .gte("score", env.leads().alertMinScore)
    .is("notified_at", null)
    .eq("status", "new")
    .order("score", { ascending: false })
    .limit(ALERTS_PER_PASS);
  if (error) throw new Error(error.message);

  for (const lead of (data ?? []) as Row[]) {
    const title = `${KIND_LABEL[lead.kind] ?? "Lead"} ${lead.score}: ${lead.wants ?? lead.who ?? "new lead"}`.slice(0, 140);
    const lines = [
      lead.who && `From: ${lead.who}`,
      lead.budget && `Budget: ${lead.budget}`,
      lead.score_detail?.why,
      lead.opener && `\nA reply you could send:\n${lead.opener}`,
      lead.url && `\nOpen: ${lead.url}`,
      `All leads: ${baseUrl}/leads`,
    ].filter(Boolean) as string[];
    await sendEmail(title, page(title, lines), lines.join("\n"));
    await db.from("leads").update({ notified_at: new Date().toISOString() }).eq("id", lead.id);
  }

  // A nudge emails once: notified_at moves to the nudge time it answered.
  const { data: due } = await db
    .from("leads")
    .select("id,who,wants,url,nudge_at,notified_at")
    .eq("status", "contacted")
    .lte("nudge_at", new Date().toISOString());
  const fresh = (due ?? []).filter((l) => !l.notified_at || Date.parse(l.notified_at) < Date.parse(l.nudge_at!));
  if (fresh.length) {
    const lines = fresh.map((l) => `${l.who ?? "Someone"}: ${l.wants ?? ""}${l.url ? `\n${l.url}` : ""}`);
    lines.push(`Update them at ${baseUrl}/leads`);
    await sendEmail(`Time to follow up with ${fresh.length} lead${fresh.length > 1 ? "s" : ""}`, page("Follow up", lines), lines.join("\n\n"));
    await db
      .from("leads")
      .update({ notified_at: new Date().toISOString() })
      .in("id", fresh.map((l) => l.id));
  }
  return { sent: data?.length ?? 0, nudged: fresh.length };
}

function page(title: string, lines: string[]): string {
  return `<div style="max-width:600px;margin:0 auto;padding:24px;background:#f1f0ea;font-family:system-ui;">
    <div style="font:600 20px Georgia,serif;color:#1a1d22;margin-bottom:12px;">${esc(title)}</div>
    ${lines.map((l) => `<p style="font:14px system-ui;color:#1a1d22;white-space:pre-wrap;margin:0 0 10px;">${esc(l)}</p>`).join("")}
  </div>`;
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}
