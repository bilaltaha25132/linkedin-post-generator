import "server-only";

import { programById } from "@/lib/study/catalog";
import { describeSignal } from "@/lib/study/extract";
import { emailConfigured, sendEmail } from "@/lib/notify/email";
import { supabaseAdmin } from "@/lib/supabase/server";

type Change = { id: number; program_id: string; url: string; added: string[]; removed: string[] };

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** One email listing what moved on the pages of followed programs; other changes wait in the Changes view. */
export async function sendStudyChangeAlerts(baseUrl: string): Promise<{ sent: number }> {
  const db = supabaseAdmin();
  const { data, error } = await db.from("study_changes").select("id,program_id,url,added,removed").eq("notified", false);
  if (error) throw new Error(error.message);
  const changes = (data ?? []) as Change[];
  if (!changes.length) return { sent: 0 };

  const { data: tracked, error: trackedError } = await db.from("study_tracked").select("program_id,stage");
  if (trackedError) throw new Error(trackedError.message);
  const followed = new Set((tracked ?? []).filter((t) => t.stage !== "dropped").map((t) => t.program_id as string));
  const mine = changes.filter((c) => followed.has(c.program_id));

  let sent = 0;
  if (mine.length && emailConfigured()) {
    const lines = mine.map((c) => {
      const p = programById(c.program_id);
      const name = p ? `${p.program}, ${p.university}` : c.program_id;
      const moved = [
        c.added.length ? `now shows ${c.added.map(describeSignal).join(", ")}` : "",
        c.removed.length ? `no longer shows ${c.removed.map(describeSignal).join(", ")}` : "",
      ].filter(Boolean).join("; ");
      return { name, moved, url: c.url };
    });
    const link = `${baseUrl}/study?view=changes`;
    const html = `<p>The official pages of programs you follow changed:</p><ul>${lines
      .map((l) => `<li><strong>${escape(l.name)}</strong>: ${escape(l.moved)}. <a href="${escape(l.url)}">Open the page</a></li>`)
      .join("")}</ul><p><a href="${link}">See before and after in Study</a></p>`;
    const text = `The official pages of programs you follow changed:\n\n${lines
      .map((l) => `- ${l.name}: ${l.moved}.\n  ${l.url}`)
      .join("\n")}\n\nBefore and after: ${link}`;
    await sendEmail(`Study: ${mine.length} followed ${mine.length === 1 ? "program" : "programs"} changed`, html, text);
    sent = 1;
  }

  const { error: markError } = await db.from("study_changes").update({ notified: true }).in("id", changes.map((c) => c.id));
  if (markError) throw new Error(markError.message);
  return { sent };
}
