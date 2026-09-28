"use client";

import Link from "next/link";
import { Check, RefreshCw } from "lucide-react";

export type SaveState = "idle" | "saving" | "saved" | "error";

export function SaveIndicator({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  const mono = { fontFamily: "var(--font-mono)", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 };
  if (state === "saving") {
    return (
      <span style={{ ...mono, color: "var(--ink-faint)" }}>
        <RefreshCw style={{ width: 13, height: 13, animation: "spin 0.9s linear infinite" }} /> Saving to drafts…
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span style={{ ...mono, color: "var(--accent)" }}>
        <Check style={{ width: 13, height: 13 }} /> Saved to{" "}
        <Link href="/library" style={{ color: "var(--accent)", textDecoration: "underline" }}>
          drafts
        </Link>
      </span>
    );
  }
  if (state === "error") {
    return (
      <button className="btn btn-ghost" style={{ ...mono, color: "var(--danger)" }} onClick={onRetry}>
        Couldn&rsquo;t save — retry
      </button>
    );
  }
  return null;
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
