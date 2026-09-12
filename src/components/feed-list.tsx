"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { DiscoveryRow } from "@/components/discovery-row";
import type { Discovery } from "@/lib/db/types";

type Sort = "signal" | "newest";
const THRESHOLDS = [
  { label: "All", value: 0 },
  { label: "50+", value: 50 },
  { label: "70+", value: 70 },
];

export function FeedList({
  discoveries,
  emptyTitle,
  emptyHint,
}: {
  discoveries: Discovery[];
  emptyTitle: string;
  emptyHint: string;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("signal");
  const [topic, setTopic] = useState("all");
  const [minScore, setMinScore] = useState(0);

  const topics = useMemo(() => {
    const set = new Set<string>();
    for (const d of discoveries) d.topics.forEach((t) => set.add(t));
    return [...set].sort();
  }, [discoveries]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = discoveries.filter((d) => {
      if ((d.relevance_score ?? 0) < minScore) return false;
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
  }, [discoveries, query, sort, topic, minScore]);

  return (
    <>
      <div className="toolbar">
        <div className="toolbar-search">
          <Search />
          <input
            className="field"
            placeholder="Search the wire…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="seg">
          {THRESHOLDS.map((t) => (
            <button key={t.value} data-active={minScore === t.value} onClick={() => setMinScore(t.value)}>
              {t.label}
            </button>
          ))}
        </div>

        <select className="field toolbar-select" value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option value="all">All topics</option>
          {topics.map((t) => (
            <option key={t} value={t}>
              #{t}
            </option>
          ))}
        </select>

        <select className="field toolbar-select" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="signal">Sort: Signal</option>
          <option value="newest">Sort: Newest</option>
        </select>
      </div>

      {discoveries.length === 0 ? (
        <div className="empty">
          <h3>{emptyTitle}</h3>
          <p>{emptyHint}</p>
        </div>
      ) : shown.length === 0 ? (
        <div className="empty">
          <h3>No matches</h3>
          <p>Nothing fits these filters. Loosen the search or signal threshold.</p>
        </div>
      ) : (
        <>
          <p style={{ color: "var(--ink-faint)", fontFamily: "var(--font-mono)", fontSize: 12, margin: "0 0 4px" }}>
            {shown.length} of {discoveries.length}
          </p>
          <div className="wire">
            {shown.map((d) => (
              <DiscoveryRow key={d.id} discovery={d} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
