/**
 * Firecrawl news items carry human dates ("4 days ago", "yesterday") or ISO
 * strings. Parse to an ISO timestamp for freshness filtering; return null when
 * unparseable (caller treats null as "unknown age", not "too old").
 */
export function parseRelativeDate(raw: string | undefined, now = new Date()): string | null {
  if (!raw) return null;
  const text = raw.trim().toLowerCase();

  const iso = Date.parse(raw);
  if (!Number.isNaN(iso)) return new Date(iso).toISOString();

  if (text === "yesterday") return shift(now, 1).toISOString();
  if (text === "today" || text === "just now") return now.toISOString();

  const rel = text.match(/^(\d+)\s+(minute|hour|day|week|month|year)s?\s+ago$/);
  if (rel) {
    const n = Number(rel[1]);
    const unit = rel[2];
    const ms: Record<string, number> = {
      minute: 60_000,
      hour: 3_600_000,
      day: 86_400_000,
      week: 604_800_000,
      month: 2_592_000_000,
      year: 31_536_000_000,
    };
    return new Date(now.getTime() - n * ms[unit]).toISOString();
  }

  return null;
}

function shift(date: Date, days: number): Date {
  return new Date(date.getTime() - days * 86_400_000);
}

/** True when the parsed date is unknown (null) or within `maxAgeDays`. */
export function isFreshEnough(isoDate: string | null, maxAgeDays: number, now = new Date()): boolean {
  if (!isoDate) return true;
  const age = now.getTime() - Date.parse(isoDate);
  return age <= maxAgeDays * 86_400_000;
}
