"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Bot, Play, RefreshCw, X } from "lucide-react";

import { unwrap } from "@/lib/action-result";
import { agentConnection } from "@/lib/agent/actions";
import { agentVersion, askAgent, type AgentJob } from "@/lib/agent/bridge";

type Mode = "review" | "auto";
type Phase = "idle" | "checking" | "missing" | "starting" | "sent" | "error";

const MODE_TEXT: Record<Mode, string> = {
  review:
    "The agent opens each job, fills the whole form and attaches your resume, then stops before the final submit. The tabs stay open for you to check and send.",
  auto: "The agent opens each job, fills the form, attaches your resume and submits it. Anything it can't do alone (a sign-in, a CAPTCHA, a fact it doesn't have) is left open and marked for you.",
};

/**
 * Agentic Apply: hands one job, or a batch, to the Signal Desk Agent extension,
 * which works through them in an agent window beside this one. Connecting is
 * automatic once the extension is installed.
 */
export function AgentApply({ jobs, label = "Agentic Apply", className = "btn btn-dark" }: { jobs: AgentJob[]; label?: string; className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<Mode>("review");
  const [picked, setPicked] = useState<Set<string>>(() => new Set(jobs.map((j) => j.id)));
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string | null>(null);

  if (!jobs.length) return null;
  const many = jobs.length > 1;
  const chosen = jobs.filter((j) => picked.has(j.id));

  const open = () => {
    setPhase("idle");
    setMessage(null);
    setPicked(new Set(jobs.map((j) => j.id)));
    dialog.current?.showModal();
  };

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const start = async () => {
    if (!chosen.length) return;
    setMessage(null);
    setPhase("checking");
    if (!agentVersion()) {
      setPhase("missing");
      return;
    }
    const hello = await askAgent("hello");
    if (!hello.ok) {
      setPhase("error");
      setMessage(hello.error);
      return;
    }
    setPhase("starting");
    try {
      if (!hello.connected) {
        const { token } = unwrap(await agentConnection());
        const linked = await askAgent("connect", { token });
        if (!linked.ok) throw new Error(linked.error);
      }
      const sent = await askAgent("apply", { jobs: chosen, autoSubmit: mode === "auto" }, 8000);
      if (!sent.ok) throw new Error(sent.error);
      setPhase("sent");
      setMessage(
        `The agent window has ${sent.queued === 1 ? "the job" : `${sent.queued} jobs`}. Keep this browser window open; progress lands on Applications.`,
      );
    } catch (err) {
      setPhase("error");
      setMessage((err as Error).message);
    }
  };

  const busy = phase === "checking" || phase === "starting";

  return (
    <>
      <button type="button" className={className} onClick={open}>
        <Bot aria-hidden /> {label}
      </button>

      <dialog ref={dialog} className="agent-dialog" aria-labelledby="agent-dialog-title">
        <div className="agent-dialog-head">
          <h2 id="agent-dialog-title">{many ? `Agentic Apply to ${chosen.length} of ${jobs.length} jobs` : "Agentic Apply"}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={() => dialog.current?.close()}>
            <X aria-hidden />
          </button>
        </div>

        {many ? (
          <ul className="agent-jobs scroll-slim">
            {jobs.map((j) => (
              <li key={j.id}>
                <label>
                  <input type="checkbox" checked={picked.has(j.id)} onChange={() => toggle(j.id)} />
                  <span className="truncate">
                    <strong>{j.company}</strong> <span className="soft">{j.title}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <p className="small">
            <strong>{jobs[0].company}</strong> <span className="soft">{jobs[0].title}</span>
          </p>
        )}

        <div className="seg" role="group" aria-label="When the form is filled">
          <button type="button" aria-pressed={mode === "review"} onClick={() => setMode("review")}>
            Fill for review
          </button>
          <button type="button" aria-pressed={mode === "auto"} onClick={() => setMode("auto")}>
            Auto-submit
          </button>
        </div>
        <p className="small soft">{MODE_TEXT[mode]}</p>
        <p className="small muted">
          It never types passwords, card or ID numbers, never solves CAPTCHAs and never touches LinkedIn. Demographic
          questions only get &ldquo;prefer not to say&rdquo;.
        </p>

        {phase === "missing" && (
          <div className="notice" role="status">
            <div className="stack-xs">
              <strong>Install the Signal Desk Agent first</strong>
              <ol className="small agent-steps">
                <li>
                  Open <code>chrome://extensions</code> and turn on Developer mode.
                </li>
                <li>
                  Press Load unpacked and pick the <code>extension</code> folder in the Signal Desk repo (already
                  loaded? press its reload button).
                </li>
                <li>Reload this page, then press Start again. It connects itself.</li>
              </ol>
            </div>
          </div>
        )}
        {message && (
          <p className={phase === "error" ? "notice notice-danger" : "status-text status-ok"} role={phase === "error" ? "alert" : "status"}>
            {message}
            {phase === "sent" && (
              <>
                {" "}
                <Link href="/applications">Open Applications</Link>
              </>
            )}
          </p>
        )}

        <div className="row agent-dialog-foot">
          {phase === "missing" ? (
            <button type="button" className="btn btn-ghost" onClick={() => window.location.reload()}>
              <RefreshCw aria-hidden /> Reload page
            </button>
          ) : null}
          <button type="button" className="btn btn-primary push" onClick={start} disabled={busy || !chosen.length || phase === "sent"}>
            <Play aria-hidden />
            {busy ? "Starting the agent…" : mode === "auto" ? "Start and submit" : "Start filling"}
          </button>
        </div>
      </dialog>
    </>
  );
}
