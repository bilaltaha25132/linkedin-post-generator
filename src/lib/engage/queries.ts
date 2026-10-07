import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import type { CapturedPost, EngagementEvent, Topic, WatchPerson } from "@/lib/engage/types";

const INBOX_DAYS = 14;

export async function listCapturedPosts(): Promise<CapturedPost[]> {
  const since = new Date(Date.now() - INBOX_DAYS * 86_400_000).toISOString();
  const { data, error } = await supabaseAdmin()
    .from("captured_posts")
    .select(
      "id,url,posted_at,author_name,text,via,matched_discovery_id,created_at,comment_drafts(id,shape,body,rubric,score,edited_body,posted_at),discoveries(title,url)",
    )
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) throw new Error(error.message);
  return data.map((row) => {
    const { comment_drafts: drafts, discoveries: story, ...rest } = row as typeof row & {
      comment_drafts: CapturedPost["drafts"];
      discoveries: CapturedPost["story"];
    };
    return { ...rest, drafts: [...drafts].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)), story } as CapturedPost;
  });
}

export async function listWatchPeople(): Promise<WatchPerson[]> {
  const { data, error } = await supabaseAdmin()
    .from("watch_people")
    .select("id,name,profile_url,kind,tier,topics,notes,bell,last_visited_at")
    .order("name");
  if (error) throw new Error(error.message);
  return data as WatchPerson[];
}

/** Comments and mentions on his own posts still waiting for a reply. */
export async function listOpenEvents(): Promise<EngagementEvent[]> {
  const { data, error } = await supabaseAdmin()
    .from("engagement_events")
    .select("id,kind,actor_name,preview,post_url,occurred_at,reply_draft")
    .eq("done", false)
    .in("kind", ["comment", "mention"])
    .order("occurred_at", { ascending: false })
    .limit(30);
  if (error) throw new Error(error.message);
  return data as EngagementEvent[];
}

/** The wire's strongest stories from the last day and a half: what people are posting about. */
export async function todaysTopics(people: WatchPerson[]): Promise<Topic[]> {
  const since = new Date(Date.now() - 36 * 3_600_000).toISOString();
  const { data, error } = await supabaseAdmin()
    .from("discoveries")
    .select("id,title,url,relevance_score,topics")
    .gte("discovered_at", since)
    .neq("status", "dismissed")
    .not("title", "is", null)
    .order("relevance_score", { ascending: false, nullsFirst: false })
    .limit(5);
  if (error) throw new Error(error.message);
  return data.map((d) => {
    const topics = ((d.topics as string[] | null) ?? []).map((t) => t.toLowerCase());
    const people_ = people
      .filter((p) => p.topics.some((t) => topics.includes(t.toLowerCase())))
      .map((p) => p.name)
      .slice(0, 4);
    return {
      id: d.id as string,
      title: d.title as string,
      url: d.url as string,
      score: d.relevance_score as number | null,
      topics: (d.topics as string[] | null) ?? [],
      people: people_,
    };
  });
}

export interface CommentStats {
  today: number;
  /** Set when most recent comments went to the same few people (an engagement-pod pattern). */
  podWarning: string | null;
}

/** Comments he logged as posted: today's count, and the pod guard over two weeks. */
export async function commentStats(): Promise<CommentStats> {
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const { data, error } = await supabaseAdmin()
    .from("comment_drafts")
    .select("posted_at,captured_posts(author_name)")
    .gte("posted_at", since);
  if (error) throw new Error(error.message);

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const rows = data as unknown as { posted_at: string; captured_posts: { author_name: string | null } | null }[];
  const today = rows.filter((r) => Date.parse(r.posted_at) >= dayStart.getTime()).length;

  const byAuthor = new Map<string, number>();
  for (const r of rows) {
    const name = r.captured_posts?.author_name;
    if (name) byAuthor.set(name, (byAuthor.get(name) ?? 0) + 1);
  }
  const top3 = [...byAuthor.values()].sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0);
  const podWarning =
    rows.length >= 8 && top3 / rows.length >= 0.7
      ? `${Math.round((top3 / rows.length) * 100)}% of your comments in two weeks went to three people. LinkedIn treats tight circles like that as an engagement pod and cuts their reach; spread them wider.`
      : null;
  return { today, podWarning };
}
