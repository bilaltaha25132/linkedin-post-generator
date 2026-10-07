"use client";

import { useState, useTransition } from "react";
import { Check, ClipboardList, Copy, Download, ExternalLink, FileText, Plus, Send, Sparkles, Trash2, Wand2 } from "lucide-react";

import { type ActionResult } from "@/lib/action-result";
import {
  acceptVersion,
  addFact,
  markSubmitted,
  prepareAnswers,
  removeFact,
  saveAnswer,
  saveCandidateProfile,
  saveCoverLetter,
  saveMasterResume,
  tailorResume,
  writeCoverLetter,
} from "@/lib/apply/actions";
import type { Answer, CandidateProfile, LedgerRole, ResumeVersion, SalaryRange, VersionReport, WorkAuth } from "@/lib/apply/types";

function useAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = <T,>(work: () => Promise<ActionResult<T>>, then?: (data: T) => void) =>
    startTransition(async () => {
      const result = await work();
      setError(result.ok ? null : result.error);
      if (result.ok) then?.(result.data);
    });
  return { pending, error, run };
}

function ErrorLine({ error }: { error: string | null }) {
  return error ? (
    <p className="notice notice-danger" role="alert">
      {error}
    </p>
  ) : null;
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-sm"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? "Copied" : label}
    </button>
  );
}

/* ── Resume page ─────────────────────────────────────────────────────────── */

export function MasterResumeForm({ hasMaster }: { hasMaster: boolean }) {
  const { pending, error, run } = useAction();
  const [latex, setLatex] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  return (
    <form
      className="stack-sm"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () => saveMasterResume(latex),
          (d) => {
            setSaved(`Read ${d.roles} roles, ${d.bullets} bullets and ${d.skills} skills.`);
            setLatex("");
          },
        );
      }}
    >
      <label className="lbl" htmlFor="master-latex">
        {hasMaster ? "Replace the master resume" : "Your resume's .tex source"}
      </label>
      <textarea
        id="master-latex"
        className="field meta-mono"
        rows={hasMaster ? 4 : 12}
        spellCheck={false}
        placeholder={"\\documentclass[letter,11pt]{article}\n..."}
        value={latex}
        onChange={(e) => setLatex(e.target.value)}
      />
      <div className="plan-actions">
        <button className="btn btn-primary" disabled={pending || latex.trim().length < 50}>
          <FileText aria-hidden /> {pending ? "Reading…" : hasMaster ? "Replace and re-read" : "Save and read"}
        </button>
        <span className="small muted">Stored privately in your database. Facts you added by hand stay when you replace it.</span>
      </div>
      {saved && (
        <p className="status-text" role="status">
          {saved}
        </p>
      )}
      <ErrorLine error={error} />
    </form>
  );
}

export function AddFactForm({ roles }: { roles: Pick<LedgerRole, "id" | "title" | "employer">[] }) {
  const { pending, error, run } = useAction();
  const [text, setText] = useState("");
  const [target, setTarget] = useState<string>("");
  return (
    <form
      className="stack-xs"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () => addFact({ roleId: target && target !== "skill" ? target : null, text, skill: target === "skill" }),
          () => setText(""),
        );
      }}
    >
      <label className="lbl" htmlFor="fact-text">
        Add a true fact the resume leaves out
      </label>
      <textarea
        id="fact-text"
        className="field"
        rows={2}
        placeholder={target === "skill" ? "Kubernetes, Terraform" : "Ran weekly evals on 400 support questions and caught two regressions before release"}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="plan-actions">
        <select className="field" style={{ width: "auto" }} value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Where it belongs">
          <option value="">General fact</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {[r.title, r.employer].filter(Boolean).join(", ")}
            </option>
          ))}
          <option value="skill">Skills (comma separated)</option>
        </select>
        <button className="btn btn-sm" disabled={pending || text.trim().length < 2}>
          <Plus aria-hidden /> Add
        </button>
      </div>
      <ErrorLine error={error} />
    </form>
  );
}

export function RemoveFactButton({ id, kind }: { id: string; kind: "bullet" | "skill" }) {
  const { pending, error, run } = useAction();
  return (
    <>
      <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => run(() => removeFact(id, kind))} aria-label="Remove this fact">
        <Trash2 aria-hidden />
      </button>
      <ErrorLine error={error} />
    </>
  );
}

const AUTH_PLACES = [
  ["PK", "Pakistan"],
  ["SA", "Saudi Arabia"],
  ["AE", "UAE"],
  ["QA", "Qatar"],
  ["EU", "EU"],
  ["UK", "UK"],
  ["US", "US"],
] as const;

const SALARY_REGIONS = [
  ["gulf", "Gulf (UAE, Qatar)", "AED", "month"],
  ["saudi", "Saudi Arabia", "SAR", "month"],
  ["europe", "Europe", "EUR", "year"],
  ["uk", "UK", "GBP", "year"],
  ["us", "US", "USD", "year"],
  ["remote", "Remote", "USD", "year"],
] as const;

const num = (v: string): number | null => (v.trim() === "" || Number.isNaN(Number(v)) ? null : Number(v));

export function FormFactsForm({ initial }: { initial: CandidateProfile }) {
  const { pending, error, run } = useAction();
  const [p, setP] = useState<CandidateProfile>(initial);
  const [languages, setLanguages] = useState(initial.languages.map((l) => `${l.name}: ${l.level}`).join("\n"));
  const [saved, setSaved] = useState(false);

  const contact = (k: keyof CandidateProfile["contact"], label: string, type = "text") => (
    <div>
      <label className="lbl" htmlFor={`c-${k}`}>
        {label}
      </label>
      <input id={`c-${k}`} className="field" type={type} value={p.contact[k] ?? ""} onChange={(e) => setP({ ...p, contact: { ...p.contact, [k]: e.target.value } })} />
    </div>
  );
  const link = (k: keyof CandidateProfile["links"], label: string) => (
    <div>
      <label className="lbl" htmlFor={`l-${k}`}>
        {label}
      </label>
      <input id={`l-${k}`} className="field" type="url" value={p.links[k] ?? ""} onChange={(e) => setP({ ...p, links: { ...p.links, [k]: e.target.value } })} />
    </div>
  );
  const setSalary = (region: string, patch: Partial<SalaryRange>, currency: string, period: "month" | "year") => {
    const cur = p.salary[region] ?? { min: null, max: null, currency, period };
    setP({ ...p, salary: { ...p.salary, [region]: { ...cur, ...patch } } });
  };

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = languages
          .split("\n")
          .map((line) => line.split(":"))
          .filter(([name]) => name?.trim())
          .map(([name, level]) => ({ name: name.trim(), level: (level ?? "").trim() || "fluent" }));
        run(
          () => saveCandidateProfile({ ...p, languages: parsed }),
          () => {
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          },
        );
      }}
    >
      <fieldset className="apply-grid">
        <legend className="lbl">Contact</legend>
        {contact("first_name", "First name")}
        {contact("last_name", "Last name")}
        {contact("email", "Email", "email")}
        {contact("phone", "Phone", "tel")}
        {contact("city", "City")}
        {contact("country", "Country")}
      </fieldset>

      <fieldset className="apply-grid">
        <legend className="lbl">Links</legend>
        {link("linkedin", "LinkedIn")}
        {link("github", "GitHub")}
        {link("portfolio", "Portfolio")}
        {link("website", "Website")}
      </fieldset>

      <fieldset className="apply-grid">
        <legend className="lbl">Experience and availability</legend>
        <div>
          <label className="lbl" htmlFor="years">
            Years of professional experience
          </label>
          <input id="years" className="field" inputMode="decimal" value={p.years_experience ?? ""} onChange={(e) => setP({ ...p, years_experience: num(e.target.value) })} />
        </div>
        <div>
          <label className="lbl" htmlFor="notice">
            Notice period in weeks
          </label>
          <input id="notice" className="field" inputMode="numeric" value={p.notice_weeks ?? ""} onChange={(e) => setP({ ...p, notice_weeks: num(e.target.value) })} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label className="lbl" htmlFor="langs">
            Languages, one per line (English: fluent)
          </label>
          <textarea id="langs" className="field" rows={3} value={languages} onChange={(e) => setLanguages(e.target.value)} />
        </div>
      </fieldset>

      <fieldset className="stack-xs">
        <legend className="lbl">Right to work, and where you&rsquo;d move</legend>
        <p className="field-hint">These answer knockout questions. Leave a place blank and the kit asks you instead of guessing.</p>
        <table className="plan-table">
          <thead>
            <tr>
              <th>Place</th>
              <th>Allowed to work there</th>
              <th>Would relocate</th>
            </tr>
          </thead>
          <tbody>
            {AUTH_PLACES.map(([code, name]) => (
              <tr key={code}>
                <td>{name}</td>
                <td>
                  <select
                    className="field"
                    aria-label={`Work authorisation in ${name}`}
                    value={p.work_auth[code] ?? ""}
                    onChange={(e) => {
                      const next = { ...p.work_auth };
                      if (e.target.value) next[code] = e.target.value as WorkAuth;
                      else delete next[code];
                      setP({ ...p, work_auth: next });
                    }}
                  >
                    <option value="">Not set</option>
                    <option value="yes">Yes</option>
                    <option value="sponsorship">Needs sponsorship</option>
                  </select>
                </td>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Would relocate to ${name}`}
                    checked={p.relocate[code] ?? false}
                    onChange={(e) => setP({ ...p, relocate: { ...p.relocate, [code]: e.target.checked } })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </fieldset>

      <fieldset className="stack-xs">
        <legend className="lbl">Salary expectations</legend>
        <p className="field-hint">Used only when a form asks. A region left blank is flagged for you, never guessed.</p>
        <table className="plan-table">
          <thead>
            <tr>
              <th>Region</th>
              <th>Minimum</th>
              <th>Maximum</th>
              <th>Per</th>
            </tr>
          </thead>
          <tbody>
            {SALARY_REGIONS.map(([key, name, currency, period]) => {
              const r = p.salary[key];
              return (
                <tr key={key}>
                  <td>
                    {name} <span className="muted">({r?.currency ?? currency})</span>
                  </td>
                  <td>
                    <input className="field" inputMode="numeric" aria-label={`${name} minimum`} value={r?.min ?? ""} onChange={(e) => setSalary(key, { min: num(e.target.value) }, currency, period)} />
                  </td>
                  <td>
                    <input className="field" inputMode="numeric" aria-label={`${name} maximum`} value={r?.max ?? ""} onChange={(e) => setSalary(key, { max: num(e.target.value) }, currency, period)} />
                  </td>
                  <td>
                    <select
                      className="field"
                      aria-label={`${name} period`}
                      value={r?.period ?? period}
                      onChange={(e) => setSalary(key, { period: e.target.value as "month" | "year" }, currency, period)}
                    >
                      <option value="month">month</option>
                      <option value="year">year</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </fieldset>

      <div className="plan-actions">
        <button className="btn btn-primary" disabled={pending}>
          {saved ? <Check aria-hidden /> : null} {pending ? "Saving…" : saved ? "Saved" : "Save form facts"}
        </button>
      </div>
      <ErrorLine error={error} />
    </form>
  );
}

/* ── Apply page: 1 Resume ────────────────────────────────────────────────── */

const STATUS_LABEL: Record<string, string> = { edited: "Edited", rejected: "Held back", dropped: "Dropped", kept: "Kept" };

export function ResumeStep({ jobId, hasMaster, initial }: { jobId: string; hasMaster: boolean; initial: ResumeVersion | null }) {
  const { pending, error, run } = useAction();
  const [version, setVersion] = useState(initial);
  const [report, setReport] = useState<VersionReport | null>(initial?.checks ?? null);
  const [declined, setDeclined] = useState<Set<string>>(new Set());
  const [useSummary, setUseSummary] = useState(true);
  const [accepted, setAccepted] = useState(Boolean(initial?.accepted_at));
  const [latex, setLatex] = useState(initial?.latex ?? "");

  if (!hasMaster) {
    return (
      <p className="notice" role="status">
        <span>
          Add your master resume on the <a className="link" href="/resume">Resume page</a> first. Tailoring only rewords what&rsquo;s already
          true there.
        </span>
      </p>
    );
  }

  const tailor = () =>
    run(
      () => tailorResume(jobId),
      (v) => {
        setVersion(v);
        setReport(v.checks);
        setLatex(v.latex);
        setDeclined(new Set());
        setAccepted(false);
      },
    );

  if (!version || !report) {
    return (
      <div className="stack-sm">
        <p className="small muted">
          Rewords your bullets toward this ad&rsquo;s terms, reorders them, and lists what you don&rsquo;t cover. Every number and tool is checked
          against your resume; anything new is held back.
        </p>
        <div className="plan-actions">
          <button className="btn btn-primary" disabled={pending} onClick={tailor}>
            <Wand2 aria-hidden /> {pending ? "Tailoring…" : "Tailor my resume"}
          </button>
        </div>
        <ErrorLine error={error} />
      </div>
    );
  }

  const changes = report.diff.filter((d) => d.status !== "kept");
  const covered = report.coverage.filter((c) => c.after).length;
  return (
    <div className="stack">
      {report.coverage.length > 0 && (
        <div className="stack-xs">
          <p className="small">
            Covers {covered} of the ad&rsquo;s {report.coverage.length} main terms
            {report.coverage.some((c) => c.after && !c.before) && ` (${report.coverage.filter((c) => c.after && !c.before).length} added by this version)`}.
          </p>
          <ul className="figures" aria-label="Terms from the ad">
            {report.coverage.map((c) => (
              <li key={c.keyword} className={c.after ? "skill-has" : "skill-gap"}>
                {c.keyword}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.summary && (
        <div className="apply-diff">
          <div className="plan-actions">
            <strong className="small">Summary</strong>
            {report.summary.after ? (
              <label className="small">
                <input type="checkbox" checked={useSummary} onChange={(e) => setUseSummary(e.target.checked)} /> Use the new line
              </label>
            ) : (
              <span className="chip chip-amber">Held back</span>
            )}
          </div>
          <p className="apply-before">{report.summary.before}</p>
          {report.summary.after && <p className="apply-after">{report.summary.after}</p>}
          {report.summary.reason && <p className="small muted">{report.summary.reason}</p>}
        </div>
      )}

      {changes.length === 0 ? (
        <p className="small muted">No bullet needed a change for this ad.</p>
      ) : (
        <div className="stack-sm">
          {changes.map((d) => (
            <div key={d.bulletId} className="apply-diff">
              <div className="plan-actions">
                <span className={`chip ${d.status === "edited" ? "chip-mint" : "chip-amber"}`}>{STATUS_LABEL[d.status]}</span>
                <span className="small muted">{d.role}</span>
                {d.status === "edited" && (
                  <label className="small" style={{ marginLeft: "auto" }}>
                    <input
                      type="checkbox"
                      checked={!declined.has(d.bulletId)}
                      onChange={(e) => {
                        const next = new Set(declined);
                        if (e.target.checked) next.delete(d.bulletId);
                        else next.add(d.bulletId);
                        setDeclined(next);
                        setAccepted(false);
                      }}
                    />{" "}
                    Keep
                  </label>
                )}
              </div>
              <p className="apply-before">{d.before}</p>
              {d.after && d.status !== "dropped" && <p className={d.status === "edited" ? "apply-after" : "apply-held"}>{d.after}</p>}
              {d.reason && <p className="small muted">{d.reason}</p>}
            </div>
          ))}
        </div>
      )}

      {report.gaps.length > 0 && (
        <div className="stack-xs">
          <p className="small">
            <strong>Where you&rsquo;re light.</strong> Not on your resume, so not added. Mention adjacent work in your answers, or add a fact if
            one is true.
          </p>
          <ul className="list-plain small">
            {report.gaps.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="plan-actions">
        <button
          className="btn btn-primary"
          disabled={pending}
          onClick={() =>
            run(
              () => acceptVersion(version.id, [...declined], useSummary),
              (d) => {
                setLatex(d.latex);
                setReport(d.report);
                setAccepted(true);
              },
            )
          }
        >
          <Check aria-hidden /> {accepted ? "Accepted" : "Accept this version"}
        </button>
        <button className="btn btn-ghost" disabled={pending} onClick={tailor}>
          <Sparkles aria-hidden /> {pending ? "Working…" : "Tailor again"}
        </button>
      </div>

      {accepted && (
        <div className="plan-actions">
          <a className="btn btn-sm" href={`/api/apply/resume/${version.id}`}>
            <Download aria-hidden /> Download .tex
          </a>
          {/* Overleaf's documented "open a snippet" endpoint; it runs only when he clicks. */}
          <form action="https://www.overleaf.com/docs" method="post" target="_blank">
            <input type="hidden" name="encoded_snip" value={encodeURIComponent(latex)} />
            <input type="hidden" name="snip_name" value="resume.tex" />
            <button className="btn btn-sm">
              <ExternalLink aria-hidden /> Open in Overleaf
            </button>
          </form>
          <span className="small muted">Compile the PDF there, then attach it to the form.</span>
        </div>
      )}
      <ErrorLine error={error} />
    </div>
  );
}

/* ── Apply page: 2 Form ──────────────────────────────────────────────────── */

const SOURCE_LABEL: Record<string, string> = { profile: "Form facts", resume: "Resume", drafted: "Drafted", you: "Yours" };

export function FormStep({
  jobId,
  canRead,
  initialAnswers,
  initialNotices,
}: {
  jobId: string;
  canRead: boolean;
  initialAnswers: Answer[];
  initialNotices: string[];
}) {
  const { pending, error, run } = useAction();
  const [answers, setAnswers] = useState(initialAnswers);
  const [notices, setNotices] = useState(initialNotices);
  const [pasted, setPasted] = useState("");
  const [showPaste, setShowPaste] = useState(!canRead);
  // Each draft remounts the rows; they hold their own edit state.
  const [round, setRound] = useState(0);

  const prepare = (text?: string) =>
    run(
      () => prepareAnswers(jobId, text),
      (d) => {
        setAnswers(d.answers);
        setRound((r) => r + 1);
        setNotices(d.form.notices);
        setShowPaste(false);
      },
    );

  return (
    <div className="stack">
      <div className="plan-actions">
        {canRead && (
          <button className="btn btn-primary" disabled={pending} onClick={() => prepare()}>
            <ClipboardList aria-hidden /> {pending ? "Reading and drafting…" : answers.length ? "Read the form again" : "Read the form and draft answers"}
          </button>
        )}
        {canRead && !showPaste && (
          <button className="btn btn-ghost" onClick={() => setShowPaste(true)}>
            Paste questions instead
          </button>
        )}
      </div>
      {showPaste && (
        <div className="stack-xs">
          <label className="lbl" htmlFor="pasted-questions">
            {canRead ? "Questions, one per line" : "This site's form can't be read automatically. Paste its questions, one per line."}
          </label>
          <textarea id="pasted-questions" className="field" rows={5} value={pasted} onChange={(e) => setPasted(e.target.value)} />
          <div className="plan-actions">
            <button className="btn btn-sm" disabled={pending || !pasted.trim()} onClick={() => prepare(pasted)}>
              <Sparkles aria-hidden /> {pending ? "Drafting…" : "Draft answers"}
            </button>
          </div>
        </div>
      )}
      <ErrorLine error={error} />

      {notices.map((n) => (
        <p key={n} className="notice" role="note">
          <span>{n}</span>
        </p>
      ))}

      {answers.length > 0 && (
        <div className="stack-sm">
          <p className="small muted">
            Paste each answer into the form yourself. Nothing here is sent anywhere. Edits save when you leave a box.
          </p>
          {answers.map((a) => (
            <AnswerRow key={`${round}:${a.key}`} jobId={jobId} a={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function AnswerRow({ jobId, a }: { jobId: string; a: Answer }) {
  const [value, setValue] = useState(a.value ?? "");
  const { error, run } = useAction();
  const yours = a.source === "you";
  const long = a.type === "textarea" || value.length > 90;
  return (
    <div className="apply-answer" data-yours={yours || undefined}>
      <div className="plan-actions">
        <strong className="small">
          {a.label}
          {a.required && <span className="muted"> (required)</span>}
        </strong>
        <span className={`chip ${yours ? "chip-amber" : a.source === "drafted" ? "chip-lavender" : "chip-mint"}`}>{SOURCE_LABEL[a.source]}</span>
      </div>
      {a.flag && <p className="small apply-flag">{a.flag}</p>}
      {!yours && a.type !== "file" && (
        <>
          {a.options && a.options.length <= 12 && <p className="small muted">Options: {a.options.join(" · ")}</p>}
          {long ? (
            <textarea
              className="field"
              rows={Math.min(10, Math.max(3, Math.ceil(value.length / 90)))}
              aria-label={a.label}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={() => value !== (a.value ?? "") && run(() => saveAnswer(jobId, a.key, value))}
            />
          ) : (
            <input
              className="field"
              aria-label={a.label}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={() => value !== (a.value ?? "") && run(() => saveAnswer(jobId, a.key, value))}
            />
          )}
          <div className="plan-actions">
            {value && <CopyButton text={value} />}
            {a.maxLength && (
              <span className={`small ${value.length > a.maxLength ? "apply-flag" : "muted"}`}>
                {value.length}/{a.maxLength}
              </span>
            )}
            {a.type === "textarea" && !a.maxLength && <span className="small muted">{value.split(/\s+/).filter(Boolean).length} words</span>}
          </div>
        </>
      )}
      {a.type === "file" && a.value && <p className="small">{a.value}</p>}
      <ErrorLine error={error} />
    </div>
  );
}

/* ── Apply page: 3 Cover letter, 4 Submitted ─────────────────────────────── */

export function LetterStep({ jobId, initial, style }: { jobId: string; initial: string | null; style: string }) {
  const { pending, error, run } = useAction();
  const [letter, setLetter] = useState(initial ?? "");
  return (
    <div className="stack-sm">
      <p className="small muted">{style}</p>
      {letter && (
        <textarea
          className="field"
          rows={14}
          aria-label="Cover letter"
          value={letter}
          onChange={(e) => setLetter(e.target.value)}
          onBlur={() => run(() => saveCoverLetter(jobId, letter))}
        />
      )}
      <div className="plan-actions">
        <button className={`btn ${letter ? "btn-ghost" : "btn-primary"}`} disabled={pending} onClick={() => run(() => writeCoverLetter(jobId), setLetter)}>
          <Sparkles aria-hidden /> {pending ? "Writing…" : letter ? "Write it again" : "Write a cover letter"}
        </button>
        {letter && <CopyButton text={letter} label="Copy letter" />}
        {letter && <span className="small muted">{letter.split(/\s+/).filter(Boolean).length} words</span>}
      </div>
      <ErrorLine error={error} />
    </div>
  );
}

export function SubmitStep({ jobId, submittedAt, applyUrl }: { jobId: string; submittedAt: string | null; applyUrl: string }) {
  const { pending, error, run } = useAction();
  const [done, setDone] = useState(submittedAt);
  if (done) {
    return (
      <p className="status-text" role="status">
        <Check aria-hidden /> Marked as submitted on {done.slice(0, 10)}. The job is in Applied, and your written answers are kept so the next form
        stays consistent.
      </p>
    );
  }
  return (
    <div className="stack-sm">
      <p className="small muted">
        Open the form, paste your answers, attach the PDF, and press Submit yourself. Then mark it here.
      </p>
      <div className="plan-actions">
        <a className="btn btn-dark" href={applyUrl} target="_blank" rel="noreferrer">
          <ExternalLink aria-hidden /> Open the application
        </a>
        <button className="btn btn-primary" disabled={pending} onClick={() => run(() => markSubmitted(jobId), () => setDone(new Date().toISOString()))}>
          <Send aria-hidden /> I submitted it
        </button>
      </div>
      <ErrorLine error={error} />
    </div>
  );
}
