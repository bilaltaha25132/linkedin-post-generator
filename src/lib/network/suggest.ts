import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";

// Builds the connection queue from what the app already knows. Nothing here
// reads LinkedIn: names come from the email bridge, his logged comments, leads,
// saved jobs and his watchlist, and he finds each person himself.

const WARM_DAYS = 14;
const SELF = /^bilal taha$/i;

interface Candidate {
  name: string;
  source: string;
  kind: "connect" | "follow";
  reason: string;
  priority: number;
  headline?: string | null;
  profile_url?: string | null;
  search_query?: string | null;
}

/** A display name that is one person, not "Sara and 3 others" or a page. */
function personName(raw: string | null | undefined): string | null {
  const name = raw?.replace(/\s+/g, " ").trim();
  if (!name || name.length < 3 || name.length > 80) return null;
  if (/\d|\band\b|\bothers?\b|^unknown$|linkedin/i.test(name) || SELF.test(name)) return null;
  return name;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export async function syncSuggestions(now: number): Promise<number> {
  const db = supabaseAdmin();
  const since = new Date(now - WARM_DAYS * 86_400_000).toISOString();
  const [events, comments, leads, jobs, watch, existing] = await Promise.all([
    db.from("engagement_events").select("kind,actor_name").in("kind", ["comment", "reaction", "mention"]).gte("occurred_at", since),
    db.from("comment_drafts").select("captured_posts(author_name)").gte("posted_at", since),
    db
      .from("leads")
      .select("who,wants,score,score_detail,url")
      .in("status", ["new", "contacted", "talking"])
      .gte("score", 70)
      .not("who", "is", null),
    db.from("jobs").select("company,title,status").in("status", ["saved", "applied", "interviewing"]).is("closed_at", null),
    db.from("watch_people").select("name,profile_url,topics").eq("tier", "A").eq("kind", "person"),
    db.from("connections").select("id,name,source,status"),
  ]);
  for (const r of [events, comments, leads, jobs, watch, existing]) if (r.error) throw new Error(r.error.message);

  const out: Candidate[] = [];

  // Warm: people who engaged with his posts. Comments count for more than reactions.
  const engaged = new Map<string, { comments: number; reactions: number }>();
  for (const e of events.data ?? []) {
    const name = personName(e.actor_name);
    if (!name) continue;
    const row = engaged.get(name) ?? { comments: 0, reactions: 0 };
    if (e.kind === "reaction") row.reactions++;
    else row.comments++;
    engaged.set(name, row);
  }
  for (const [name, n] of engaged) {
    const parts = [n.comments ? plural(n.comments, "comment") : null, n.reactions ? plural(n.reactions, "reaction") : null].filter(Boolean);
    out.push({
      name,
      source: "engaged",
      kind: "connect",
      reason: `${parts.join(" and ")} on your posts in the last two weeks.`,
      priority: 80 + Math.min(15, n.comments * 5 + n.reactions),
      search_query: name,
    });
  }

  // Warm: people whose posts he commented on.
  const commented = new Map<string, number>();
  for (const c of (comments.data ?? []) as unknown as { captured_posts: { author_name: string | null } | null }[]) {
    const name = personName(c.captured_posts?.author_name);
    if (name) commented.set(name, (commented.get(name) ?? 0) + 1);
  }
  for (const [name, n] of commented) {
    out.push({
      name,
      source: "commented",
      kind: "connect",
      reason: `You commented on ${n > 1 ? `${n} of their posts` : "their post"} recently.`,
      priority: 60 + Math.min(10, n * 3),
      search_query: name,
    });
  }

  // Founders and hiring managers behind strong leads.
  for (const l of leads.data ?? []) {
    const whoType = (l.score_detail as { who_type?: string } | null)?.who_type;
    const name = personName(l.who);
    if (!name || (whoType !== "founder" && whoType !== "hiring manager")) continue;
    out.push({
      name,
      source: "lead",
      kind: "connect",
      reason: `${whoType === "founder" ? "Founder" : "Hiring manager"} behind a lead: ${(l.wants ?? "").slice(0, 140)}`,
      priority: 70 + Math.round((l.score ?? 0) / 10),
      search_query: name,
    });
  }

  // The people hiring for roles he saved or applied to; he finds them by search.
  const companies = new Map<string, { title: string; status: string }>();
  for (const j of jobs.data ?? []) if (!companies.has(j.company)) companies.set(j.company, { title: j.title, status: j.status });
  for (const [company, { title, status }] of companies) {
    out.push({
      name: `Hiring manager at ${company}`,
      source: "hiring",
      kind: "connect",
      headline: title,
      reason: `You ${status === "saved" ? "saved" : "applied to"} their "${title}" role. A note to the person hiring is often read before the application.`,
      priority: 55,
      search_query: `${company} engineering manager AI`,
    });
  }

  // Top voices: follow, don't connect.
  for (const w of watch.data ?? []) {
    const name = personName(w.name);
    if (!name) continue;
    out.push({
      name,
      source: "watch",
      kind: "follow",
      reason: "A top voice on your rounds list. Follow to see their posts; a connection request rarely lands.",
      priority: 30,
      profile_url: w.profile_url,
      search_query: name,
    });
  }

  // One row per person: an earlier row (any source, any status) wins, except a
  // still-suggested row from the same source, which gets the fresh reason.
  const byName = new Map((existing.data ?? []).map((c) => [c.name.toLowerCase(), c]));
  const seen = new Set<string>();
  let added = 0;
  for (const c of out.sort((a, b) => b.priority - a.priority)) {
    const key = c.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const prior = byName.get(key);
    if (prior) {
      if (prior.status === "suggested" && prior.source === c.source) {
        await db.from("connections").update({ reason: c.reason, priority: c.priority }).eq("id", prior.id);
      }
      continue;
    }
    const { error } = await db.from("connections").insert({ ...c, status: "suggested" });
    if (!error) added++;
  }
  return added;
}
