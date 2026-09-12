"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";

import { runMonitorNow } from "@/lib/monitor/actions";

export function RefreshButton() {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  const run = () =>
    startTransition(async () => {
      setNote(null);
      try {
        const r = await runMonitorNow();
        setNote(
          `${r.newDiscoveries} new from ${r.sourcesRun} sources` +
            (r.errors.length ? ` · ${r.errors.length} errors` : ""),
        );
      } catch (err) {
        setNote((err as Error).message);
      }
    });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button className="btn" onClick={run} disabled={pending}>
        <RefreshCw style={pending ? { animation: "spin 1s linear infinite" } : undefined} />
        {pending ? "Scanning the wire…" : "Scan now"}
      </button>
      {note && <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>{note}</span>}
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );
}
