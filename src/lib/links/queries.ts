import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";

/** When each link was last opened, by key. Links never opened are absent. */
export async function linkOpens(keys: string[]): Promise<Record<string, string>> {
  if (!keys.length) return {};
  const { data, error } = await supabaseAdmin().from("link_opens").select("key,opened_at").in("key", keys);
  if (error) throw new Error(error.message);
  return Object.fromEntries(data.map((r) => [r.key as string, r.opened_at as string]));
}
