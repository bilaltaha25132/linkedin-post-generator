// His default slot: Tue-Thu 6 pm Pakistan time (5 pm UAE, 2 pm UK, 9 am US
// East), the one window that reaches all four markets while he can reply.
// Pakistan has no daylight saving, so this is a fixed 13:00 UTC.

const SLOT_DAYS = [2, 3, 4];
const SLOT_HOUR_UTC = 13;
// A slot this close is skipped: there's no time left to finish the post.
const LEAD_MS = 2 * 3_600_000;

export function nextSlots(now: number, count: number, taken: number[] = []): Date[] {
  const out: Date[] = [];
  const day = new Date(now);
  day.setUTCHours(SLOT_HOUR_UTC, 0, 0, 0);
  for (let i = 0; out.length < count && i < 60; i++) {
    const at = new Date(day.getTime() + i * 86_400_000);
    if (!SLOT_DAYS.includes(at.getUTCDay()) || at.getTime() < now + LEAD_MS) continue;
    // Never two posts within a day of each other.
    if (taken.some((t) => Math.abs(t - at.getTime()) < 20 * 3_600_000)) continue;
    out.push(at);
  }
  return out;
}

export function slotLabel(at: Date): string {
  const pkt = new Date(at.getTime() + 5 * 3_600_000);
  const day = pkt.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  return `${day}, 6:00 pm PKT`;
}
