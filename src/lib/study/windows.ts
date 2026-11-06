import type { DaySpan, Program, WindowStatus } from "@/lib/study/types";

export type Intake = "summer" | "winter";

export type LiveWindow = {
  intake: Intake;
  /** The semester this window admits to, e.g. 2027. */
  year: number;
  start: Date | null;
  end: Date;
  status: "open" | "upcoming" | "closed";
  daysLeft: number;
};

const DAY = 86_400_000;

// Everything here is UTC, so the server render and the browser agree on the day.

/** The next intake of each kind he can still aim at: summer starts in April, winter in October. */
export function targetYears(now: Date): Record<Intake, number> {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  return { summer: m >= 5 ? y + 1 : y, winter: m >= 10 ? y + 1 : y };
}

function date(year: number, [month, day]: [number, number]): Date {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1, Math.min(day, last), 23, 59));
}

/**
 * Pin a recurring "1 October - 15 January" window to the year it admits to.
 * A summer window that ends between May and December closes the year before the
 * semester; a winter window ending in October to December does the same.
 */
export function liveWindow(span: DaySpan | null | undefined, intake: Intake, now: Date): LiveWindow | null {
  if (!span) return null;
  const [startDay, endDay] = span;
  const year = targetYears(now)[intake];
  const earlyClose = intake === "summer" ? endDay[0] >= 5 : endDay[0] >= 10;
  const end = date(earlyClose ? year - 1 : year, endDay);
  const start = startDay ? date(startDay[0] > endDay[0] ? end.getUTCFullYear() - 1 : end.getUTCFullYear(), startDay) : null;
  if (start) start.setUTCHours(0, 0);
  const status = end < now ? "closed" : start && start > now ? "upcoming" : "open";
  return { intake, year, start, end, status, daysLeft: Math.ceil((end.getTime() - now.getTime()) / DAY) };
}

/** Today's summer status: worked out from the dates where there are some, otherwise as researched. */
export function summerStatus(p: Program, now: Date): WindowStatus {
  const live = liveWindow(p.summerSpan, "summer", now);
  return live ? live.status : p.status;
}

/** The soonest window of either intake that hasn't closed. */
export function nextDeadline(p: Program, now: Date): LiveWindow | null {
  const windows = [liveWindow(p.summerSpan, "summer", now), liveWindow(p.winterSpan, "winter", now)].filter(
    (w): w is LiveWindow => w !== null && w.status !== "closed",
  );
  return windows.sort((a, b) => a.end.getTime() - b.end.getTime())[0] ?? null;
}

export function formatDay(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
