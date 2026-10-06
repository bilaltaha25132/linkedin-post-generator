"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, TriangleAlert } from "lucide-react";

import { addSource, deleteSource, toggleSource } from "@/lib/sources/actions";
import type { Source, SourceKind } from "@/lib/db/types";

const KIND_FIELDS: Record<SourceKind, { label: string; placeholder: string }> = {
  rss: { label: "Feed URL (RSS or Atom)", placeholder: "https://example.com/feed.xml" },
  hn: { label: "Minimum points on Hacker News", placeholder: "100" },
  search: { label: "What to search for", placeholder: "e.g. agent memory architectures" },
  url: { label: "Page to watch", placeholder: "https://…" },
  papers: { label: "Minimum upvotes on Hugging Face Daily Papers", placeholder: "15" },
  models: { label: "Minimum likes on a new Hugging Face model", placeholder: "300" },
};

const KIND_NAMES: Record<SourceKind, string> = {
  rss: "feed",
  hn: "hacker news",
  search: "search",
  url: "page",
  papers: "papers",
  models: "models",
};

const KIND_CHIPS: Record<SourceKind, string> = {
  rss: "chip chip-blue",
  hn: "chip chip-amber",
  search: "chip chip-lavender",
  url: "chip chip-mint",
  papers: "chip chip-rose",
  models: "chip chip-mint",
};

export function SourcesManager({ sources }: { sources: Source[] }) {
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<SourceKind>("rss");
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    if (!value.trim()) return;
    startTransition(async () => {
      const result = await addSource({ kind, value, label });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setValue("");
      setLabel("");
    });
  };

  return (
    <div className="stack">
      <section
        className="panel reveal"
        aria-labelledby="add-source-heading"
        style={{ "--reveal-delay": "60ms" } as React.CSSProperties}
      >
        <div className="panel-head">
          <span className="panel-icon">
            <Plus aria-hidden />
          </span>
          <h2 id="add-source-heading">Add a source</h2>
        </div>
        <div className="stack-sm">
          <div className="form-grid">
            <div>
              <label className="lbl" htmlFor="source-kind">
                Type
              </label>
              <select
                id="source-kind"
                className="field"
                value={kind}
                onChange={(e) => setKind(e.target.value as SourceKind)}
              >
                <option value="rss">RSS feed</option>
                <option value="hn">Hacker News</option>
                <option value="papers">Research papers</option>
                <option value="models">New open models</option>
                <option value="search">Search query</option>
                <option value="url">Page URL</option>
              </select>
            </div>
            <div>
              <label className="lbl" htmlFor="source-value">
                {KIND_FIELDS[kind].label}
              </label>
              <input
                id="source-value"
                className="field"
                value={value}
                inputMode={kind === "hn" || kind === "papers" || kind === "models" ? "numeric" : undefined}
                onChange={(e) => setValue(e.target.value)}
                placeholder={KIND_FIELDS[kind].placeholder}
              />
            </div>
            <div>
              <label className="lbl" htmlFor="source-label">
                Label (optional)
              </label>
              <input id="source-label" className="field" value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
          </div>
          <div>
            <button className="btn btn-primary" onClick={add} disabled={pending || !value.trim()}>
              <Plus aria-hidden /> Add source
            </button>
          </div>
          {error && (
            <p className="notice notice-danger" role="alert">
              <TriangleAlert aria-hidden />
              {error}
            </p>
          )}
        </div>
      </section>

      <section className="reveal" aria-labelledby="sources-heading" style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
        <div className="panel-head" style={{ marginBottom: 12 }}>
          <h2 id="sources-heading">Watching</h2>
          <p>
            {sources.filter((s) => s.enabled).length} of {sources.length} on
          </p>
        </div>
        {sources.length === 0 ? (
          <p className="soft">No sources yet.</p>
        ) : (
          <ul className="source-list">
            {sources.map((s) => (
              <li key={s.id} className="source" data-enabled={s.enabled}>
                <span className={KIND_CHIPS[s.kind]}>{KIND_NAMES[s.kind]}</span>
                <div className="source-text">
                  <div className="source-name">{s.label ?? s.value}</div>
                  {s.label && <div className="source-value">{s.value}</div>}
                </div>
                <label className="source-toggle">
                  <input
                    type="checkbox"
                    className="switch"
                    checked={s.enabled}
                    aria-label={`Watch ${s.label ?? s.value}`}
                    onChange={(e) =>
                      startTransition(async () => {
                        await toggleSource(s.id, e.target.checked);
                      })
                    }
                  />
                  {s.enabled ? "On" : "Off"}
                </label>
                <button
                  className="btn btn-ghost btn-icon btn-danger"
                  onClick={() =>
                    startTransition(async () => {
                      await deleteSource(s.id);
                    })
                  }
                  disabled={pending}
                  aria-label="Delete source"
                  title="Delete source"
                >
                  <Trash2 aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
