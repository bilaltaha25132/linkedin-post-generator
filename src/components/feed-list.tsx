"use client";

import { useMemo, useState } from "react";
import { Inbox, Search, SearchX } from "lucide-react";

import { DiscoveryRow } from "@/components/discovery-row";
import { EmptyState } from "@/components/page-header";
import type { Discovery } from "@/lib/db/types";

type Sort = "signal" | "newest";
const THRESHOLDS = [
  { label: "All", value: 0 },
  { label: "50+", value: 50 },
  { label: "70+", value: 70 },
];

export function FeedList({
  discoveries,
  total,
  emptyTitle,
  emptyHint,
}: {
  discoveries: Discovery[];
  /** Every match, not just the rows fetched for rendering. */
  total: number;
  emptyTitle: string;
  emptyHint: string;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("signal");
  const [topic, setTopic] = useState("all");
  const [minScore, setMinScore] = useState(0);
  const [launchesOnly, setLaunchesOnly] = useState(false);
  const launchCount = useMemo(() => discoveries.filter((d) => d.is_launch).length, [discoveries]);

  const topics = useMemo(() => {
    const set = new Set<string>();
    for (const d of discoveries) d.topics.forEach((t) => set.add(t));
    return [...set].sort();
  }, [discoveries]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = discoveries.filter((d) => {
      if ((d.relevance_score ?? 0) < minScore) return false;
      if (launchesOnly && !d.is_launch) return false;
      if (topic !== "all" && !d.topics.includes(topic)) return false;
      if (q) {
        const hay = `${d.title ?? ""} ${d.suggested_angle ?? ""} ${d.source_name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    filtered.sort((a, b) =>
      sort === "signal"
        ? (b.relevance_score ?? 0) - (a.relevance_score ?? 0)
        : Date.parse(b.discovered_at) - Date.parse(a.discovered_at),
    );
    return filtered;
  }, [discoveries, query, sort, topic, minScore, launchesOnly]);

  return (
    <>
      <div className="toolbar reveal" style={{ "--reveal-delay": "60ms" } as React.CSSProperties}>
        <label className="search">
          <Search aria-hidden />
          <span className="sr-only">Search the wire</span>
          <input
            className="field"
            type="search"
            placeholder="Search the wire"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <div className="seg" role="group" aria-label="Show">
          <button type="button" aria-pressed={!launchesOnly} onClick={() => setLaunchesOnly(false)}>
            Everything
          </button>
          <button type="button" aria-pressed={launchesOnly} onClick={() => setLaunchesOnly(true)}>
            New releases
            {launchCount > 0 && <span className="seg-count">{launchCount}</span>}
          </button>
        </div>

        <div className="seg" role="group" aria-label="Minimum signal">
          {THRESHOLDS.map((t) => (
            <button key={t.value} type="button" aria-pressed={minScore === t.value} onClick={() => setMinScore(t.value)}>
              {t.label}
            </button>
          ))}
        </div>

        <select
          className="field"
          aria-label="Topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        >
          <option value="all">All topics</option>
          {topics.map((t) => (
            <option key={t} value={t}>
              #{t}
            </option>
          ))}
        </select>

        <select
          className="field"
          aria-label="Sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
        >
          <option value="signal">Sort: Signal</option>
          <option value="newest">Sort: Newest</option>
        </select>
      </div>

      {discoveries.length === 0 ? (
        <EmptyState icon={Inbox} title={emptyTitle}>
          {emptyHint}
        </EmptyState>
      ) : shown.length === 0 ? (
        <EmptyState icon={SearchX} title="No matches">
          Nothing fits these filters. Loosen the search or signal threshold.
        </EmptyState>
      ) : (
        <>
          <p className="result-count" aria-live="polite">
            {shown.length === total ? `${total} signals` : `${shown.length} of ${total} signals`}
            {discoveries.length < total ? `, showing the first ${discoveries.length}` : ""}
          </p>
          <div className="wire">
            {shown.map((d, i) => (
              <div
                key={d.id}
                className="reveal"
                style={{ "--reveal-delay": `${Math.min(i, 8) * 40 + 100}ms` } as React.CSSProperties}
              >
                <DiscoveryRow discovery={d} />
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
