// Pacing from docs/growth/profile-and-network.md: about 10 a weekday, at most
// 60 a week (half LinkedIn's soft cap keeps acceptance high), and the handful
// of personalised notes a free account gets each month.
export const DAILY_INVITES = 10;
export const WEEKLY_INVITES = 60;
export const MONTHLY_NOTES = 5;
export const NOTE_MAX = 200;
/** Below this acceptance across the last 50 invites, the queue pauses. */
export const MIN_ACCEPTANCE = 0.3;

export const SOURCE_LABEL: Record<string, string> = {
  invitation: "Invited you",
  engaged: "Engaged with you",
  commented: "You commented",
  lead: "Lead",
  hiring: "Hiring",
  watch: "Top voice",
  manual: "Added by you",
};

/** Notes are worth their scarce budget only for people who don't know him yet. */
export function wantsNote(source: string): boolean {
  return source === "lead" || source === "hiring" || source === "manual";
}
