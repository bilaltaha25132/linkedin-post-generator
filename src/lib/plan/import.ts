import "server-only";

import { embed } from "@/lib/llm/embeddings";
import { activityIdOf } from "@/lib/links/deep";
import { hookType } from "@/lib/plan/metrics";
import type { AccountExport, PostExport, Share } from "@/lib/plan/parse";
import { supabaseAdmin } from "@/lib/supabase/server";

// Writes his own LinkedIn exports into the Strategist tables. A post can arrive
// from three places with three different IDs (TOP POSTS gives an activity URL,
// Shares.csv a share URN, our publisher a share or ugcPost URN), so rows are
// matched by URL, then URN, then by day plus text.

export interface ImportResult {
  posts: number;
  matched: number;
  days: number;
  embedded: number;
}

const today = () => new Date().toISOString().slice(0, 10);
const day = (iso: string | null) => iso?.slice(0, 10) ?? null;

function canonical(url: string): { url: string; urn: string | null } {
  const id = activityIdOf(url);
  return id
    ? { url: `https://www.linkedin.com/feed/update/urn:li:activity:${id}/`, urn: `urn:li:activity:${id}` }
    : { url, urn: null };
}

export async function importAccount(data: AccountExport): Promise<ImportResult> {
  const db = supabaseAdmin();
  const days = new Map<string, Record<string, number | null>>();
  for (const d of data.daily) days.set(d.day, { impressions: d.impressions, engagements: d.engagements });
  for (const f of data.followers.daily) days.set(f.day, { ...days.get(f.day), new_followers: f.newFollowers });
  const lastDay = [...days.keys()].sort().at(-1);
  if (lastDay && data.followers.total !== null) days.set(lastDay, { ...days.get(lastDay), total_followers: data.followers.total });
  if (days.size) {
    const { error } = await db.from("account_daily").upsert([...days.entries()].map(([d, v]) => ({ day: d, ...v })));
    if (error) throw new Error(error.message);
  }

  if (data.demographics.length) {
    await db.from("audience_snapshot").delete().eq("imported_at", today());
    const { error } = await db
      .from("audience_snapshot")
      .insert(data.demographics.map((d) => ({ imported_at: today(), kind: d.kind, label: d.label.slice(0, 200), share: d.share })));
    if (error) throw new Error(error.message);
  }

  let matched = 0;
  for (const p of data.topPosts) {
    const { id, existed } = await findOrCreate(p.url, p.publishedAt, null);
    if (existed) matched++;
    const metrics: Record<string, number> = {};
    if (p.impressions !== null) metrics.impressions = p.impressions;
    if (p.engagements !== null) metrics.engagements = p.engagements;
    const { error } = await db.from("post_metrics").upsert({ linkedin_post_id: id, day: today(), ...metrics });
    if (error) throw new Error(error.message);
  }
  await linkOwnPosts();
  return { posts: data.topPosts.length, matched, days: days.size, embedded: 0 };
}

export async function importPost(data: PostExport): Promise<ImportResult> {
  const { id, existed } = await findOrCreate(data.url, data.publishedAt, null);
  const fields = {
    impressions: data.impressions,
    reached: data.reached,
    reactions: data.reactions,
    comments: data.comments,
    reposts: data.reposts,
    saves: data.saves,
    sends: data.sends,
    profile_views: data.profileViews,
    followers_gained: data.followersGained,
  };
  const { error } = await supabaseAdmin()
    .from("post_metrics")
    .upsert({ linkedin_post_id: id, day: today(), ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== null)) });
  if (error) throw new Error(error.message);
  await linkOwnPosts();
  return { posts: 1, matched: existed ? 1 : 0, days: 0, embedded: 0 };
}

/** One batch of Shares.csv. Re-shares with nothing of his own are skipped. */
export async function importShares(shares: Share[]): Promise<ImportResult> {
  const db = supabaseAdmin();
  let posts = 0;
  let matched = 0;
  for (const s of shares) {
    if (!s.text.trim()) continue;
    const urn = s.url.match(/urn:li:(share|ugcPost|activity):\d+/)?.[0] ?? null;
    const { id, existed } = await findOrCreate(s.url, s.date, urn, s.text);
    posts++;
    if (existed) matched++;
    await db
      .from("linkedin_posts")
      .update({
        text: s.text,
        published_at: s.date,
        format: s.mediaUrl ? "media" : s.sharedUrl ? "link" : "text",
        hook_type: hookType(s.text),
      })
      .eq("id", id)
      .is("text", null);
  }
  const embedded = await embedMissing(Date.now() + 40_000);
  return { posts, matched, days: 0, embedded };
}

async function findOrCreate(
  rawUrl: string,
  publishedAt: string | null,
  urn: string | null,
  text?: string,
): Promise<{ id: string; existed: boolean }> {
  const db = supabaseAdmin();
  const c = canonical(rawUrl);
  const key = urn ?? c.urn;

  const or = [`url.eq."${c.url}"`, key ? `urn.eq."${key}"` : null].filter(Boolean).join(",");
  const { data: direct } = await db.from("linkedin_posts").select("id").or(or).limit(1);
  if (direct?.[0]) return { id: direct[0].id as string, existed: true };

  const d = day(publishedAt);
  if (d) {
    const next = new Date(Date.parse(d) + 86_400_000).toISOString().slice(0, 10);
    const { data: sameDay } = await db
      .from("linkedin_posts")
      .select("id,url,urn,text")
      .gte("published_at", d)
      .lt("published_at", next);
    const rows = sameDay ?? [];
    // A share and a TOP POSTS row for the same day are the same post when it's the only one.
    const byText = text ? rows.find((r) => r.text && (r.text as string).slice(0, 80) === text.slice(0, 80)) : null;
    const lone = rows.length === 1 && (text ? !rows[0].text : !rows[0].url?.includes("urn:li:activity")) ? rows[0] : null;
    const hit = byText ?? lone;
    if (hit) {
      const patch: Record<string, string> = {};
      if (c.urn && !hit.url?.includes("urn:li:activity")) patch.url = c.url;
      if (Object.keys(patch).length) await db.from("linkedin_posts").update(patch).eq("id", hit.id);
      return { id: hit.id as string, existed: true };
    }
  }

  const { data, error } = await db
    .from("linkedin_posts")
    .insert({ url: c.urn ? c.url : rawUrl, urn: key, published_at: publishedAt })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id as string, existed: false };
}

/** Joins imported posts to drafts he marked posted with a pasted LinkedIn URL. */
async function linkOwnPosts(): Promise<void> {
  const db = supabaseAdmin();
  const { data: own } = await db
    .from("posts")
    .select("id,external_url,linkedin_urn,body")
    .eq("status", "posted")
    .or("external_url.not.is.null,linkedin_urn.not.is.null");
  for (const p of own ?? []) {
    const activity = p.external_url ? activityIdOf(p.external_url as string) : null;
    const keys = [activity ? `urn.eq."urn:li:activity:${activity}"` : null, p.linkedin_urn ? `urn.eq."${p.linkedin_urn}"` : null].filter(Boolean);
    if (!keys.length) continue;
    await db
      .from("linkedin_posts")
      .update({ post_id: p.id })
      .or(keys.join(","))
      .is("post_id", null);
  }
}

/** Embeds imported posts that have text, then gives them a pillar. */
export async function embedMissing(deadline: number): Promise<number> {
  const db = supabaseAdmin();
  await ensurePillarEmbeddings();
  const { data } = await db
    .from("linkedin_posts")
    .select("id,text")
    .is("embedding", null)
    .not("text", "is", null)
    .limit(60);
  let done = 0;
  const queue = data ?? [];
  let cursor = 0;
  const worker = async () => {
    while (cursor < queue.length && Date.now() < deadline) {
      const row = queue[cursor++];
      const vector = await embed(row.text as string);
      if (!vector) continue;
      await db.from("linkedin_posts").update({ embedding: vector }).eq("id", row.id);
      done++;
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  await db.rpc("assign_pillars");
  return done;
}

export async function ensurePillarEmbeddings(): Promise<void> {
  const db = supabaseAdmin();
  const { data } = await db.from("pillars").select("id,name,description").is("embedding", null);
  for (const p of data ?? []) {
    const vector = await embed(`${p.name}. ${p.description}`);
    if (vector) await db.from("pillars").update({ embedding: vector }).eq("id", p.id);
  }
}
