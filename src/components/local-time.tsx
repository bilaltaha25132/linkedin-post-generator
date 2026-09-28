"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * A timestamp in the viewer's own timezone. The server renders on UTC, so the
 * formatted text only appears once hydrated; until then it's the bare date.
 */
export function LocalTime({ iso, withTime = true }: { iso: string; withTime?: boolean }) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const date = new Date(iso);

  const text = hydrated
    ? date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
      })
    : iso.slice(0, 10);

  return (
    <time dateTime={iso} title={hydrated ? date.toLocaleString() : undefined}>
      {text}
    </time>
  );
}
