"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Bot, Play, Plus, RefreshCw, X } from "lucide-react";

import { RunWaitTools } from "@/components/run-tools";
import { unwrap } from "@/lib/action-result";
import { agentConnection, agentDetails, saveAgentDetails, type AgentDetails } from "@/lib/agent/actions";
import { agentVersion, askAgent, type AgentJob } from "@/lib/agent/bridge";
import { batchFinished, refreshProgress, startBatch, useBatchProgress, type ProgressRun } from "@/lib/agent/progress";
import { LIVE_STATUSES, STATUS_LABEL } from "@/lib/agent/status";

type Mode = "review" | "auto";
type Phase = "idle" | "loading" | "checking" | "missing" | "starting" | "sent" | "error";
type Step = "jobs" | "details";

const MODE_TEXT: Record<Mode, string> = {
  review:
    "The agent opens each job, fills the whole form and attaches your resume, then stops before the final submit. The tabs stay open for you to check and send.",
  auto: "The agent opens each job, fills the form, attaches your resume and submits it. Where a site wants a password, a code or a human check, it waits and tells you here; anything else it can't do alone is left open and marked for you.",
};

// What every form asks for: the agent won't start without these.
const REQUIRED: (keyof AgentDetails["contact"])[] = ["first_name", "last_name", "email", "phone"];

const CONTACT_FIELDS: { key: keyof AgentDetails["contact"]; label: string; type: string; auto: string }[] = [
  { key: "first_name", label: "First name", type: "text", auto: "given-name" },
  { key: "last_name", label: "Last name", type: "text", auto: "family-name" },
  { key: "email", label: "Email", type: "email", auto: "email" },
  { key: "phone", label: "Phone", type: "tel", auto: "tel" },
  { key: "city", label: "City", type: "text", auto: "address-level2" },
  { key: "country", label: "Country", type: "text", auto: "country-name" },
];

const LINK_FIELDS: { key: keyof AgentDetails["links"]; label: string }[] = [
  { key: "linkedin", label: "LinkedIn" },
  { key: "github", label: "GitHub" },
  { key: "portfolio", label: "Portfolio" },
  { key: "website", label: "Website" },
];

/** What a job in the batch is doing, in a few words, for its row and the button. */
function stateOf(run: ProgressRun | undefined): { status: string; label: string } {
  if (!run) return { status: "queued", label: "In the queue" };
  return { status: run.status, label: STATUS_LABEL[run.status] };
}

/** The line under a job's status: what it's doing now, or why it stopped. */
function detailOf(run: ProgressRun | undefined): string | null {
  if (!run) return null;
  if (run.status === "running") return run.activity;
  return run.blocker || run.summary;
}

/**
 * Agentic Apply: hands one job, or a batch, to the Signal Desk Agent extension,
 * which works through them in an agent window beside this one. Before it starts
 * he checks what the agent will type (saved to his profile) and whether each job
 * gets a resume tailored to it. Once a batch is going, the button shows how far
 * it's got and the dialog shows each job live, with the answer buttons for any
 * job waiting on him.
 */
export function AgentApply({ jobs, label = "Agentic Apply", className = "btn btn-dark" }: { jobs: AgentJob[]; label?: string; className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<Mode>("review");
  const [tailor, setTailor] = useState(true);
  const [picked, setPicked] = useState<Set<string>>(() => new Set(jobs.map((j) => j.id)));
  const [anchor, setAnchor] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [picking, setPicking] = useState(true);
  const [step, setStep] = useState<Step>("jobs");
  const [details, setDetails] = useState<AgentDetails | null>(null);
  const [dirty, setDirty] = useState(false);
  const progress = useBatchProgress();

  if (!jobs.length) return null;
  const many = jobs.length > 1;
  const chosen = jobs.filter((j) => picked.has(j.id));
  // This button's jobs that are in the batch the agent is working through.
  const tracked = progress.batch ? jobs.filter((j) => progress.batch!.jobIds.includes(j.id)) : [];
  const runOf = (id: string) => progress.runs[id];
  const waiting = tracked.filter((j) => runOf(j.id)?.status === "waiting").length;
  const finished = tracked.filter((j) => {
    const run = runOf(j.id);
    return run && !LIVE_STATUSES.includes(run.status);
  }).length;
  const badge = !tracked.length
    ? null
    : waiting
      ? `${waiting} need${waiting === 1 ? "s" : ""} you`
      : tracked.length === 1
        ? stateOf(runOf(tracked[0].id)).label
        : `${finished} of ${tracked.length} done`;
  const showProgress = tracked.length > 0 && !picking;
  const missing = details ? REQUIRED.filter((k) => !details.contact[k]?.trim()) : REQUIRED;

  const open = () => {
    setPhase("idle");
    setMessage(null);
    setStep("jobs");
    setPicked(new Set(jobs.map((j) => j.id)));
    setAnchor(null);
    setPicking(!tracked.length);
    dialog.current?.showModal();
  };

  const another = () => {
    setPhase("idle");
    setMessage(null);
    setStep("jobs");
    setPicking(true);
  };

  // The list is best fit first, so "the top N" is the quick way to pick.
  const pickTop = (n: number) => setPicked(new Set(jobs.slice(0, Math.max(0, n)).map((j) => j.id)));

  // Shift-click ticks or unticks every job between the last one clicked and this one.
  const toggle = (index: number, range: boolean) => {
    const on = !picked.has(jobs[index].id);
    const [from, to] = range && anchor !== null ? [Math.min(anchor, index), Math.max(anchor, index)] : [index, index];
    setPicked((prev) => {
      const next = new Set(prev);
      for (const j of jobs.slice(from, to + 1)) {
        if (on) next.add(j.id);
        else next.delete(j.id);
      }
      return next;
    });
    setAnchor(index);
  };

  const toDetails = async () => {
    setMessage(null);
    setStep("details");
    if (details) return;
    setPhase("loading");
    try {
      setDetails(unwrap(await agentDetails()));
      setPhase("idle");
    } catch (err) {
      setPhase("error");
      setMessage((err as Error).message);
    }
  };

  const setContact = (key: keyof AgentDetails["contact"], value: string) => {
    setDirty(true);
    setDetails((d) => d && { ...d, contact: { ...d.contact, [key]: value } });
  };
  const setLink = (key: keyof AgentDetails["links"], value: string) => {
    setDirty(true);
    setDetails((d) => d && { ...d, links: { ...d.links, [key]: value } });
  };

  const start = async () => {
    if (!chosen.length || !details || missing.length) return;
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
      if (dirty) {
        unwrap(await saveAgentDetails(details));
        setDirty(false);
      }
      if (!hello.connected) {
        const { token } = unwrap(await agentConnection());
        const linked = await askAgent("connect", { token });
        if (!linked.ok) throw new Error(linked.error);
      }
      const sent = await askAgent("apply", { jobs: chosen, autoSubmit: mode === "auto", tailor }, 8000);
      if (!sent.ok) throw new Error(sent.error);
      startBatch(chosen.map((j) => j.id));
      setPhase("sent");
      setPicking(false);
    } catch (err) {
      setPhase("error");
      setMessage((err as Error).message);
    }
  };

  const busy = phase === "loading" || phase === "checking" || phase === "starting";

  return (
    <>
      <button type="button" className={className} onClick={open}>
        <Bot aria-hidden /> {label}
        {badge && (
          <span className="agent-badge" data-waiting={waiting > 0 || undefined}>
            {badge}
          </span>
        )}
      </button>

      <dialog ref={dialog} className="agent-dialog" aria-labelledby="agent-dialog-title">
        <div className="agent-dialog-head">
          <h2 id="agent-dialog-title">
            {showProgress
              ? batchFinished(progress)
                ? "The agent is done"
                : "The agent is on it"
              : step === "details"
                ? "What the agent will type"
                : many
                  ? `Agentic Apply to ${chosen.length} of ${jobs.length} jobs`
                  : "Agentic Apply"}
          </h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={() => dialog.current?.close()}>
            <X aria-hidden />
          </button>
        </div>

        {showProgress ? (
          <>
            <ul className="agent-progress scroll-slim" aria-live="polite">
              {tracked.map((j) => {
                const run = runOf(j.id);
                const state = stateOf(run);
                const detail = detailOf(run);
                return (
                  <li key={j.id}>
                    <div className="agent-progress-head">
                      <span className="truncate">
                        <strong>{j.company}</strong> <span className="soft">{j.title}</span>
                      </span>
                      <span className="run-status" data-status={state.status}>
                        {state.label}
                      </span>
                    </div>
                    {detail && <p className={run?.status === "waiting" ? "small" : "small soft"}>{detail}</p>}
                    {run?.status === "waiting" && <RunWaitTools runId={run.id} onAnswered={refreshProgress} />}
                  </li>
                );
              })}
            </ul>
            <p className="small muted">
              Keep this browser open while it works. Every job also lands on <Link href="/applications">Applications</Link>.
            </p>
            <div className="row agent-dialog-foot">
              <button type="button" className="btn btn-ghost push" onClick={another}>
                <Plus aria-hidden /> Start another
              </button>
            </div>
          </>
        ) : step === "jobs" ? (
          <>
            {many ? (
              <>
                <div className="agent-pick">
                  <label htmlFor="agent-top">Apply to the top</label>
                  <input
                    id="agent-top"
                    className="field"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={jobs.length}
                    value={chosen.length}
                    onChange={(e) => pickTop(Number(e.target.value) || 0)}
                    onFocus={(e) => e.target.select()}
                  />
                  <span className="soft">of {jobs.length}, best fit first</span>
                  <button type="button" className="btn btn-ghost btn-sm push" onClick={() => pickTop(jobs.length)} disabled={chosen.length === jobs.length}>
                    All
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => pickTop(0)} disabled={!chosen.length}>
                    None
                  </button>
                </div>
                <ul className="agent-jobs scroll-slim">
                  {jobs.map((j, i) => (
                    <li key={j.id}>
                      <label>
                        <input type="checkbox" checked={picked.has(j.id)} onChange={(e) => toggle(i, (e.nativeEvent as MouseEvent).shiftKey)} />
                        <span className="agent-rank soft">{i + 1}</span>
                        <span className="truncate">
                          <strong>{j.company}</strong> <span className="soft">{j.title}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <p className="small muted">Shift-click to tick or untick a run of jobs at once.</p>
              </>
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
              On a sign-in it uses the site&rsquo;s Continue with Google button. It never types passwords, card or ID numbers, never solves
              CAPTCHAs and never works on LinkedIn itself. Demographic questions only get &ldquo;prefer not to say&rdquo;.
            </p>

            <div className="row agent-dialog-foot">
              <button type="button" className="btn btn-primary push" onClick={toDetails} disabled={!chosen.length}>
                Next: your details <ArrowRight aria-hidden />
              </button>
            </div>
          </>
        ) : (
          <>
            {details ? (
              <form
                className="stack-sm agent-details"
                onSubmit={(e) => {
                  e.preventDefault();
                  void start();
                }}
              >
                <p className="small soft">
                  The agent types these into every form. Changes are saved to your profile, the same one on the Resume page.
                </p>
                <fieldset className="apply-grid">
                  <legend className="lbl">Contact</legend>
                  {CONTACT_FIELDS.map((f) => (
                    <div key={f.key}>
                      <label className="lbl" htmlFor={`agent-${f.key}`}>
                        {f.label}
                        {REQUIRED.includes(f.key) ? "" : " (optional)"}
                      </label>
                      <input
                        id={`agent-${f.key}`}
                        className="field"
                        type={f.type}
                        autoComplete={f.auto}
                        required={REQUIRED.includes(f.key)}
                        value={details.contact[f.key] ?? ""}
                        onChange={(e) => setContact(f.key, e.target.value)}
                      />
                    </div>
                  ))}
                </fieldset>
                <fieldset className="apply-grid">
                  <legend className="lbl">Links</legend>
                  {LINK_FIELDS.map((f) => (
                    <div key={f.key}>
                      <label className="lbl" htmlFor={`agent-${f.key}`}>
                        {f.label} (optional)
                      </label>
                      <input
                        id={`agent-${f.key}`}
                        className="field"
                        type="url"
                        value={details.links[f.key] ?? ""}
                        onChange={(e) => setLink(f.key, e.target.value)}
                      />
                    </div>
                  ))}
                </fieldset>
                <label className="agent-check">
                  <input type="checkbox" checked={tailor} onChange={(e) => setTailor(e.target.checked)} />
                  <span>
                    <strong>Tailor my resume to each job.</strong>{" "}
                    <span className="soft">
                      Rewords and reorders your real bullets toward the ad, never adding anything that isn&rsquo;t in your resume. Each
                      job&rsquo;s version is kept on its Apply page.
                    </span>
                  </span>
                </label>
                <p className="small muted">Salary, notice period and work authorisation come from your profile on the Resume page.</p>
              </form>
            ) : (
              <p className="small soft">{phase === "loading" ? "Loading your details…" : null}</p>
            )}

            {phase === "missing" && (
              <div className="notice" role="status">
                <div className="stack-xs">
                  <strong>Install the Signal Desk Agent first</strong>
                  <ol className="small agent-steps">
                    <li>
                      Open <code>chrome://extensions</code> and turn on Developer mode.
                    </li>
                    <li>
                      Press Load unpacked and pick the <code>extension</code> folder in the Signal Desk repo (already loaded? press its reload
                      button).
                    </li>
                    <li>Reload this page, then press Start again. It connects itself.</li>
                  </ol>
                </div>
              </div>
            )}
            {message && (
              <p className="notice notice-danger" role="alert">
                {message}
              </p>
            )}

            <div className="row agent-dialog-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setStep("jobs")} disabled={busy}>
                <ArrowLeft aria-hidden /> Back
              </button>
              {phase === "missing" ? (
                <button type="button" className="btn btn-ghost" onClick={() => window.location.reload()}>
                  <RefreshCw aria-hidden /> Reload page
                </button>
              ) : null}
              <button type="button" className="btn btn-primary push" onClick={start} disabled={busy || !details || missing.length > 0}>
                <Play aria-hidden />
                {phase === "checking" || phase === "starting" ? "Starting the agent…" : mode === "auto" ? "Start and submit" : "Start filling"}
              </button>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
