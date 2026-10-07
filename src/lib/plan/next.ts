import "server-only";

import { embedTopStories } from "@/lib/discoveries/embed";
import { bucketBy, median, reachMultipliers, type PostPerf } from "@/lib/plan/metrics";
import type { Pillar, RecentPost, Upcoming } from "@/lib/plan/queries";
import { nextSlots } from "@/lib/plan/slot";
import { supabaseAdmin } from "@/lib/supabase/server";

// "Post this next" (docs/growth/strategist.md): wire stories ranked by
// relevance x freshness x pillar fit x balance x skill demand, plus follow-ups
// to his own winners and repurposes of strong text posts.

/** Below this a story or post isn't about any pillar (AI items sit at 0.6-0.7). */
export const ON_PILLAR = 0.6;
const DRIFT_WINDOW = 10;
const DRIFT_MIN = 8;

export interface Suggestion {
  kind: "story" | "follow-up" | "repurpose" | "build";
  title: string;
  /** The wire's suggested angle, for stories. */
  angle?: string;
  why: string[];
  pillarId: string | null;
  format: "text" | "carousel";
  slot: string | null;
  href: string;
  score: number;
}

export interface Mix {
  pillars: { id: string; name: string; target: number; count: number }[];
  total: number;
  onPillar: number;
  drifting: boolean;
  ownWork: number;
}

interface StoryRow {
  id: string;
  title: string;
  relevance_score: number;
  suggested_angle: string | null;
  topics: string[] | null;
  published_at: string | null;
  discovered_at: string;
  pillar_id: string;
  pillar_similarity: number;
}

export function pillarMix(pillars: Pillar[], recent: RecentPost[]): Mix {
  const last = recent.slice(0, DRIFT_WINDOW);
  const scored = last.filter((p) => p.pillar_similarity !== null);
  const onPillar = scored.filter((p) => p.pillar_similarity! >= ON_PILLAR).length;
  const build = pillars.find((p) => p.position === 3);
  return {
    pillars: pillars.map((p) => ({
      id: p.id,
      name: p.name,
      target: p.target_share,
      count: last.filter((r) => r.pillar_id === p.id).length,
    })),
    total: last.length,
    onPillar,
    drifting: scored.length >= DRIFT_WINDOW && onPillar < DRIFT_MIN,
    ownWork: build ? recent.slice(0, 4).filter((r) => r.pillar_id === build.id).length : 0,
  };
}

/** Skills from his strong job matches this month, most asked-for first. */
export async function skillDemand(now: number): Promise<{ skill: string; n: number }[]> {
  const { data } = await supabaseAdmin()
    .from("jobs")
    .select("score_detail")
    .gte("score", 55)
    .gte("first_seen_at", new Date(now - 30 * 86_400_000).toISOString())
    .limit(300);
  const counts = new Map<string, number>();
  for (const j of data ?? []) {
    const skills = (j.score_detail as { stack_overlap?: string[] } | null)?.stack_overlap ?? [];
    for (const s of skills) {
      const key = s.trim().toLowerCase();
      if (key.length >= 2) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .map(([skill, n]) => ({ skill, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 15);
}

function mentions(text: string, skill: string): boolean {
  const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i").test(text);
}

function ageHours(story: StoryRow, now: number): number {
  return (now - Date.parse(story.published_at ?? story.discovered_at)) / 3_600_000;
}

/** News fades after two days; anything older than a week is off the list. */
function freshness(hours: number): number {
  if (hours <= 24) return 1;
  if (hours <= 48) return 0.85;
  return Math.max(0.3, 0.85 - (hours - 48) / 240);
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export async function postThisNext(input: {
  now: number;
  pillars: Pillar[];
  recent: RecentPost[];
  performance: PostPerf[];
  upcoming: Upcoming[];
}): Promise<{ suggestions: Suggestion[]; mix: Mix; skills: { skill: string; n: number }[] }> {
  const { now, pillars, recent, performance, upcoming } = input;
  const mix = pillarMix(pillars, recent);
  const nameOf = new Map(pillars.map((p) => [p.id, p.name]));
  const lastSix = recent.slice(0, 6);

  await embedTopStories({ hours: 7 * 24, minScore: 60, limit: 12 });
  const [{ data: rows }, skills] = await Promise.all([
    supabaseAdmin().rpc("discovery_pillars", {
      since: new Date(now - 7 * 86_400_000).toISOString(),
      min_score: 60,
      max_rows: 60,
    }),
    skillDemand(now),
  ]);

  const multipliers = reachMultipliers(performance);
  const formats = bucketBy(performance, multipliers, (p) => (p.format === "media" ? "carousel" : p.format));
  const carouselLift = formats.find((b) => b.key === "carousel")?.medianMultiplier ?? null;
  const textLift = formats.find((b) => b.key === "text")?.medianMultiplier ?? null;
  const preferCarousel = carouselLift !== null && textLift !== null && carouselLift > textLift * 1.15;

  const out: Suggestion[] = [];
  for (const s of (rows ?? []) as StoryRow[]) {
    const hours = ageHours(s, now);
    if (hours > 7 * 24) continue;
    const fit = s.pillar_similarity;
    if (fit < ON_PILLAR - 0.05) continue;
    if (mix.drifting && fit < ON_PILLAR) continue;

    const why: string[] = [];
    const ago = hours < 1 ? "under an hour" : hours < 48 ? plural(Math.round(hours), "hour") : plural(Math.round(hours / 24), "day");
    why.push(`${ago} old, scored ${s.relevance_score} on the wire`);

    let score = (s.relevance_score / 100) * freshness(hours) * Math.min(1.2, Math.max(0.6, fit / ON_PILLAR));
    if (!lastSix.some((r) => r.pillar_id === s.pillar_id) && recent.length) {
      score *= 1.3;
      why.push(`none of your last ${Math.min(6, recent.length)} posts were ${nameOf.get(s.pillar_id) ?? "this pillar"}`);
    }
    const text = [s.title, ...(s.topics ?? [])].filter(Boolean).join(" ");
    const asked = skills.find((k) => mentions(text, k.skill));
    if (asked) {
      score *= 1.15;
      why.push(`${asked.skill} came up in ${asked.n} of your strong job matches this month`);
    }
    const format = preferCarousel && s.relevance_score >= 75 ? "carousel" : "text";
    if (format === "carousel") why.push(`your carousels reach ${(carouselLift! / textLift!).toFixed(1)}x your text posts`);

    out.push({
      kind: "story",
      title: s.title,
      angle: s.suggested_angle ?? undefined,
      why,
      pillarId: s.pillar_id,
      format,
      slot: null,
      href: `/generate/${s.id}`,
      score,
    });
  }

  // Winner follow-up: 1.5x his median reach in the last week earns a part two.
  for (const p of performance) {
    if (!p.publishedAt || !p.text) continue;
    const days = (now - Date.parse(p.publishedAt)) / 86_400_000;
    const m = multipliers.get(p.id);
    if (days <= 7 && m !== undefined && m >= 1.5) {
      out.push({
        kind: "follow-up",
        title: `Follow up on "${firstLine(p.text)}"`,
        why: [`reached ${m.toFixed(1)}x your median ${plural(Math.max(1, Math.round(days)), "day")} ago`, "a part two, deep dive or carousel version keeps the readers it found"],
        pillarId: p.pillarId,
        format: p.format === "media" ? "text" : "carousel",
        slot: null,
        href: `/write?idea=${encodeURIComponent(`Follow-up to my post that did well:\n\n${p.text.slice(0, 1500)}`)}`,
        score: 0.95,
      });
    }
  }

  // Repurpose: a strong text post from 3-6 weeks ago becomes a carousel.
  const reaches = [...multipliers.values()];
  const strong = median(reaches);
  const repurpose = performance
    .filter((p) => {
      if (!p.publishedAt || !p.text || p.format !== "text") return false;
      const days = (now - Date.parse(p.publishedAt)) / 86_400_000;
      const m = multipliers.get(p.id);
      return days >= 21 && days <= 42 && m !== undefined && strong !== null && m >= 1.3;
    })
    .sort((a, b) => multipliers.get(b.id)! - multipliers.get(a.id)!)[0];
  if (repurpose) {
    out.push({
      kind: "repurpose",
      title: `Turn "${firstLine(repurpose.text!)}" into a carousel`,
      why: [`reached ${multipliers.get(repurpose.id)!.toFixed(1)}x your median`, "a carousel version 3-6 weeks later finds new readers"],
      pillarId: repurpose.pillarId,
      format: "carousel",
      slot: null,
      href: `/write?idea=${encodeURIComponent(`Carousel version of this post:\n\n${repurpose.text!.slice(0, 1500)}`)}`,
      score: 0.8,
    });
  }

  // Build-in-public quota: at least one in four posts shows his own work.
  const build = pillars.find((p) => p.position === 3);
  if (build && recent.length >= 4 && mix.ownWork === 0) {
    out.push({
      kind: "build",
      title: "Show something you built or shipped",
      why: ["none of your last 4 posts showed your own work", "one in four is the floor: it's how clients and recruiters see what you do"],
      pillarId: build.id,
      format: "text",
      slot: null,
      href: `/write?idea=${encodeURIComponent("Something I built or shipped recently, with the numbers from it:\n\n")}`,
      score: 0.9,
    });
  }

  // The wire often carries one release from several outlets; keep the strongest.
  const ranked: Suggestion[] = [];
  for (const s of out.sort((a, b) => b.score - a.score)) {
    if (ranked.length >= 5) break;
    if (!ranked.some((r) => overlap(r, s) >= 0.3 || (overlap(r, s) >= 0.15 && sameName(r, s)))) ranked.push(s);
  }
  const slots = nextSlots(now, ranked.length, upcoming.map((u) => Date.parse(u.at)));
  ranked.forEach((s, i) => (s.slot = slots[i]?.toISOString() ?? null));
  return { suggestions: ranked, mix, skills };
}

function firstLine(text: string): string {
  const line = text.trim().split("\n")[0].trim();
  return line.length > 80 ? `${line.slice(0, 77).trimEnd()}...` : line;
}

const STOP = new Set(["the", "and", "for", "with", "that", "this", "what", "from", "your", "into", "about", "just", "here", "real", "why", "how", "are", "its", "it's", "new", "now"]);

function words(s: Suggestion): Set<string> {
  return new Set(
    `${s.title} ${s.angle ?? ""}`
      .toLowerCase()
      .split(/[^a-z0-9.]+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
}

function overlap(a: Suggestion, b: Suggestion): number {
  const x = words(a);
  const y = words(b);
  const shared = [...x].filter((w) => y.has(w)).length;
  return shared / Math.min(x.size, y.size || 1);
}

/** Product names like EmbeddingGemma or GPT-5 in one title, found in the other. */
function sameName(a: Suggestion, b: Suggestion): boolean {
  const names = (t: string) => (t.match(/\b[A-Za-z]*(?:[a-z][A-Z]|[A-Za-z]\d|\d[A-Za-z])[\w.-]*/g) ?? []).map((n) => n.toLowerCase().replace(/[-.]?\d.*$/, ""));
  const bTitle = b.title.toLowerCase();
  const aTitle = a.title.toLowerCase();
  return names(a.title).some((n) => n.length > 3 && bTitle.includes(n)) || names(b.title).some((n) => n.length > 3 && aTitle.includes(n));
}
