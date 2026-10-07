import "server-only";

import { overdueDays } from "@/lib/engage/format";
import type { WatchPerson } from "@/lib/engage/types";
import { median, reachMultipliers } from "@/lib/plan/metrics";
import { ON_PILLAR, postThisNext, type Suggestion } from "@/lib/plan/next";
import { accountSummary, listPillars, postPerformance, recentPosts, upcomingPosts } from "@/lib/plan/queries";
import { supabaseAdmin } from "@/lib/supabase/server";

// The Monday report (docs/growth/strategist.md#weekly-report), built from what
// every other tab already stores. The /week page and the email show the same data.

const DAY = 86_400_000;

export interface WeekItem {
  title: string;
  sub: string;
  href: string;
}

export interface WeeklyReport {
  weekOf: string;
  lastWeek: {
    posts: number;
    best: { text: string; multiplier: number; url: string | null } | null;
    medianMultiplier: number | null;
    impressions: number | null;
    impressionsBefore: number | null;
    newFollowers: number | null;
    searchAppearances: number | null;
    foundBy: string[];
  };
  plan: Suggestion[];
  people: { replies: number; roundsDue: number; warm: WeekItem[] };
  jobs: WeekItem[];
  leads: WeekItem[];
  nudges: string[];
  experiment: string;
  uploadDue: boolean;
  /** First Monday of the month only. */
  progress: { streakWeeks: number; onLane: number | null; ownWork: number | null; comments30: number } | null;
}

export async function buildWeeklyReport(now: number): Promise<WeeklyReport> {
  const db = supabaseAdmin();
  const weekAgo = new Date(now - 7 * DAY).toISOString();
  const [pillars, recent, performance, upcoming, account, stats, events, people, jobs, leads, saved, dueLeads, comments] =
    await Promise.all([
      listPillars(),
      recentPosts(60),
      postPerformance(),
      upcomingPosts(),
      accountSummary(now),
      db.from("weekly_stats").select("week,search_appearances,found_by").order("week", { ascending: false }).limit(1),
      db.from("engagement_events").select("id", { count: "exact", head: true }).eq("done", false).in("kind", ["comment", "mention"]),
      db.from("watch_people").select("tier,last_visited_at"),
      db
        .from("jobs")
        .select("id,title,company,location_raw,score")
        .is("closed_at", null)
        .eq("status", "new")
        .gte("score", 75)
        .gte("first_seen_at", weekAgo)
        .order("score", { ascending: false })
        .limit(3),
      db
        .from("leads")
        .select("id,wants,who,score")
        .eq("status", "new")
        .gte("score", 70)
        .gte("created_at", weekAgo)
        .order("score", { ascending: false })
        .limit(3),
      db.from("jobs").select("id", { count: "exact", head: true }).eq("status", "saved").is("closed_at", null).lt("first_seen_at", new Date(now - 6 * DAY).toISOString()),
      db.from("leads").select("id", { count: "exact", head: true }).eq("status", "contacted").lte("nudge_at", new Date(now).toISOString()),
      db.from("comment_drafts").select("posted_at").gte("posted_at", new Date(now - 30 * DAY).toISOString()),
    ]);

  // Last week's posts, with numbers where an export has them.
  const inLast = (at: string | null, days: number) => Boolean(at) && Date.parse(at!) <= now && now - Date.parse(at!) < days * DAY;
  const lastWeek = recent.filter((r) => inLast(r.at, 7));
  const multipliers = reachMultipliers(performance);
  const recentPerf = performance.filter((p) => inLast(p.publishedAt, 7) && multipliers.has(p.id));
  const bestPerf = [...recentPerf].sort((a, b) => multipliers.get(b.id)! - multipliers.get(a.id)!)[0];
  const daily = await db
    .from("account_daily")
    .select("day,impressions,new_followers")
    .gte("day", new Date(now - 14 * DAY).toISOString().slice(0, 10));
  const cut = new Date(now - 7 * DAY).toISOString().slice(0, 10);
  const sum = (rows: { impressions: number | null }[]) => (rows.some((r) => r.impressions !== null) ? rows.reduce((t, r) => t + (r.impressions ?? 0), 0) : null);
  const thisWeek = (daily.data ?? []).filter((d) => d.day > cut);
  const before = (daily.data ?? []).filter((d) => d.day <= cut);
  const followers = thisWeek.some((d) => d.new_followers !== null) ? thisWeek.reduce((t, d) => t + (d.new_followers ?? 0), 0) : null;

  const { suggestions } = await postThisNext({ now, pillars, recent: recent.slice(0, 10), performance, upcoming });

  const warm = await db
    .from("connections")
    .select("name,reason")
    .eq("status", "suggested")
    .eq("source", "engaged")
    .order("priority", { ascending: false })
    .limit(3);

  const nudges: string[] = [];
  if (saved.count) nudges.push(`You saved ${saved.count} role${saved.count > 1 ? "s" : ""} over six days ago and haven't applied.`);
  if (dueLeads.count) nudges.push(`${dueLeads.count} lead${dueLeads.count > 1 ? "s are" : " is"} due a follow-up.`);

  const roundsDue = ((people.data ?? []) as Pick<WatchPerson, "tier" | "last_visited_at">[]).filter(
    (p) => overdueDays(p as WatchPerson, now) >= 0,
  ).length;

  const isFirstMonday = new Date(now + 5 * 3_600_000).getUTCDate() <= 7;
  const lastImport = account.lastImport ? Date.parse(account.lastImport) : null;

  return {
    weekOf: new Date(now - 7 * DAY).toISOString().slice(0, 10),
    lastWeek: {
      posts: lastWeek.length,
      best: bestPerf
        ? { text: firstLine(bestPerf.text) ?? "A post", multiplier: multipliers.get(bestPerf.id)!, url: bestPerf.url }
        : null,
      medianMultiplier: median(recentPerf.map((p) => multipliers.get(p.id)!)),
      impressions: sum(thisWeek),
      impressionsBefore: sum(before),
      newFollowers: followers,
      searchAppearances: (stats.data?.[0]?.search_appearances as number | null | undefined) ?? null,
      foundBy: (stats.data?.[0]?.found_by as string[] | undefined) ?? [],
    },
    plan: suggestions.slice(0, 3),
    people: {
      replies: events.count ?? 0,
      roundsDue,
      warm: (warm.data ?? []).map((w) => ({ title: w.name, sub: w.reason ?? "", href: "/network" })),
    },
    jobs: (jobs.data ?? []).map((j) => ({
      title: `${j.title}, ${j.company}`,
      sub: [j.location_raw, `fit ${j.score}`].filter(Boolean).join(", "),
      href: `/jobs#job-${j.id}`,
    })),
    leads: (leads.data ?? []).map((l) => ({
      title: l.wants ?? "Lead",
      sub: [l.who, `fit ${l.score}`].filter(Boolean).join(", "),
      href: `/leads#lead-${l.id}`,
    })),
    nudges,
    experiment: pickExperiment(recent, performance, multipliers, now),
    uploadDue: !lastImport || now - lastImport > 6 * DAY,
    progress: isFirstMonday ? progress(recent, pillars, comments.data?.length ?? 0, now) : null,
  };
}

/** One thing to try this week, from his own record. */
function pickExperiment(
  recent: Awaited<ReturnType<typeof recentPosts>>,
  performance: Awaited<ReturnType<typeof postPerformance>>,
  multipliers: Map<string, number>,
  now: number,
): string {
  const strongText = performance
    .filter((p) => p.format === "text" && p.publishedAt && now - Date.parse(p.publishedAt) < 42 * DAY && (multipliers.get(p.id) ?? 0) >= 1.3)
    .sort((a, b) => multipliers.get(b.id)! - multipliers.get(a.id)!)[0];
  if (strongText) return `Turn "${firstLine(strongText.text)}" into a carousel. It reached ${multipliers.get(strongText.id)!.toFixed(1)}x your median as text.`;
  const last10 = recent.slice(0, 10);
  if (last10.length >= 3 && !last10.some((r) => r.format === "carousel")) return "Post one carousel. None of your recent posts were one, and they reach furthest on LinkedIn.";
  if (last10.length >= 3 && last10.every((r) => r.format === "carousel")) return "Post one text-only piece. All your recent posts were carousels; mixing formats keeps the feed testing you with new readers.";
  if (last10.length >= 4) return "Post once at 9 am PKT instead of 6 pm, to test Gulf mornings against your usual slot.";
  return "Post twice this week, Tuesday and Thursday at 6 pm PKT. A steady rhythm is how the feed learns who to show you to.";
}

function progress(
  recent: Awaited<ReturnType<typeof recentPosts>>,
  pillars: Awaited<ReturnType<typeof listPillars>>,
  comments30: number,
  now: number,
) {
  // Consecutive weeks, counting back from last week, with at least one post.
  let streakWeeks = 0;
  for (let w = 0; w < 52; w++) {
    const from = now - (w + 1) * 7 * DAY;
    const to = now - w * 7 * DAY;
    if (recent.some((r) => r.at && Date.parse(r.at) >= from && Date.parse(r.at) < to)) streakWeeks++;
    else break;
  }
  const month = recent.filter((r) => r.at && Date.parse(r.at) <= now && now - Date.parse(r.at) < 30 * DAY);
  const scored = month.filter((r) => r.pillar_similarity !== null);
  const build = pillars.find((p) => p.position === 3);
  return {
    streakWeeks,
    onLane: scored.length ? scored.filter((r) => r.pillar_similarity! >= ON_PILLAR).length / scored.length : null,
    ownWork: month.length && build ? month.filter((r) => r.pillar_id === build.id).length / month.length : null,
    comments30,
  };
}

function firstLine(text: string | null): string | null {
  const line = text?.trim().split("\n")[0]?.trim();
  return line ? (line.length > 90 ? `${line.slice(0, 87).trimEnd()}...` : line) : null;
}
