"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Inbox, Search, SearchX, Sparkles } from "lucide-react";

import { EmptyState } from "@/components/page-header";
import { LocalTime } from "@/components/local-time";
import type { RejectedItem, RejectionReason } from "@/lib/rejections/queries";

const REASONS: { value: RejectionReason | "all"; label: string }[] = [
  { value: "all", label: "Everything" },
  { value: "low_score", label: "Scored low" },
  { value: "too_old", label: "Too old" },
  { value: "unreadable", label: "Unreadable" },
];

type Finder = "all" | "firecrawl" | "hn" | "rss";

const FINDER_LABEL: Record<string, string> = {
  search: "Firecrawl search",
  url: "Firecrawl page",
  hn: "Hacker News",
  rss: "RSS",
};

const finderOf = (item: RejectedItem): Finder =>
  item.kind === "search" || item.kind === "url" ? "firecrawl" : (item.kind ?? "all");

const PAGE = 100;

export function RejectedList({ items }: { items: RejectedItem[] }) {
  const [query, setQuery] = useState("");
  const [reason, setReason] = useState<RejectionReason | "all">("all");
  const [finder, setFinder] = useState<Finder>("all");
  const [limit, setLimit] = useState(PAGE);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const i of items) c[i.reason] = (c[i.reason] ?? 0) + 1;
    return c;
  }, [items]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (reason !== "all" && i.reason !== reason) return false;
      if (finder !== "all" && finderOf(i) !== finder) return false;
      if (q && !`${i.title} ${i.host ?? ""} ${i.explanation ?? ""} ${i.sourceLabel ?? ""}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [items, query, reason, finder]);

  if (items.length === 0) {
    return (
      <EmptyState icon={Inbox} title="Nothing rejected yet">
        Stories the monitor turns down will show up here after the next scan.
      </EmptyState>
    );
  }

  return (
    <>
      <div className="toolbar reveal" style={{ "--reveal-delay": "60ms" } as React.CSSProperties}>
        <label className="search">
          <Search aria-hidden />
          <span className="sr-only">Search rejected stories</span>
          <input
            className="field"
            type="search"
            placeholder="Search rejected stories"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE);
            }}
          />
        </label>

        <div className="seg" role="group" aria-label="Reason">
          {REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              aria-pressed={reason === r.value}
              onClick={() => {
                setReason(r.value);
                setLimit(PAGE);
              }}
            >
              {r.label}
              {(counts[r.value] ?? 0) > 0 && <span className="seg-count">{counts[r.value]}</span>}
            </button>
          ))}
        </div>

        <select
          className="field"
          aria-label="Found by"
          value={finder}
          onChange={(e) => {
            setFinder(e.target.value as Finder);
            setLimit(PAGE);
          }}
        >
          <option value="all">Found by: anything</option>
          <option value="firecrawl">Found by: Firecrawl</option>
          <option value="hn">Found by: Hacker News</option>
          <option value="rss">Found by: RSS</option>
        </select>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={SearchX} title="No matches">
          Nothing fits these filters.
        </EmptyState>
      ) : (
        <>
          <p className="result-count" aria-live="polite">
            {shown.length === items.length ? `${items.length} rejected` : `${shown.length} of ${items.length} rejected`}
          </p>
          <div className="table-wrap scroll-slim reveal" style={{ "--reveal-delay": "100ms" } as React.CSSProperties}>
            <table className="table rejected-table">
              <thead>
                <tr>
                  <th scope="col">Found</th>
                  <th scope="col">Story</th>
                  <th scope="col">Found by</th>
                  <th scope="col">Why it was rejected</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.slice(0, limit).map((i) => (
                  <tr key={`${i.reason}-${i.id}`}>
                    <td className="rejected-date">
                      <LocalTime iso={i.foundAt} />
                    </td>
                    <td className="rejected-story">
                      <a href={i.url} target="_blank" rel="noopener noreferrer" title={i.title}>
                        <span>{i.title}</span>
                        <ExternalLink aria-hidden />
                      </a>
                      {i.host && <span className="rejected-host">{i.host}</span>}
                    </td>
                    <td className="rejected-finder">
                      {i.kind ? FINDER_LABEL[i.kind] : "Deleted source"}
                      {i.sourceLabel && i.kind !== "hn" && <span className="rejected-host">{i.sourceLabel}</span>}
                    </td>
                    <td className="rejected-why">
                      {i.reason === "low_score" ? (
                        <>
                          <span className="chip chip-amber">Scored {i.score}</span>
                          {i.explanation && <p>{i.explanation}</p>}
                        </>
                      ) : i.reason === "too_old" ? (
                        <span className="chip">Too old</span>
                      ) : (
                        <>
                          <span className="chip">Unreadable</span>
                          <p>The page wouldn&rsquo;t load or had no text to score.</p>
                        </>
                      )}
                    </td>
                    <td>
                      {i.discoveryId && (
                        <Link className="btn btn-ghost btn-sm" href={`/generate/${i.discoveryId}`}>
                          <Sparkles aria-hidden /> Draft anyway
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {shown.length > limit && (
            <div className="row" style={{ justifyContent: "center", marginTop: 16 }}>
              <button className="btn" onClick={() => setLimit((l) => l + PAGE)}>
                Show {Math.min(PAGE, shown.length - limit)} more
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
