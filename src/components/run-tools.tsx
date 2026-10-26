"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, RefreshCw, Send, SkipForward } from "lucide-react";

import { unwrap } from "@/lib/action-result";
import { answerAgentRun, markRunSubmitted } from "@/lib/agent/actions";
import { agentVersion, askAgent } from "@/lib/agent/bridge";
import type { RunReply } from "@/lib/agent/status";

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

/**
 * For a run waiting on him (a sign-in, a CAPTCHA): bring its tab to the front,
 * then tell the agent to carry on, or skip the job. "Show me" needs the
 * extension in this browser; the answers work from anywhere he's signed in.
 */
export function RunWaitTools({ runId, onAnswered }: { runId: string; onAnswered?: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // The extension stamps the page, which the server render can't see.
  const here = useSyncExternalStore(
    () => () => {},
    () => Boolean(agentVersion()),
    () => false,
  );

  const show = async () => {
    const reply = await askAgent("show", { runId });
    setError(reply.ok ? null : reply.error);
  };

  const answer = (reply: RunReply) =>
    startTransition(async () => {
      try {
        unwrap(await answerAgentRun(runId, reply));
        setError(null);
        onAnswered?.();
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });

  return (
    <div className="row">
      {here && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={show}>
          <Eye aria-hidden /> Show me the tab
        </button>
      )}
      <button type="button" className="btn btn-dark btn-sm" onClick={() => answer("go")} disabled={pending}>
        <ArrowRight aria-hidden /> I&rsquo;ve done it, carry on
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => answer("skip")} disabled={pending}>
        <SkipForward aria-hidden /> Skip this job
      </button>
      {error && (
        <span className="status-text status-err" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
