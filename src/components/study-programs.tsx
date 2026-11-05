"use client";

import { useMemo, useState, useTransition } from "react";
import { ExternalLink, Plus, Search, SearchX } from "lucide-react";

import { EmptyState } from "@/components/page-header";
import { STAGES, STATUS_CHIP, STATUS_LABEL } from "@/lib/study/catalog";
import { trackProgram } from "@/lib/study/actions";
import type { Program, StudyStage, WindowStatus } from "@/lib/study/types";

const TIERS = [
  { value: "core", label: "CS, AI, data" },
  { value: "related", label: "Related" },
  { value: "all", label: "All" },
] as const;

// Ordered by how soon he could act on them.
const STATUSES: WindowStatus[] = ["open", "upcoming", "text", "conflict", "closed", "no-summer", "unknown"];

/** The whole catalog, filterable, with a one-click way to start following a program. */
export function StudyPrograms({ programs, stages }: { programs: Program[]; stages: Record<string, StudyStage> }) {
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<(typeof TIERS)[number]["value"]>("core");
  const [status, setStatus] = useState<WindowStatus | "all">("all");
  const [trackedOnly, setTrackedOnly] = useState(false);

  const inTier = useMemo(() => programs.filter((p) => tier === "all" || p.tier === tier), [programs, tier]);
  const counts = useMemo(() => {
    const by: Partial<Record<WindowStatus, number>> = {};
    for (const p of inTier) by[p.status] = (by[p.status] ?? 0) + 1;
    return by;
  }, [inTier]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inTier
      .filter((p) => status === "all" || p.status === status)
      .filter((p) => !trackedOnly || stages[p.id])
      .filter((p) => !q || `${p.program} ${p.university} ${p.city} ${p.note}`.toLowerCase().includes(q))
      .sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || a.university.localeCompare(b.university));
  }, [inTier, status, trackedOnly, stages, query]);

  const universities = new Set(shown.map((p) => p.university)).size;

  return (
    <div className="stack-sm study-list">
      <div className="toolbar" style={{ marginBottom: 0 }}>
        <label className="search">
          <Search aria-hidden />
          <span className="sr-only">Search programs</span>
          <input
            className="field"
            type="search"
            placeholder="Search program, university, city"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="seg" role="group" aria-label="Subject">
          {TIERS.map((t) => (
            <button key={t.value} type="button" aria-pressed={tier === t.value} onClick={() => setTier(t.value)}>
              {t.label}
            </button>
          ))}
        </div>
        <select
          className="field"
          aria-label="Summer 2027 window"
          value={status}
          onChange={(e) => setStatus(e.target.value as WindowStatus | "all")}
        >
          <option value="all">Any summer window ({inTier.length})</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]} ({counts[s] ?? 0})
            </option>
          ))}
        </select>
        <div className="seg" role="group" aria-label="Show">
          <button type="button" aria-pressed={!trackedOnly} onClick={() => setTrackedOnly(false)}>
            Every program
          </button>
          <button type="button" aria-pressed={trackedOnly} onClick={() => setTrackedOnly(true)}>
            Following
          </button>
        </div>
      </div>

      <p className="small muted result-count" aria-live="polite">
        {shown.length} {shown.length === 1 ? "program" : "programs"} at {universities}{" "}
        {universities === 1 ? "university" : "universities"}
      </p>

      {shown.length === 0 ? (
        <EmptyState icon={SearchX} title="No programs match">
          Clear the search or pick another window.
        </EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="table study-table">
            <thead>
              <tr>
                <th>Program</th>
                <th>Summer 2027</th>
                <th>Winter</th>
                <th>Source</th>
                <th>
                  <span className="sr-only">Follow</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <ProgramRow key={p.id} program={p} stage={stages[p.id]} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProgramRow({ program: p, stage }: { program: Program; stage?: StudyStage }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const follow = () =>
    startTransition(async () => {
      const result = await trackProgram(p.id, { stage: "shortlist" });
      setError(result.ok ? null : result.error);
    });

  return (
    <tr style={{ opacity: pending ? 0.55 : 1 }}>
      <td className="study-program">
        <strong>{p.program}</strong>
        <div className="meta" style={{ marginTop: 2 }}>
          <span className="soft">{p.university}</span>
          {p.city && <span>{p.city}</span>}
          {p.route && <span>{p.route}</span>}
          {p.tier === "related" && <span>Related subject</span>}
        </div>
        {p.note && <p className="small soft study-note">{p.note}</p>}
        {error && (
          <p className="notice notice-danger" role="alert">
            {error}
          </p>
        )}
      </td>
      <td className="study-window">
        <span className={`chip ${STATUS_CHIP[p.status]}`}>{STATUS_LABEL[p.status]}</span>
        {p.summer && <div className="small soft">{p.summer}</div>}
      </td>
      <td className="study-window small soft">{p.winter ?? "Not listed"}</td>
      <td className="small">
        {p.source ? (
          <a href={p.source} target="_blank" rel="noreferrer" className="link" style={{ whiteSpace: "nowrap" }}>
            {p.evidence === "DAAD" ? "DAAD" : "Official page"} <ExternalLink aria-hidden size={12} />
          </a>
        ) : (
          <span className="muted">None</span>
        )}
        {p.evidence !== "DAAD" && <div className="muted">{p.evidence}</div>}
      </td>
      <td>
        {stage ? (
          <span className="chip chip-brand">{STAGES.find((s) => s.stage === stage)?.label}</span>
        ) : (
          <button type="button" className="btn btn-ghost btn-sm" onClick={follow} disabled={pending} aria-label={`Follow ${p.program} at ${p.university}`}>
            <Plus aria-hidden /> Follow
          </button>
        )}
      </td>
    </tr>
  );
}
