import { aiTells } from "@/lib/voice/tells";

// Quiet checks on a draft before it goes out (docs/growth/strategist.md).
// They warn and never change the text.

export interface Check {
  key: string;
  message: string;
}

const BAIT =
  /\b(comment ["“']?\w+["”']? (below|if)|type ["“']?\w+["”']? (below|in the comments)|agree\?|thoughts\?$|repost if|like if|tag (someone|a friend)|drop a .{1,12} below|follow me for more)\b/im;
const TEACHING = /\b(how to|steps?|lessons?|mistakes?|tips?|framework|checklist|guide|here'?s what|what i learned)\b/i;
const ARTIFACT = /(^\s*(\d+[.)]|[-•→])\s+\S)|\|.+\|/m;

export function preflight(body: string, opts: { carousel?: boolean } = {}): Check[] {
  const text = body.trim();
  if (!text) return [];
  const checks: Check[] = [];
  const chars = text.length;

  const [min, max] = opts.carousel ? [600, 1000] : [1100, 2200];
  if (chars < min || chars > max) {
    checks.push({
      key: "length",
      message: `${chars.toLocaleString("en")} characters. ${opts.carousel ? "Carousel captions" : "Posts"} do best at ${min.toLocaleString("en")}-${max.toLocaleString("en")}.`,
    });
  }

  const hook = text.split("\n")[0].trim();
  if (hook.length > 120) {
    checks.push({ key: "hook-long", message: `The first line is ${hook.length} characters; past about 120 it's cut off behind "see more".` });
  } else if (!/\d|[A-Z][a-z]+[A-Z]|\b[A-Z]{2,}\b|\b(I|we) (built|shipped|tested|measured|found|spent)\b/.test(hook) && hook.split(/\s+/).length > 3) {
    checks.push({ key: "hook-vague", message: "The first line has no number, name or concrete claim to stop the scroll." });
  }

  const tags = text.match(/(^|\s)#[\p{L}\d_]+/gu) ?? [];
  if (tags.length) {
    checks.push({ key: "hashtags", message: `${tags.length} hashtag${tags.length > 1 ? "s" : ""}. They no longer add reach; keep them only if you want them.` });
  }
  const links = text.match(/https?:\/\/\S+/g) ?? [];
  if (links.length) {
    checks.push({ key: "links", message: "A link in the post costs some reach. Fine if it's the subject; otherwise put it in the first comment." });
  }
  if (BAIT.test(text)) {
    checks.push({ key: "bait", message: 'Reads as engagement bait ("comment YES", "agree?", "repost if"). LinkedIn demotes it.' });
  }
  const mentions = text.match(/(^|\s)@[\p{L}]/gu) ?? [];
  if (mentions.length > 3) {
    checks.push({ key: "tags", message: `${mentions.length} people or pages tagged. Keep it to 3 who are actually involved.` });
  }
  if (TEACHING.test(text) && !ARTIFACT.test(text) && !opts.carousel) {
    checks.push({ key: "save", message: "A teaching post with nothing to keep. A short list, table or your own numbers earns saves." });
  }
  if (/[—–]/.test(text)) {
    checks.push({ key: "dashes", message: "Has em or en dashes. Commas or full stops read more naturally." });
  }
  for (const tell of aiTells(text).slice(0, 3)) {
    checks.push({ key: `tell:${tell}`, message: `Reads as generated: ${tell}` });
  }
  return checks;
}

/** Cadence checks against the posts already out or scheduled. */
export function cadenceChecks(at: number, others: { at: number; format: string | null }[], format: string | null): Check[] {
  const checks: Check[] = [];
  const near = others.filter((o) => Math.abs(o.at - at) < 24 * 3_600_000);
  if (near.length) checks.push({ key: "24h", message: "Another post goes out within 24 hours of this one. Each would cut the other's reach." });
  const week = others.filter((o) => o.at <= at && at - o.at < 7 * 86_400_000);
  if (week.length >= 4) checks.push({ key: "week", message: `${week.length + 1} posts in seven days. Past four, reach per post drops.` });
  const lastThree = [...others].filter((o) => o.at < at).sort((a, b) => b.at - a.at).slice(0, 2);
  if (format && lastThree.length === 2 && lastThree.every((o) => o.format === format)) {
    checks.push({ key: "format", message: `Third ${format} in a row. Mixing formats keeps the feed testing you with new readers.` });
  }
  return checks;
}
