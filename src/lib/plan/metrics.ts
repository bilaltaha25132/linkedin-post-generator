// Numbers for the Strategist, computed from his own exports. Small samples:
// everything is a median, and every bucket carries its n.

export interface PostPerf {
  id: string;
  url: string | null;
  publishedAt: string | null;
  text: string | null;
  format: string | null;
  pillarId: string | null;
  hookType: string | null;
  impressions: number | null;
  engagements: number | null;
  reactions: number | null;
  comments: number | null;
  reposts: number | null;
  saves: number | null;
  sends: number | null;
  profileViews: number | null;
  followersGained: number | null;
  reached: number | null;
}

export interface Bucket {
  key: string;
  n: number;
  medianMultiplier: number | null;
}

/** Fewer posts than this and a bucket isn't shown at all. */
export const MIN_BUCKET = 3;
/** Below this a bucket is shown as a weak signal. */
export const SOLID_BUCKET = 5;

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Impressions over his median for the 90 days before the post, so account
 * growth doesn't flatter newer posts. Falls back to the all-time median.
 */
export function reachMultipliers(posts: PostPerf[]): Map<string, number> {
  const withReach = posts.filter((p) => p.impressions !== null && p.publishedAt);
  const all = median(withReach.map((p) => p.impressions!));
  const out = new Map<string, number>();
  for (const p of withReach) {
    const at = Date.parse(p.publishedAt!);
    const window = withReach
      .filter((q) => {
        const t = Date.parse(q.publishedAt!);
        return t < at && at - t <= 90 * 86_400_000;
      })
      .map((q) => q.impressions!);
    const base = window.length >= 3 ? median(window) : all;
    if (base) out.set(p.id, p.impressions! / base);
  }
  return out;
}

/** Followers gained per 1,000 people reached: the headline metric. */
export function followerConversion(p: PostPerf): number | null {
  const reach = p.reached ?? p.impressions;
  return p.followersGained !== null && reach ? (p.followersGained / reach) * 1000 : null;
}

/** Saves and sends count double: they're the signals LinkedIn rewards most. */
export function weightedEngagement(p: PostPerf): number | null {
  if (!p.impressions) return null;
  const parts = [p.reactions, p.comments, p.saves, p.sends, p.reposts];
  if (parts.every((x) => x === null)) return p.engagements !== null ? p.engagements / p.impressions : null;
  const [r, c, s, d, rp] = parts.map((x) => x ?? 0);
  return (r + 2 * c + 2 * s + 2 * d + 1.5 * rp) / p.impressions;
}

export function bucketBy(posts: PostPerf[], multipliers: Map<string, number>, keyOf: (p: PostPerf) => string | null): Bucket[] {
  const groups = new Map<string, number[]>();
  for (const p of posts) {
    const key = keyOf(p);
    const m = multipliers.get(p.id);
    if (!key || m === undefined) continue;
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }
  return [...groups.entries()]
    .map(([key, ms]) => ({ key, n: ms.length, medianMultiplier: median(ms) }))
    .filter((b) => b.n >= MIN_BUCKET)
    .sort((a, b) => (b.medianMultiplier ?? 0) - (a.medianMultiplier ?? 0));
}

const PKT_OFFSET_MS = 5 * 3_600_000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Weekday in Pakistan time, where he posts from. */
export function weekdayPkt(iso: string): string {
  return WEEKDAYS[new Date(Date.parse(iso) + PKT_OFFSET_MS).getUTCDay()];
}

/** A rough label for the opening line, for the hook table. */
export function hookType(text: string | null): string | null {
  const first = text?.trim().split("\n")[0]?.trim();
  if (!first) return null;
  if (/\?\s*$/.test(first)) return "question";
  if (/\b(i|we) (built|shipped|made|launched|deployed)\b/i.test(first)) return "I built";
  if (/^\s*[\d$£€]|\b\d+(\.\d+)?\s*(%|x|ms|k|m|hours?|days?|weeks?)\b/i.test(first)) return "number";
  if (/\b(released|launched|announced|just dropped|is out|new model|open[- ]sourced)\b/i.test(first)) return "news";
  if (/\b(wrong|myth|stop|overrated|don'?t|isn'?t|aren'?t|unpopular|nobody)\b/i.test(first)) return "contrarian";
  if (/\b(last (week|month|year)|yesterday|when i|i was|i spent)\b/i.test(first)) return "story";
  return "statement";
}
