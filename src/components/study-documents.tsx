"use client";

import { useOptimistic, useState, useTransition } from "react";

import { setDocumentDone } from "@/lib/study/actions";
import { DOCUMENTS } from "@/lib/study/documents";

/** The documents every application is built from, ticked off as they arrive. */
export function StudyDocuments({ done }: { done: string[] }) {
  const [optimistic, setOptimistic] = useOptimistic(new Set(done), (set: Set<string>, change: { key: string; done: boolean }) => {
    const next = new Set(set);
    if (change.done) next.add(change.key);
    else next.delete(change.key);
    return next;
  });
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = (key: string, value: boolean) =>
    startTransition(async () => {
      setOptimistic({ key, done: value });
      const result = await setDocumentDone(key, value);
      setError(result.ok ? null : result.error);
    });

  return (
    <section className="panel stack-sm" aria-label="Documents">
      <div className="panel-head" style={{ marginBottom: 0 }}>
        <h2>
          Documents <span className="muted">{optimistic.size} of {DOCUMENTS.length} ready</span>
        </h2>
        <p>Prepare these once. Ask your university for everything it issues in one request, since stamps can take weeks.</p>
      </div>
      {error && (
        <p className="notice notice-danger" role="alert">
          {error}
        </p>
      )}
      <ul className="list-plain study-docs">
        {DOCUMENTS.map((d) => (
          <li key={d.key}>
            <label className="study-doc">
              <input type="checkbox" checked={optimistic.has(d.key)} onChange={(e) => toggle(d.key, e.target.checked)} />
              <span>
                <strong>{d.title}</strong>
                <span className="small soft"> {d.detail}</span>
                <span className="small muted"> From: {d.from}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
