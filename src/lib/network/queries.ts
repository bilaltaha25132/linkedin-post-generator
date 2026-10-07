import "server-only";

import { MIN_ACCEPTANCE, MONTHLY_NOTES, WEEKLY_INVITES, DAILY_INVITES } from "@/lib/network/format";
import type { Connection, ProfileReview } from "@/lib/network/types";
import { supabaseAdmin } from "@/lib/supabase/server";

const COLUMNS =
  "id,name,profile_url,headline,reason,source,kind,search_query,priority,note_draft,note_sent,status,sent_at,created_at,updated_at";

export async function listConnections(): Promise<Connection[]> {
  const { data, error } = await supabaseAdmin()
    .from("connections")
    .select(COLUMNS)
    .neq("status", "ignored")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(400);
  if (error) throw new Error(error.message);
  return data as Connection[];
}

export interface Pace {
  today: number;
  week: number;
  notesLeft: number;
  /** Accepted share of the last 50 invites, once 20 have been sent. */
  acceptance: number | null;
  paused: boolean;
  dailyLeft: number;
}

export async function pace(now: number): Promise<Pace> {
  const { data, error } = await supabaseAdmin()
    .from("connections")
    .select("status,sent_at,note_sent")
    .not("sent_at", "is", null)
    .order("sent_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const pkt = new Date(now + 5 * 3_600_000);
  const dayStart = Date.UTC(pkt.getUTCFullYear(), pkt.getUTCMonth(), pkt.getUTCDate()) - 5 * 3_600_000;
  const monthStart = Date.UTC(pkt.getUTCFullYear(), pkt.getUTCMonth(), 1) - 5 * 3_600_000;
  const at = (r: { sent_at: string | null }) => Date.parse(r.sent_at!);
  const today = rows.filter((r) => at(r) >= dayStart).length;
  const week = rows.filter((r) => now - at(r) < 7 * 86_400_000).length;
  const notes = rows.filter((r) => r.note_sent && at(r) >= monthStart).length;
  // Invites under a week old haven't had a fair chance yet.
  const settled = rows.filter((r) => now - at(r) >= 7 * 86_400_000).slice(0, 50);
  const accepted = settled.filter((r) => r.status === "accepted" || r.status === "talking").length;
  const acceptance = settled.length >= 20 ? accepted / settled.length : null;
  return {
    today,
    week,
    notesLeft: Math.max(0, MONTHLY_NOTES - notes),
    acceptance,
    paused: acceptance !== null && acceptance < MIN_ACCEPTANCE,
    dailyLeft: Math.max(0, Math.min(DAILY_INVITES - today, WEEKLY_INVITES - week)),
  };
}

export async function getProfileReview(): Promise<{ profile: string; review: ProfileReview | null; reviewedAt: string | null }> {
  const { data, error } = await supabaseAdmin().from("profile_review").select("profile,review,reviewed_at").eq("id", 1).maybeSingle();
  if (error) throw new Error(error.message);
  return {
    profile: (data?.profile as string | undefined) ?? "",
    review: (data?.review as ProfileReview | null) ?? null,
    reviewedAt: (data?.reviewed_at as string | null) ?? null,
  };
}
