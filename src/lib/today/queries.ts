import "server-only";

import { commentStats, listCapturedPosts, listOpenEvents, listWatchPeople } from "@/lib/engage/queries";
import { overdueDays } from "@/lib/engage/format";
import { supabaseAdmin } from "@/lib/supabase/server";

// The day on one screen (docs/growth/ui.md): counts and the few items worth
// acting on, each linking to the tab that handles it.

export const JOB_BAR = 80;
export const LEAD_BAR = 75;

export interface TodayItem {
  id: string;
  title: string;
  sub: string;
  score: number | null;
  href: string;
}

export interface TodaySummary {
  commentsToday: number;
  draftsWaiting: number;
  roundsDue: number;
  replies: number;
  queued: number;
  jobs: TodayItem[];
  jobsNew: number;
  leads: TodayItem[];
  leadsNew: number;
  followUps: number;
}

export async function todaySummary(now: number): Promise<TodaySummary> {
  const db = supabaseAdmin();
  const since = new Date(now - 3 * 86_400_000).toISOString();
  const [stats, captured, events, people, queued, jobs, leads, followUps] = await Promise.all([
    commentStats(),
    listCapturedPosts(),
    listOpenEvents(),
    listWatchPeople(),
    db.from("posts").select("id", { count: "exact", head: true }).eq("status", "queued"),
    db
      .from("jobs")
      .select("id,title,company,location_raw,score", { count: "exact" })
      .is("closed_at", null)
      .eq("status", "new")
      .gte("score", JOB_BAR)
      .gte("first_seen_at", since)
      .order("score", { ascending: false })
      .limit(3),
    db
      .from("leads")
      .select("id,wants,who,region,score", { count: "exact" })
      .eq("status", "new")
      .gte("score", LEAD_BAR)
      .gte("created_at", since)
      .order("score", { ascending: false })
      .limit(3),
    db
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("status", "contacted")
      .lte("nudge_at", new Date(now).toISOString()),
  ]);
  for (const r of [queued, jobs, leads, followUps]) if (r.error) throw new Error(r.error.message);

  // Shared in the last two days, with a passing draft and nothing posted yet.
  const fresh = captured.filter((c) => now - Date.parse(c.created_at) < 2 * 86_400_000);
  const draftsWaiting = fresh.filter((c) => c.drafts.length && !c.drafts.some((d) => d.posted_at)).length;

  return {
    commentsToday: stats.today,
    draftsWaiting,
    roundsDue: people.filter((p) => overdueDays(p, now) >= 0).length,
    replies: events.length,
    queued: queued.count ?? 0,
    jobs: (jobs.data ?? []).map((j) => ({
      id: j.id,
      title: j.title,
      sub: [j.company, j.location_raw].filter(Boolean).join(", "),
      score: j.score,
      href: `/jobs#job-${j.id}`,
    })),
    jobsNew: jobs.count ?? 0,
    leads: (leads.data ?? []).map((l) => ({
      id: l.id,
      title: l.wants ?? "Untitled lead",
      sub: [l.who, l.region].filter(Boolean).join(", "),
      score: l.score,
      href: `/leads#lead-${l.id}`,
    })),
    leadsNew: leads.count ?? 0,
    followUps: followUps.count ?? 0,
  };
}
