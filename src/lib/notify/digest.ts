import "server-only";

import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail, emailConfigured } from "@/lib/notify/email";

/**
 * Email a digest of the best not-yet-notified discoveries, then mark them
 * notified so they never appear again. No-op when email isn't configured or
 * nothing clears the score bar.
 */
export async function sendDigest(baseUrl: string): Promise<{ sent: number }> {
  if (!emailConfigured()) return { sent: 0 };

  const cfg = env.email();
  const db = supabaseAdmin();

  const { data, error } = await db
    .from("discoveries")
    .select("id,title,relevance_score,suggested_angle,source_name")
    .eq("status", "new")
    .eq("notified", false)
    .gte("relevance_score", cfg.minScore)
    .order("relevance_score", { ascending: false })
    .limit(cfg.maxItems);
  if (error) throw new Error(error.message);

  const items = data ?? [];
  if (items.length === 0) return { sent: 0 };

  const subject = `Signal Desk — ${items.length} worth posting about`;
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
};

function renderHtml(items: Item[], baseUrl: string): string {
  const rows = items
    .map(
      (d) => `
      <tr><td style="padding:16px 0;border-top:1px solid #d7d4c9;">
        <div style="font:600 13px monospace;color:#2c40bd;">${d.relevance_score ?? "—"} / 100 &nbsp;·&nbsp; ${esc(d.source_name ?? "")}</div>
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

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}
