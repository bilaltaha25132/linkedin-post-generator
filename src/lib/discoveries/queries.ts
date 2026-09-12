import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import type { Discovery, DiscoveryStatus } from "@/lib/db/types";

// Columns excluding the large embedding vector — never needed by the UI.
const LIST_COLUMNS =
  "id,url,url_hash,title,source_name,source_id,published_at,snippet,topics,relevance_score,relevance_reason,suggested_angle,status,discovered_at";

export async function listDiscoveries(statuses: DiscoveryStatus[]): Promise<Discovery[]> {
  const { data, error } = await supabaseAdmin()
    .from("discoveries")
    .select(LIST_COLUMNS)
    .in("status", statuses)
    .order("relevance_score", { ascending: false, nullsFirst: false })
    .order("discovered_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as Discovery[];
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
