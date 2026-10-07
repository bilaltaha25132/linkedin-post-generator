import "server-only";

import type { PostPerf } from "@/lib/plan/metrics";
import { supabaseAdmin } from "@/lib/supabase/server";

export interface Pillar {
  id: string;
  name: string;
  description: string;
  target_share: number;
  position: number;
}

export interface RecentPost {
  at: string | null;
  pillar_id: string | null;
  pillar_similarity: number | null;
  format: string | null;
  excerpt: string | null;
}

export interface AccountSummary {
  lastImport: string | null;
  totalFollowers: number | null;
  impressions28: number | null;
  impressionsPrev28: number | null;
  newFollowers28: number | null;
  audience: { kind: string; label: string; share: number }[];
}

export interface Upcoming {
  id: string;
  at: string;
  format: string;
  excerpt: string;
}

export async function listPillars(): Promise<Pillar[]> {
  const { data, error } = await supabaseAdmin()
    .from("pillars")
    .select("id,name,description,target_share,position")
    .order("position");
  if (error) throw new Error(error.message);
  return (data ?? []) as Pillar[];
}

export async function recentPosts(n = 10): Promise<RecentPost[]> {
  const { data, error } = await supabaseAdmin().rpc("recent_posts", { n });
  if (error) throw new Error(error.message);
  return (data ?? []) as RecentPost[];
}

/** Imported posts with their newest metrics row. */
export async function postPerformance(): Promise<PostPerf[]> {
  const db = supabaseAdmin();
  const { data: posts, error } = await db
    .from("linkedin_posts")
    .select("id,url,published_at,text,format,pillar_id,hook_type")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(400);
  if (error) throw new Error(error.message);
  if (!posts?.length) return [];
  const { data: metrics, error: mError } = await db
    .from("post_metrics")
    .select("*")
    .in("linkedin_post_id", posts.map((p) => p.id))
    .order("day", { ascending: false });
  if (mError) throw new Error(mError.message);

  // The newest value of each field: a TOP POSTS import may only carry one of them.
  const latest = new Map<string, Record<string, number | null>>();
  for (const m of metrics ?? []) {
    const row = latest.get(m.linkedin_post_id) ?? {};
    for (const [k, v] of Object.entries(m)) if (row[k] === undefined || row[k] === null) row[k] = v as number | null;
    latest.set(m.linkedin_post_id, row);
  }
  return posts.map((p) => {
    const m = latest.get(p.id) ?? {};
    const n = (k: string) => (typeof m[k] === "number" ? (m[k] as number) : null);
    return {
      id: p.id,
      url: p.url,
      publishedAt: p.published_at,
      text: p.text,
      format: p.format,
      pillarId: p.pillar_id,
      hookType: p.hook_type,
      impressions: n("impressions"),
      engagements: n("engagements"),
      reactions: n("reactions"),
      comments: n("comments"),
      reposts: n("reposts"),
      saves: n("saves"),
      sends: n("sends"),
      profileViews: n("profile_views"),
      followersGained: n("followers_gained"),
      reached: n("reached"),
    };
  });
}

export async function accountSummary(now: number): Promise<AccountSummary> {
  const db = supabaseAdmin();
  const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const { data: days } = await db
    .from("account_daily")
    .select("day,impressions,new_followers,total_followers")
    .gte("day", day(now - 56 * 86_400_000))
    .order("day", { ascending: false });
  const rows = days ?? [];
  const cut = day(now - 28 * 86_400_000);
  const sum = (list: typeof rows, k: "impressions" | "new_followers") =>
    list.some((r) => r[k] !== null) ? list.reduce((t, r) => t + (r[k] ?? 0), 0) : null;
  const { data: total } = await db
    .from("account_daily")
    .select("total_followers")
    .not("total_followers", "is", null)
    .order("day", { ascending: false })
    .limit(1);
  const { data: snap } = await db.from("audience_snapshot").select("imported_at").order("imported_at", { ascending: false }).limit(1);
  const lastSnap = snap?.[0]?.imported_at as string | undefined;
  const { data: audience } = lastSnap
    ? await db.from("audience_snapshot").select("kind,label,share").eq("imported_at", lastSnap).order("share", { ascending: false })
    : { data: [] };
  const { data: lastPost } = await db.from("post_metrics").select("day").order("day", { ascending: false }).limit(1);
  const lastImport = [rows[0]?.day, lastSnap, lastPost?.[0]?.day].filter(Boolean).sort().at(-1) ?? null;

  return {
    lastImport: lastImport as string | null,
    totalFollowers: (total?.[0]?.total_followers as number | undefined) ?? null,
    impressions28: sum(rows.filter((r) => r.day > cut), "impressions"),
    impressionsPrev28: sum(rows.filter((r) => r.day <= cut), "impressions"),
    newFollowers28: sum(rows.filter((r) => r.day > cut), "new_followers"),
    audience: (audience ?? []) as AccountSummary["audience"],
  };
}

/** Posts scheduled to go out, for slot picking and cadence checks. */
export async function upcomingPosts(): Promise<Upcoming[]> {
  const { data, error } = await supabaseAdmin()
    .from("posts")
    .select("id,scheduled_at,carousel,body")
    .not("scheduled_at", "is", null)
    .is("linkedin_urn", null)
    .order("scheduled_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({
    id: p.id,
    at: p.scheduled_at as string,
    format: Array.isArray(p.carousel) && p.carousel.length ? "carousel" : "text",
    excerpt: (p.body as string).slice(0, 120),
  }));
}
