"use client";

import Link from "next/link";
import { useTransition } from "react";
import { ExternalLink, PenLine, Bookmark, X } from "lucide-react";

import { DiscussionLink, KeyNumbers } from "@/components/discussion-link";
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

      <div style={{ minWidth: 0 }}>
        <h3>
          <a href={discovery.url} target="_blank" rel="noreferrer">
            {discovery.title ?? discovery.url}
          </a>
        </h3>

        <div className="meta">
          {discovery.is_launch && <span className="launch-tag">New release</span>}
          {discovery.source_name && <span>{discovery.source_name}</span>}
          {discovery.discussion && <DiscussionLink discussion={discovery.discussion} />}
          <span>
            Arrived <LocalTime iso={discovery.discovered_at} />
          </span>
          {discovery.published_at && (
            <span>
              Published <LocalTime iso={discovery.published_at} withTime={false} />
            </span>
          )}
          {discovery.topics.slice(0, 3).map((t) => (
            <span key={t} className="topic">
              #{t}
            </span>
          ))}
        </div>

        {discovery.relevance_reason && <p className="reason">{discovery.relevance_reason}</p>}
        <KeyNumbers figures={discovery.key_numbers ?? []} />
        {discovery.suggested_angle && (
          <p className="angle">
            <b>Angle</b>
            {discovery.suggested_angle}
          </p>
        )}
      </div>

      <div className="row-actions">
        <Link href={`/generate/${discovery.id}`} className="btn btn-primary">
          <PenLine aria-hidden /> Draft
        </Link>
        {discovery.status !== "saved" && (
          <button className="btn btn-ghost" onClick={() => move("saved")} disabled={pending}>
            <Bookmark aria-hidden /> Save
          </button>
        )}
        <button className="btn btn-ghost" onClick={() => move("dismissed")} disabled={pending}>
          <X aria-hidden /> Dismiss
        </button>
        <a href={discovery.url} target="_blank" rel="noreferrer" className="btn btn-ghost">
          <ExternalLink aria-hidden /> Source
        </a>
      </div>
    </article>
  );
}
