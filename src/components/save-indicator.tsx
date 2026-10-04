"use client";

import Link from "next/link";
import { Check, RefreshCw, RotateCcw } from "lucide-react";

export type SaveState = "idle" | "saving" | "saved" | "error";

export function SaveIndicator({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  if (state === "saving") {
    return (
      <span className="status-text" role="status">
        <RefreshCw aria-hidden className="spin" /> Saving to drafts…
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="status-text status-ok" role="status">
        <Check aria-hidden /> Saved to <Link href="/library">drafts</Link>
      </span>
    );
  }
  if (state === "error") {
    return (
      <button className="btn btn-ghost btn-danger" onClick={onRetry}>
        <RotateCcw aria-hidden /> Couldn&rsquo;t save, retry
      </button>
    );
  }
  return null;
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
