import "server-only";

import { leadLanes } from "@/lib/leads/sources";
import type { Lead } from "@/lib/leads/types";
import { supabaseAdmin } from "@/lib/supabase/server";

const COLUMNS =
  "id,kind,source,url,posted_at,who,wants,stack,region,remote,budget,snippet,score,score_detail,opener,status,nudge_at,created_at";

/** Everything not hidden, best first. The page splits it into new, pipeline and closed. */
export async function listLeads(): Promise<Lead[]> {
  const { data, error } = await supabaseAdmin()
    .from("leads")
    .select(COLUMNS)
    .neq("status", "hidden")
    .order("score", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as Lead[];
}

export function laneStatus(): { label: string; needs: string[] }[] {
  return leadLanes().map(({ label, needs }) => ({ label, needs }));
}
