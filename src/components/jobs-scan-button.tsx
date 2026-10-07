"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";

import { unwrap } from "@/lib/action-result";
import { runJobsNow } from "@/lib/jobs/actions";

export function JobsScanButton() {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  const run = () =>
    startTransition(async () => {
      setNote(null);
      try {
        const r = unwrap(await runJobsNow());
        setNote(
          `${r.added} new from ${r.sources} boards, ${r.scored} scored` +
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
        {pending ? "Reading the boards…" : "Check boards now"}
      </button>
    </>
  );
}
