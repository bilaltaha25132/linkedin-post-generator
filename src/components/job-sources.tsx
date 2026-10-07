"use client";

import { useState, useTransition } from "react";
import { Plus, TriangleAlert } from "lucide-react";

import { LocalTime } from "@/components/local-time";
import { unwrap } from "@/lib/action-result";
import { addJobSource, setJobSourceEnabled } from "@/lib/jobs/actions";
import type { JobSource } from "@/lib/jobs/types";

/** The boards the Jobs pass reads, with their health, and a box to add a company. */
export function JobSources({ sources, boardUrls }: { sources: JobSource[]; boardUrls: Record<string, string> }) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<{ text: string; danger?: boolean } | null>(null);
  const failing = sources.filter((s) => s.enabled && s.last_ok === false).length;

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const { jobs } = unwrap(await addJobSource(url, name));
        setNote({ text: `Added. The board lists ${jobs} open role${jobs === 1 ? "" : "s"}; the next pass reads it.` });
        setUrl("");
        setName("");
      } catch (err) {
        setNote({ text: (err as Error).message, danger: true });
      }
    });
  };

  const toggle = (source: JobSource) =>
    startTransition(async () => {
      const result = await setJobSourceEnabled(source.id, !source.enabled);
      if (!result.ok) setNote({ text: result.error, danger: true });
    });

  return (
    <details className="panel stack-sm">
      <summary>
        <strong>Boards</strong>{" "}
        <span className="muted small">
          {sources.filter((s) => s.enabled).length} read
          {failing > 0 && `, ${failing} failing on the last pull`}
        </span>
      </summary>

      <form className="row" onSubmit={add}>
        <input
          className="field"
          style={{ flex: "2 1 280px" }}
          placeholder="Company jobs page, e.g. https://jobs.ashbyhq.com/acme"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
        <input
          className="field"
          style={{ flex: "1 1 140px" }}
          placeholder="Company name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn" type="submit" disabled={pending || !url.trim()}>
          <Plus aria-hidden /> Add company
        </button>
      </form>
      {note && (
        <p className={note.danger ? "notice notice-danger" : "notice"} role="status">
          {note.danger && <TriangleAlert aria-hidden />}
          <span>{note.text}</span>
        </p>
      )}

      <ul className="stack-sm" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {sources.map((s) => (
          <li key={s.id} className="row small" style={{ opacity: s.enabled ? 1 : 0.55 }}>
            <label className="row" style={{ flex: "1 1 220px", minWidth: 0 }}>
              <input type="checkbox" checked={s.enabled} onChange={() => toggle(s)} disabled={pending} />
              {boardUrls[s.id] ? (
                <a href={boardUrls[s.id]} target="_blank" rel="noreferrer">
                  {s.name}
                </a>
              ) : (
                <span>{s.name}</span>
              )}
              <span className="muted">{s.kind}</span>
            </label>
            <span className="muted" title={s.last_error ?? undefined}>
              {s.last_ok === false ? (
                <span style={{ color: "var(--danger)" }}>Failed: {s.last_error}</span>
              ) : s.last_pulled_at ? (
                <>
                  {s.last_count ?? 0} listed, read <LocalTime iso={s.last_pulled_at} />
                </>
              ) : (
                "Not read yet"
              )}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
