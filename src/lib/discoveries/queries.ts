import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import type { Discovery, DiscoveryStatus, DiscussionComment } from "@/lib/db/types";

// Columns excluding the large embedding vector — never needed by the UI.
const LIST_COLUMNS =
  "id,url,url_hash,title,source_name,source_id,published_at,snippet,topics,relevance_score,relevance_reason,suggested_angle,key_numbers,is_launch,discussion,status,discovered_at";

export type DiscoveryDetail = Discovery & {
  content_md: string | null;
  discussion_comments: DiscussionComment[] | null;
};

/**
 * Stories scored below this are rejected: the relevance prompt's LOW band
 * (generic hype, listicles, press releases). They leave the wire for the
 * Rejected page instead of sinking to its bottom.
 */
export const REJECT_BELOW = 45;

export interface DiscoveryPage {
  items: Discovery[];
  /** Rows matching the status filter, ignoring the render cap below. */
  total: number;
}

// The feed filters, sorts and searches client-side, so this cap is a payload
// guard, not a filter. At 100 it read as "100 of 100" on a feed of 200+ and the
// score/topic filters only ever saw the first page.
const LIST_LIMIT = 500;

export async function listDiscoveries(
  statuses: DiscoveryStatus[],
  opts: { minScore?: number } = {},
): Promise<DiscoveryPage> {
  let query = supabaseAdmin()
    .from("discoveries")
    .select(LIST_COLUMNS, { count: "exact" })
    .in("status", statuses);
  if (opts.minScore) query = query.or(`relevance_score.gte.${opts.minScore},relevance_score.is.null`);
  const { data, error, count } = await query
    .order("relevance_score", { ascending: false, nullsFirst: false })
    .order("discovered_at", { ascending: false })
    .limit(LIST_LIMIT);
  if (error) throw new Error(error.message);
  return { items: (data ?? []) as Discovery[], total: count ?? 0 };
}

export async function getDiscovery(id: string): Promise<DiscoveryDetail | null> {
  const { data, error } = await supabaseAdmin()
    .from("discoveries")
    .select(`${LIST_COLUMNS},content_md,discussion_comments`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as DiscoveryDetail | null) ?? null;
}
