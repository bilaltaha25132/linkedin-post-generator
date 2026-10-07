"use client";

import { useMemo, useState } from "react";
import { Briefcase, Search, SearchX } from "lucide-react";

import { JobRow } from "@/components/job-row";
import { EmptyState } from "@/components/page-header";
import { REGION_LABEL } from "@/lib/jobs/format";
import type { Job } from "@/lib/jobs/types";

const FIT = [
  { label: "All", value: 0 },
  { label: "60+", value: 60 },
  { label: "80+", value: 80 },
];
const POSTED = [
  { label: "Any time", days: 0 },
  { label: "24 hours", days: 1 },
  { label: "3 days", days: 3 },
  { label: "2 weeks", days: 14 },
];
const REGIONS = ["saudi", "gulf", "europe", "remote", "pakistan", "other"];

export function JobsList({ jobs, now }: { jobs: Job[]; now: number }) {
  const [query, setQuery] = useState("");
  const [minFit, setMinFit] = useState(0);
  const [region, setRegion] = useState("all");
  const [visaOnly, setVisaOnly] = useState(false);
  const [type, setType] = useState<"all" | "full" | "contract">("all");
  const [postedDays, setPostedDays] = useState(0);
  const [source, setSource] = useState("all");
  const [savedOnly, setSavedOnly] = useState(false);

  const counts = useMemo(() => {
    const byRegion: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    for (const j of jobs) {
      byRegion[j.region ?? "other"] = (byRegion[j.region ?? "other"] ?? 0) + 1;
      const credit = j.source_credit ?? j.source;
      bySource[credit] = (bySource[credit] ?? 0) + 1;
    }
    return { byRegion, bySource, saved: jobs.filter((j) => j.status === "saved").length };
  }, [jobs]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((j) => {
      if (minFit && (j.score ?? 0) < minFit) return false;
      if (region !== "all" && (j.region ?? "other") !== region) return false;
      if (visaOnly && j.visa_flag !== "likely" && j.visa_flag !== "possible") return false;
      if (type === "contract" && !j.is_contract) return false;
      if (type === "full" && j.is_contract) return false;
      if (postedDays && now - Date.parse(j.posted_at ?? j.first_seen_at) > postedDays * 86_400_000) return false;
      if (source !== "all" && (j.source_credit ?? j.source) !== source) return false;
      if (savedOnly && j.status !== "saved") return false;
      if (q) {
        const hay = `${j.title} ${j.company} ${j.location_raw ?? ""} ${j.score_detail?.stack_overlap.join(" ") ?? ""}`;
        if (!hay.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [jobs, query, minFit, region, visaOnly, type, postedDays, source, savedOnly, now]);

  return (
    <>
      <div className="toolbar reveal" style={{ "--reveal-delay": "60ms" } as React.CSSProperties}>
        <label className="search">
          <Search aria-hidden />
          <span className="sr-only">Search jobs</span>
          <input
            className="field"
            type="search"
            placeholder="Search title, company, skill"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <div className="seg" role="group" aria-label="Show">
          <button type="button" aria-pressed={!savedOnly} onClick={() => setSavedOnly(false)}>
            All
          </button>
          <button type="button" aria-pressed={savedOnly} onClick={() => setSavedOnly(true)}>
            Saved
            {counts.saved > 0 && <span className="seg-count">{counts.saved}</span>}
          </button>
        </div>

        <div className="seg" role="group" aria-label="Minimum fit">
          {FIT.map((f) => (
            <button key={f.value} type="button" aria-pressed={minFit === f.value} onClick={() => setMinFit(f.value)}>
              {f.label}
            </button>
          ))}
        </div>

        <select className="field" aria-label="Where" value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="all">Where: anywhere</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {REGION_LABEL[r]} ({counts.byRegion[r] ?? 0})
            </option>
          ))}
        </select>

        <select
          className="field"
          aria-label="Type"
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
        >
          <option value="all">Any type</option>
          <option value="full">Full-time</option>
          <option value="contract">Contract</option>
        </select>

        <select
          className="field"
          aria-label="Posted"
          value={postedDays}
          onChange={(e) => setPostedDays(Number(e.target.value))}
        >
          {POSTED.map((p) => (
            <option key={p.days} value={p.days}>
              {p.days ? `Posted: last ${p.label}` : "Posted: any time"}
            </option>
          ))}
        </select>

        <select className="field" aria-label="Source" value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="all">From: every source</option>
          {Object.entries(counts.bySource)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([name, n]) => (
              <option key={name} value={name}>
                {name} ({n})
              </option>
            ))}
        </select>

        <label className="row small soft">
          <input type="checkbox" checked={visaOnly} onChange={(e) => setVisaOnly(e.target.checked)} />
          Sponsors visas
        </label>
      </div>

      {jobs.length === 0 ? (
        <EmptyState icon={Briefcase} title="No matches yet">
          Run a pass to read the job boards. Scoring takes a few passes to work through the first batch.
        </EmptyState>
      ) : shown.length === 0 ? (
        <EmptyState icon={SearchX} title="Nothing fits these filters">
          Loosen the fit, place or date filters.
        </EmptyState>
      ) : (
        <>
          <p className="result-count" aria-live="polite">
            {shown.length === jobs.length ? `${jobs.length} open roles` : `${shown.length} of ${jobs.length} open roles`}
          </p>
          <div className="wire">
            {shown.slice(0, 200).map((j) => (
              <JobRow key={j.id} job={j} now={now} />
            ))}
          </div>
          {shown.length > 200 && <p className="result-count">Showing the best 200. Narrow the filters for the rest.</p>}
        </>
      )}
    </>
  );
}
