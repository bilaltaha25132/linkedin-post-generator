"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";

import { addSource, deleteSource, toggleSource } from "@/lib/sources/actions";
import type { Source, SourceKind } from "@/lib/db/types";

const KIND_FIELDS: Record<SourceKind, { label: string; placeholder: string }> = {
  rss: { label: "Feed URL (RSS or Atom)", placeholder: "https://example.com/feed.xml" },
  hn: { label: "Minimum points on Hacker News", placeholder: "100" },
  search: { label: "What to search for", placeholder: "e.g. agent memory architectures" },
  url: { label: "Page to watch", placeholder: "https://…" },
};

const KIND_NAMES: Record<SourceKind, string> = {
  rss: "feed",
  hn: "hacker news",
  search: "search",
  url: "page",
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
    <div style={{ display: "grid", gap: 24 }}>
      <div className="panel">
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div>
              <label className="lbl">Type</label>
              <select
                className="field"
                value={kind}
                onChange={(e) => setKind(e.target.value as SourceKind)}
                style={{ width: 160 }}
              >
                <option value="rss">RSS feed</option>
                <option value="hn">Hacker News</option>
                <option value="search">Search query</option>
                <option value="url">Page URL</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <label className="lbl">{KIND_FIELDS[kind].label}</label>
              <input
                className="field"
                value={value}
                inputMode={kind === "hn" ? "numeric" : undefined}
                onChange={(e) => setValue(e.target.value)}
                placeholder={KIND_FIELDS[kind].placeholder}
              />
            </div>
            <div style={{ width: 180 }}>
              <label className="lbl">Label (optional)</label>
              <input className="field" value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
          </div>
          <div>
            <button className="btn btn-primary" onClick={add} disabled={pending || !value.trim()}>
              <Plus /> Add source
            </button>
          </div>
          {error && (
            <p className="notice" role="alert" style={{ borderColor: "var(--danger)" }}>
              {error}
            </p>
          )}
        </div>
      </div>

      <div className="wire" style={{ borderTop: "none" }}>
        {sources.length === 0 && <p style={{ color: "var(--ink-soft)" }}>No sources yet.</p>}
        {sources.map((s) => (
          <div
            key={s.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 4px",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <span className="chip">{KIND_NAMES[s.kind]}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500 }}>{s.label ?? s.value}</div>
              {s.label && (
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-faint)" }}>
                  {s.value}
                </div>
              )}
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--ink-soft)" }}>
              <input
                type="checkbox"
                checked={s.enabled}
                onChange={(e) =>
                  startTransition(async () => {
                    await toggleSource(s.id, e.target.checked);
                  })
                }
              />
              {s.enabled ? "On" : "Off"}
            </label>
            <button
              className="btn-ghost btn"
              onClick={() => startTransition(async () => { await deleteSource(s.id); })}
              disabled={pending}
              aria-label="Delete source"
            >
              <Trash2 />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
