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

/** Shown only while DeepSeek bills peak rates, so writing can wait if it isn't urgent. */
export function PeakNotice() {
  const minute = useSyncExternalStore(subscribe, currentMinute, onServer);
  if (minute === null) return null;

  const ends = peakEndsAt(new Date(minute * 60_000));
  if (!ends) return null;

  const until = ends.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return (
    <p className="peak-notice" role="status">
      <Clock aria-hidden />
      <span>
        DeepSeek peak hours: AI writing costs double until {until}.
      </span>
    </p>
  );
}
