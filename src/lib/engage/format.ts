import type { CommentShape, Tier, WatchPerson } from "@/lib/engage/types";

// Each rubric line is 0-2; a draft is shown at 9 of 12 or better.
export const PASS_SCORE = 9;

export const SHAPE_LABEL: Record<CommentShape, string> = {
  field_note: "Field note",
  counterpoint: "Counterpoint",
  question: "Question",
  from_source: "From the source",
};

/** When a comment still helps, by the post's age (docs/growth/engage.md). */
export function timingAdvice(postedAt: string | null, now: number): { label: string; tone: "good" | "ok" | "late" } | null {
  if (!postedAt) return null;
  const hours = (now - Date.parse(postedAt)) / 3_600_000;
  if (hours < 2) return { label: "Comment now", tone: "good" };
  if (hours < 6) return { label: "Still a good time", tone: "ok" };
  if (hours < 24) return { label: "Reply inside a thread instead", tone: "late" };
  return { label: "Old: skip unless you know the author", tone: "late" };
}

export function ageText(iso: string, now: number): string {
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `${hours} h ago` : `${Math.round(hours / 24)} days ago`;
}

// How often each tier is due a visit, in days.
const ROUND_DAYS: Record<Tier, number> = { A: 3, B: 5, C: 10, target: 7, warm: 14 };

/** Days overdue (negative while not yet due). Never visited counts as due now. */
export function overdueDays(person: WatchPerson, now: number): number {
  if (!person.last_visited_at) return ROUND_DAYS[person.tier];
  return (now - Date.parse(person.last_visited_at)) / 86_400_000 - ROUND_DAYS[person.tier];
}
