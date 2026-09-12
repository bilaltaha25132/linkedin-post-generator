import "server-only";

import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendWhatsApp, whatsappConfigured } from "@/lib/notify/whatsapp";

/**
 * Push a WhatsApp digest of the best not-yet-notified discoveries, then mark
 * them notified so they never appear in a later digest. No-op when WhatsApp
 * isn't configured or nothing clears the score bar.
 */
export async function sendDigest(baseUrl: string): Promise<{ sent: number }> {
  if (!whatsappConfigured()) return { sent: 0 };

  const cfg = env.whatsapp();
  const db = supabaseAdmin();

  const { data, error } = await db
    .from("discoveries")
    .select("id,title,relevance_score,suggested_angle")
    .eq("status", "new")
    .eq("notified", false)
    .gte("relevance_score", cfg.minScore)
    .order("relevance_score", { ascending: false })
    .limit(cfg.maxItems);
  if (error) throw new Error(error.message);

  const items = data ?? [];
  if (items.length === 0) return { sent: 0 };

  const body = items
    .map((d) => {
      const angle = (d.suggested_angle ?? "").slice(0, 140);
      return `[${d.relevance_score}] ${d.title}\n${angle}\n${baseUrl}/generate/${d.id}`;
    })
    .join("\n\n");
  const text = `Signal Desk — ${items.length} worth posting about:\n\n${body}`;

  await sendWhatsApp(text);
  await db.from("discoveries").update({ notified: true }).in("id", items.map((i) => i.id));

  return { sent: items.length };
}
