"use server";

import { supabaseAdmin } from "@/lib/supabase/server";

/** Records that he opened a search link. Best effort: the link opens regardless. */
export async function markLinkOpened(key: string): Promise<void> {
  if (!key || key.length > 200) return;
  await supabaseAdmin().from("link_opens").upsert({ key, opened_at: new Date().toISOString() });
}
