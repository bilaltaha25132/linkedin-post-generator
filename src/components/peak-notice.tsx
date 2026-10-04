"use client";

import { useSyncExternalStore } from "react";
import { Clock } from "lucide-react";

import { peakEndsAt } from "@/lib/llm/peak";

// Re-check once a minute; the snapshot is the current minute, so React only
// re-renders when it changes.
const subscribe = (onChange: () => void) => {
  const timer = setInterval(onChange, 60_000);
  return () => clearInterval(timer);
};
const currentMinute = () => Math.floor(Date.now() / 60_000);
const onServer = () => null;

/**
 * Shown only while DeepSeek bills peak rates, so writing can wait if it isn't
 * urgent. The sidebar carries it on desktop; on phones, where the sidebar is
 * folded into a drawer, the `banner` copy sits at the top of the page instead.
 */
export function PeakNotice({ banner = false }: { banner?: boolean }) {
  const minute = useSyncExternalStore(subscribe, currentMinute, onServer);
  if (minute === null) return null;

  const ends = peakEndsAt(new Date(minute * 60_000));
  if (!ends) return null;

  const until = ends.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return (
    <p className={banner ? "peak-notice peak-banner lg-hide" : "peak-notice"} role="status">
      <Clock aria-hidden />
      <span>DeepSeek peak hours: AI writing costs double until {until}.</span>
    </p>
  );
}
