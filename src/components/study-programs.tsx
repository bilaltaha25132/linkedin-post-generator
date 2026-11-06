"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronDown, ExternalLink, Plus, Search, SearchX } from "lucide-react";

import { EmptyState } from "@/components/page-header";
import {
  KIND_LABEL,
  STAGES,
  STATUS_CHIP,
  STATUS_LABEL,
  TIER_LABEL,
  feeWarning,
  stateName,
} from "@/lib/study/catalog";
import { trackProgram } from "@/lib/study/actions";
import type { Program, StudyStage, WindowStatus } from "@/lib/study/types";
import { formatDay, liveWindow, nextDeadline, summerStatus, targetYears, type LiveWindow } from "@/lib/study/windows";

const TIERS = ["core", "related", "wider", "all"] as const;
// Ordered by how soon he could act on them.
const STATUSES: WindowStatus[] = ["open", "upcoming", "text", "conflict", "closed", "no-summer", "unknown"];
const SORTS = [
  { value: "deadline", label: "Next deadline first" },
  { value: "university", label: "University A to Z" },
  { value: "city", label: "City A to Z" },
] as const;
const PAGE = 40;

type Filters = {
  query: string;
  tier: (typeof TIERS)[number];
  state: string;
  kind: Program["kind"] | "all";
  status: WindowStatus | "all";
  freeOnly: boolean;
  noTest: boolean;
  trackedOnly: boolean;
  sort: (typeof SORTS)[number]["value"];
};

const INITIAL: Filters = {
  query: "",
  tier: "core",
  state: "all",
  kind: "all",
  status: "all",
  freeOnly: false,
  noTest: false,
  trackedOnly: false,
  sort: "deadline",
};

type Row = { p: Program; status: WindowStatus; next: LiveWindow | null };

const hasFees = (p: Program) =>
  Boolean(feeWarning(p)) || p.kind === "private" || (p.facts.tuition ? !/^no tuition/i.test(p.facts.tuition) : false);

/** The whole catalog, filterable by state, type and window, with details a click away. */
export function StudyPrograms({ programs, stages, now: nowMs }: { programs: Program[]; stages: Record<string, StudyStage>; now: number }) {
  const now = useMemo(() => new Date(nowMs), [nowMs]);
  const years = targetYears(now);
  const [f, setF] = useState<Filters>(INITIAL);
  const [limit, setLimit] = useState(PAGE);
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setF((prev) => ({ ...prev, [key]: value }));
    setLimit(PAGE);
  };

  const rows = useMemo<Row[]>(() => programs.map((p) => ({ p, status: summerStatus(p, now), next: nextDeadline(p, now) })), [programs, now]);

  // Each menu's counts apply every other filter, so picking an option never empties the list by surprise.
  const matches = (r: Row, skip?: keyof Filters) => {
    const { p } = r;
    const q = f.query.trim().toLowerCase();
    if (skip !== "tier" && f.tier !== "all" && p.tier !== f.tier) return false;
    if (skip !== "state" && f.state !== "all" && (p.state ?? "") !== f.state) return false;
    if (skip !== "kind" && f.kind !== "all" && p.kind !== f.kind) return false;
    if (skip !== "status" && f.status !== "all" && r.status !== f.status) return false;
    if (f.freeOnly && hasFees(p)) return false;
    if (f.noTest && (p.facts.tests?.length ?? 0) > 0) return false;
    if (f.trackedOnly && !stages[p.id]) return false;
    if (q && !`${p.program} ${p.university} ${p.city} ${stateName(p.state)} ${p.note}`.toLowerCase().includes(q)) return false;
    return true;
  };
  const countBy = (skip: keyof Filters, key: (r: Row) => string) => {
    const counts: Record<string, number> = {};
    for (const r of rows) if (matches(r, skip)) counts[key(r)] = (counts[key(r)] ?? 0) + 1;
    return counts;
  };
  const stateCounts = countBy("state", (r) => r.p.state ?? "");
  const kindCounts = countBy("kind", (r) => r.p.kind);
  const statusCounts = countBy("status", (r) => r.status);
  const tierCounts = countBy("tier", (r) => r.p.tier);

  const shown = rows
    .filter((r) => matches(r))
    .sort((a, b) => {
      if (f.sort === "university") return a.p.university.localeCompare(b.p.university) || a.p.program.localeCompare(b.p.program);
      if (f.sort === "city") return a.p.city.localeCompare(b.p.city) || a.p.university.localeCompare(b.p.university);
      const byDate = (a.next?.end.getTime() ?? Infinity) - (b.next?.end.getTime() ?? Infinity);
      return byDate || STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || a.p.university.localeCompare(b.p.university);
    });
  const universities = new Set(shown.map((r) => r.p.university)).size;
  const states = Object.keys(stateCounts)
    .filter(Boolean)
    .sort((a, b) => stateName(a).localeCompare(stateName(b)));
  const filtered = JSON.stringify(f) !== JSON.stringify(INITIAL);

  return (
    <div className="stack-sm study-list">
      <div className="toolbar" style={{ marginBottom: 0 }}>
        <label className="search">
          <Search aria-hidden />
          <span className="sr-only">Search programs</span>
          <input
            className="field"
            type="search"
            placeholder="Search program, university, city, state"
            value={f.query}
            onChange={(e) => set("query", e.target.value)}
          />
        </label>
        <div className="seg" role="group" aria-label="Subject">
          {TIERS.map((t) => (
            <button key={t} type="button" aria-pressed={f.tier === t} onClick={() => set("tier", t)}>
              {t === "all" ? "All" : TIER_LABEL[t]}
              <span className="seg-count">{t === "all" ? Object.values(tierCounts).reduce((a, b) => a + b, 0) : (tierCounts[t] ?? 0)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar" style={{ marginBottom: 0 }}>
        <select className="field" aria-label="State" value={f.state} onChange={(e) => set("state", e.target.value)}>
          <option value="all">All 16 states</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {stateName(s)} ({stateCounts[s]})
            </option>
          ))}
        </select>
        <select className="field" aria-label="Type of university" value={f.kind} onChange={(e) => set("kind", e.target.value as Filters["kind"])}>
          <option value="all">Any type</option>
          {(Object.keys(KIND_LABEL) as Program["kind"][]).map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]} ({kindCounts[k] ?? 0})
            </option>
          ))}
        </select>
        <select
          className="field"
          aria-label={`Summer ${years.summer} window`}
          value={f.status}
          onChange={(e) => set("status", e.target.value as Filters["status"])}
        >
          <option value="all">Summer {years.summer}: any</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              Summer {years.summer}: {STATUS_LABEL[s]} ({statusCounts[s] ?? 0})
            </option>
          ))}
        </select>
        <select className="field" aria-label="Sort" value={f.sort} onChange={(e) => set("sort", e.target.value as Filters["sort"])}>
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <div className="seg" role="group" aria-label="More filters">
          <button type="button" aria-pressed={f.freeOnly} onClick={() => set("freeOnly", !f.freeOnly)}>
            No tuition
          </button>
          <button type="button" aria-pressed={f.noTest} onClick={() => set("noTest", !f.noTest)}>
            No GRE or GATE
          </button>
          <button type="button" aria-pressed={f.trackedOnly} onClick={() => set("trackedOnly", !f.trackedOnly)}>
            Following
          </button>
        </div>
      </div>

      <div className="row">
        <p className="small muted result-count" aria-live="polite" style={{ margin: 0 }}>
          {shown.length} {shown.length === 1 ? "program" : "programs"} at {universities} {universities === 1 ? "university" : "universities"}
        </p>
        {filtered && (
          <button
            type="button"
            className="btn btn-ghost btn-sm push"
            onClick={() => {
              setF(INITIAL);
              setLimit(PAGE);
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={SearchX} title="No programs match">
          Clear a filter or the search to see more.
        </EmptyState>
      ) : (
        <>
          <ul className="list-plain study-cards">
            {shown.slice(0, limit).map((r) => (
              <ProgramCard key={r.p.id} program={r.p} status={r.status} stage={stages[r.p.id]} now={now} />
            ))}
          </ul>
          {shown.length > limit && (
            <button type="button" className="btn btn-ghost" onClick={() => setLimit((l) => l + PAGE * 2)} style={{ justifySelf: "center" }}>
              Show more ({shown.length - limit} left)
            </button>
          )}
        </>
      )}
    </div>
  );
}

function ProgramCard({ program: p, status, stage, now }: { program: Program; status: WindowStatus; stage?: StudyStage; now: Date }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const years = targetYears(now);
  const summer = liveWindow(p.summerSpan, "summer", now);
  const winter = liveWindow(p.winterSpan, "winter", now);
  const fee = feeWarning(p);

  const follow = () =>
    startTransition(async () => {
      const result = await trackProgram(p.id, { stage: "shortlist" });
      setError(result.ok ? null : result.error);
    });

  return (
    <li className="study-card" style={{ opacity: pending ? 0.55 : 1 }}>
      <div className="study-card-main">
        <div className="study-card-title">
          <h3>{p.program}</h3>
          <div className="meta" style={{ marginTop: 2 }}>
            <span className="soft">{p.university}</span>
            <span>
              {p.city}
              {p.state ? `, ${stateName(p.state)}` : ""}
            </span>
            <span>{KIND_LABEL[p.kind]}</span>
            {p.tier !== "core" && <span>{TIER_LABEL[p.tier]}</span>}
          </div>
          <div className="row study-tags">
            {(p.facts.tuition || fee) && <span className={`chip ${hasFees(p) ? "chip-amber" : ""}`}>{fee ? "EUR 1,500 state fee" : p.facts.tuition}</span>}
            {p.facts.ielts && <span className="chip">IELTS {p.facts.ielts}</span>}
            {p.facts.grade && <span className="chip">Grade {p.facts.grade}</span>}
            {p.facts.tests?.map((t) => (
              <span key={t} className="chip chip-lavender">
                {t}
              </span>
            ))}
            {p.facts.interview && <span className="chip">Interview</span>}
            {p.route && <span className="chip">{p.route}</span>}
          </div>
        </div>

        <div className="study-card-windows">
          <WindowCell label={`Summer ${summer?.year ?? years.summer}`} status={status} text={windowText(p.summer, summer)} />
          <WindowCell
            label={`Winter ${winter?.year ?? years.winter}`}
            status={winter?.status ?? null}
            fallback={p.winter ? "See dates" : "Not listed"}
            text={windowText(p.winter, winter)}
          />
        </div>

        <div className="study-card-actions">
          {stage ? (
            <span className="chip chip-brand">{STAGES.find((s) => s.stage === stage)?.label}</span>
          ) : (
            <button type="button" className="btn btn-ghost btn-sm" onClick={follow} disabled={pending} aria-label={`Follow ${p.program} at ${p.university}`}>
              <Plus aria-hidden /> Follow
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-sm" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            Details <ChevronDown aria-hidden className={open ? "study-chevron-open" : undefined} />
          </button>
        </div>
      </div>

      {p.note && <p className="small soft study-note">{p.note}</p>}
      {error && (
        <p className="notice notice-danger" role="alert">
          {error}
        </p>
      )}
      {open && <ProgramDetails program={p} />}
    </li>
  );
}

function WindowCell({ label, status, text, fallback }: { label: string; status: WindowStatus | null; text: string; fallback?: string }) {
  return (
    <div className="study-window-cell">
      <span className="small muted">{label}</span>
      <span className={`chip ${status ? STATUS_CHIP[status] : ""}`}>{status ? STATUS_LABEL[status] : fallback}</span>
      {text && <span className="small soft">{text}</span>}
    </div>
  );
}

function windowText(raw: string | null, live: LiveWindow | null): string {
  if (!live) return raw ?? "";
  const range = live.start ? `${formatDay(live.start)} to ${formatDay(live.end)}` : `Until ${formatDay(live.end)}`;
  return live.status === "open" ? `${range}, ${live.daysLeft} ${live.daysLeft === 1 ? "day" : "days"} left` : range;
}

function ProgramDetails({ program: p }: { program: Program }) {
  const x = p.facts;
  const asks = [
    x.letter && "motivation letter",
    x.references && "recommendation letters",
    x.work && "work experience",
    x.entranceTest && "entrance or aptitude test",
    x.interview && "interview",
  ].filter(Boolean);
  const facts: [string, string | null | undefined][] = [
    ["Fees", [x.tuition, feeWarning(p)].filter(Boolean).join(" ") || "Not stated"],
    ["Duration", x.duration],
    ["Starts", x.intakes],
    ["English", [x.ielts && `IELTS ${x.ielts}`, x.toefl && `TOEFL ${x.toefl}`].filter(Boolean).join(", ")],
    ["Minimum grade", x.grade],
    ["Bachelor's size", x.ects && `${x.ects} ECTS`],
    ["Tests", x.tests?.join(", ")],
    ["Also asks for", asks.join(", ")],
    ["How to apply", p.route],
    ["Found through", p.foundBy],
    ["Evidence", p.evidence],
  ];
  return (
    <div className="study-details">
      <dl>
        {facts
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
      </dl>
      {x.admission && (
        <div className="stack-xs">
          <h4>Admission, as DAAD states it</h4>
          <p className="small soft">{x.admission}</p>
        </div>
      )}
      <div className="row">
        {p.source && (
          <a href={p.source} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
            <ExternalLink aria-hidden /> {p.source.includes("daad.de") ? "DAAD page" : "Official page"}
          </a>
        )}
        {x.daadUrl && x.daadUrl !== p.source && (
          <a href={x.daadUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
            <ExternalLink aria-hidden /> DAAD page
          </a>
        )}
      </div>
      <p className="small muted">Requirements change. Confirm each one on the official page before you apply.</p>
    </div>
  );
}
