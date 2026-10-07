import { Link2 } from "lucide-react";

import { RECONNECT_WINDOW_DAYS, daysLeft, getLinkedInAccount } from "@/lib/publish/queries";
import { supabaseConfigured } from "@/lib/supabase/server";

/**
 * LinkedIn tokens last 60 days with no refresh, so near the end every page asks
 * for a reconnect. It's one click while signed in to LinkedIn: no consent screen.
 */
export async function LinkedInReconnectNotice() {
  if (!supabaseConfigured()) return null;
  // A banner on every page must never take the page down with it.
  const account = await getLinkedInAccount().catch(() => null);
  if (!account) return null;

  const days = daysLeft(account);
  if (days > RECONNECT_WINDOW_DAYS) return null;

  return (
    <p className={days < 0 ? "notice notice-danger" : "notice"} role="status" style={{ marginBottom: 16 }}>
      <Link2 aria-hidden />
      <span>
        {days < 0
          ? "The LinkedIn connection has expired, so Publish is off. "
          : `The LinkedIn connection ends in ${days === 0 ? "under a day" : `${days} day${days === 1 ? "" : "s"}`}. `}
        <a href="/api/linkedin/connect">Reconnect LinkedIn</a>
      </span>
    </p>
  );
}
