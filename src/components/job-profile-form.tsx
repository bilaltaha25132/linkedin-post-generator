"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, TriangleAlert } from "lucide-react";

import { unwrap } from "@/lib/action-result";
import { rescoreJobs, saveJobProfile } from "@/lib/jobs/actions";
import { REGION_LABEL } from "@/lib/jobs/format";
import type { JobProfile } from "@/lib/jobs/types";

const ALL_REGIONS = ["saudi", "gulf", "europe", "remote", "pakistan"];
const LEVELS = ["junior", "mid", "senior", "lead"];

const toList = (value: string) => value.split(",").map((v) => v.trim()).filter(Boolean);

/** What every job is scored against. Comma-separated lists keep it one screen. */
export function JobProfileForm({ profile }: { profile: JobProfile }) {
  const [summary, setSummary] = useState(profile.summary);
  const [titles, setTitles] = useState(profile.titles.join(", "));
  const [mustHave, setMustHave] = useState(profile.must_have.join(", "));
  const [niceToHave, setNiceToHave] = useState(profile.nice_to_have.join(", "));
  const [dealbreakers, setDealbreakers] = useState(profile.dealbreakers.join(", "));
  const [seniority, setSeniority] = useState(profile.seniority ?? "mid");
  const [minPay, setMinPay] = useState(profile.min_pay_usd ? String(profile.min_pay_usd) : "");
  const [regions, setRegions] = useState(profile.regions);
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<{ text: string; danger?: boolean } | null>(null);
  const [saved, setSaved] = useState(false);

  const off = ALL_REGIONS.filter((r) => !regions.includes(r));
  const move = (i: number, by: -1 | 1) =>
    setRegions((list) => {
      const next = [...list];
      [next[i], next[i + by]] = [next[i + by], next[i]];
      return next;
    });

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        unwrap(
          await saveJobProfile({
            summary,
            titles: toList(titles),
            must_have: toList(mustHave),
            nice_to_have: toList(niceToHave),
            dealbreakers: toList(dealbreakers),
            regions,
            seniority,
            min_pay_usd: minPay ? Number(minPay) : null,
          }),
        );
        setSaved(true);
        setNote({ text: "Saved. New jobs are scored against this from the next pass." });
      } catch (err) {
        setNote({ text: (err as Error).message, danger: true });
      }
    });
  };

  const rescore = () =>
    startTransition(async () => {
      try {
        const { queued } = unwrap(await rescoreJobs());
        setNote({ text: `${queued} open matches will be scored again over the next few passes.` });
      } catch (err) {
        setNote({ text: (err as Error).message, danger: true });
      }
    });

  return (
    <form className="stack-sm" onSubmit={save}>
      <label className="stack-sm">
        <span className="small soft">Who you are, in a few sentences. Every job is scored against this.</span>
        <textarea className="field" rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} />
      </label>
      <Field label="Target titles" value={titles} onChange={setTitles} />
      <Field label="Must-have skills" value={mustHave} onChange={setMustHave} />
      <Field label="Nice-to-have skills" value={niceToHave} onChange={setNiceToHave} />
      <Field label="Dealbreakers" value={dealbreakers} onChange={setDealbreakers} />

      <div className="row">
        <label className="row small soft">
          Level
          <select className="field" value={seniority} onChange={(e) => setSeniority(e.target.value)} style={{ width: "auto" }}>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="row small soft">
          Minimum pay (USD a year, optional)
          <input
            className="field"
            type="number"
            min={0}
            step={1000}
            value={minPay}
            onChange={(e) => setMinPay(e.target.value)}
            style={{ width: 130 }}
          />
        </label>
      </div>

      <div className="stack-sm">
        <span className="small soft">Where, in order. Jobs score higher the nearer the top their region is.</span>
        <ol className="stack-sm" style={{ margin: 0, paddingLeft: 20 }}>
          {regions.map((r, i) => (
            <li key={r}>
              <span className="row">
                {REGION_LABEL[r]}
                <button type="button" className="btn btn-ghost btn-icon" aria-label={`Move ${REGION_LABEL[r]} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp aria-hidden />
                </button>
                <button type="button" className="btn btn-ghost btn-icon" aria-label={`Move ${REGION_LABEL[r]} down`} disabled={i === regions.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown aria-hidden />
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setRegions(regions.filter((x) => x !== r))}>
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ol>
        {off.length > 0 && (
          <div className="row small">
            <span className="muted">Not targeted:</span>
            {off.map((r) => (
              <button key={r} type="button" className="btn btn-ghost" onClick={() => setRegions([...regions, r])}>
                Add {REGION_LABEL[r]}
              </button>
            ))}
          </div>
        )}
      </div>

      {note && (
        <p className={note.danger ? "notice notice-danger" : "notice"} role="status">
          {note.danger && <TriangleAlert aria-hidden />}
          <span>{note.text}</span>
        </p>
      )}
      <div className="row">
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save job profile"}
        </button>
        {saved && (
          <button className="btn" type="button" onClick={rescore} disabled={pending}>
            Score open matches again
          </button>
        )}
      </div>
    </form>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="stack-sm" style={{ gap: 6 }}>
      <span className="small soft">{label}, comma-separated</span>
      <input className="field" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
