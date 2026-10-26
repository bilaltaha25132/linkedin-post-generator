"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Send } from "lucide-react";

import { unwrap } from "@/lib/action-result";
import { markRunSubmitted } from "@/lib/agent/actions";

/** Re-reads the page every few seconds while the agent is still on a job. */
export function RunLive({ running }: { running: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(timer);
  }, [running, router]);

  return (
    <button type="button" className="btn btn-ghost" onClick={() => startTransition(() => router.refresh())} disabled={pending}>
      <RefreshCw aria-hidden className={pending || running ? "spin" : undefined} />
      {running ? "Agent working" : "Refresh"}
    </button>
  );
}

/** For a run the agent left with him: he sent it himself. */
export function RunSentButton({ runId }: { runId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const mark = () =>
    startTransition(async () => {
      try {
        unwrap(await markRunSubmitted(runId));
        setError(null);
      } catch (err) {
        setError((err as Error).message);
      }
    });

  return (
    <>
      <button type="button" className="btn btn-dark btn-sm" onClick={mark} disabled={pending}>
        <Send aria-hidden /> {pending ? "Saving…" : "I submitted it"}
      </button>
      {error && (
        <span className="status-text status-err" role="alert">
          {error}
        </span>
      )}
    </>
  );
}
