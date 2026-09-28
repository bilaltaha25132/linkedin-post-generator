"use client";

import Link from "next/link";
import { useTransition } from "react";
import { ExternalLink, PenLine, Bookmark, X } from "lucide-react";

import { LocalTime } from "@/components/local-time";
import { SignalScore } from "@/components/signal-score";
import { setDiscoveryStatus } from "@/lib/discoveries/actions";
import type { Discovery } from "@/lib/db/types";

export function DiscoveryRow({ discovery }: { discovery: Discovery }) {
  const [pending, startTransition] = useTransition();

  const move = (status: "saved" | "dismissed") =>
    startTransition(() => {
      void setDiscoveryStatus(discovery.id, status);
    });

  return (
    <article className="wire-row" data-pending={pending}>
      <SignalScore score={discovery.relevance_score} />

      <div>
        <h3>
          <a href={discovery.url} target="_blank" rel="noreferrer">
            {discovery.title ?? discovery.url}
          </a>
        </h3>

        <div className="meta">
          {discovery.source_name && <span>{discovery.source_name}</span>}
          <span>
            Arrived <LocalTime iso={discovery.discovered_at} />
          </span>
          {discovery.published_at && (
            <span>
              Published <LocalTime iso={discovery.published_at} withTime={false} />
            </span>
          )}
          {discovery.topics.slice(0, 3).map((t) => (
            <span key={t}>#{t}</span>
          ))}
        </div>

        {discovery.relevance_reason && <p className="reason">{discovery.relevance_reason}</p>}
        {discovery.suggested_angle && <p className="angle">{discovery.suggested_angle}</p>}
      </div>

      <div className="row-actions">
        <Link href={`/generate/${discovery.id}`} className="btn btn-primary">
          <PenLine /> Draft
        </Link>
        {discovery.status !== "saved" && (
          <button className="btn-ghost btn" onClick={() => move("saved")} disabled={pending}>
            <Bookmark /> Save
          </button>
        )}
        <button className="btn-ghost btn" onClick={() => move("dismissed")} disabled={pending}>
          <X /> Dismiss
        </button>
        <a href={discovery.url} target="_blank" rel="noreferrer" className="btn-ghost btn">
          <ExternalLink /> Source
        </a>
      </div>
    </article>
  );
}
