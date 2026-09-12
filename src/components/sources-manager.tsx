"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";

import { addSource, deleteSource, toggleSource } from "@/lib/sources/actions";
import type { Source, SourceKind } from "@/lib/db/types";

export function SourcesManager({ sources }: { sources: Source[] }) {
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<SourceKind>("search");
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");

  const add = () => {
    if (!value.trim()) return;
    startTransition(async () => {
      await addSource({ kind, value, label });
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
                style={{ width: 140 }}
              >
                <option value="search">Search query</option>
                <option value="url">Page URL</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <label className="lbl">{kind === "search" ? "What to search for" : "Page to watch"}</label>
              <input
                className="field"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={kind === "search" ? "e.g. agent memory architectures" : "https://…"}
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
            <span className="chip">{s.kind}</span>
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
