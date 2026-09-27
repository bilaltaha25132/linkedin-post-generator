import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import type { Discovery, DiscoveryStatus } from "@/lib/db/types";

// Columns excluding the large embedding vector — never needed by the UI.
const LIST_COLUMNS =
  "id,url,url_hash,title,source_name,source_id,published_at,snippet,topics,relevance_score,relevance_reason,suggested_angle,status,discovered_at";

export interface DiscoveryPage {
  items: Discovery[];
  /** Rows matching the status filter, ignoring the render cap below. */
  total: number;
}

// The feed filters, sorts and searches client-side, so this cap is a payload
// guard, not a filter. At 100 it read as "100 of 100" on a feed of 200+ and the
// score/topic filters only ever saw the first page.
const LIST_LIMIT = 500;

export async function listDiscoveries(statuses: DiscoveryStatus[]): Promise<DiscoveryPage> {
  const { data, error, count } = await supabaseAdmin()
    .from("discoveries")
    .select(LIST_COLUMNS, { count: "exact" })
    .in("status", statuses)
    .order("relevance_score", { ascending: false, nullsFirst: false })
    .order("discovered_at", { ascending: false })
    .limit(LIST_LIMIT);
  if (error) throw new Error(error.message);
  return { items: (data ?? []) as Discovery[], total: count ?? 0 };
}

export async function getDiscovery(id: string): Promise<(Discovery & { content_md: string | null }) | null> {
  const { data, error } = await supabaseAdmin()
    .from("discoveries")
    .select(`${LIST_COLUMNS},content_md`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as (Discovery & { content_md: string | null }) | null) ?? null;
}
