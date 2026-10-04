"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";

import { unwrap } from "@/lib/action-result";
import { runMonitorNow } from "@/lib/monitor/actions";

export function RefreshButton() {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  const run = () =>
    startTransition(async () => {
      setNote(null);
      try {
        const r = unwrap(await runMonitorNow());
        setNote(
          `${r.newDiscoveries} new from ${r.sourcesRun} sources` +
            (r.errors.length ? `, ${r.errors.length} errors` : ""),
        );
      } catch (err) {
        setNote((err as Error).message);
      }
    });

  return (
    <>
      {note && (
        <span className="status-text" role="status">
          {note}
        </span>
      )}
      <button className="btn btn-dark" onClick={run} disabled={pending}>
        <RefreshCw aria-hidden className={pending ? "spin" : undefined} />
        {pending ? "Scanning the wire…" : "Scan now"}
      </button>
    </>
  );
}
