"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw, TriangleAlert } from "lucide-react";

import { unwrap } from "@/lib/action-result";
import { addLead, runLeadsNow } from "@/lib/leads/actions";

export function LeadsScanButton() {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  const run = () =>
    startTransition(async () => {
      setNote(null);
      try {
        const r = unwrap(await runLeadsNow());
        setNote(`${r.added} new from ${r.lanes} sources, ${r.scored} scored` + (r.errors.length ? `, ${r.errors.length} errors` : ""));
      } catch (err) {
        setNote((err as Error).message);
      }
    });

  return (
    <>
      {note && (
        <span className="status-text" role="status">
          {note}
        </span>
      )}
      <button className="btn btn-dark" onClick={run} disabled={pending}>
        <RefreshCw aria-hidden className={pending ? "spin" : undefined} />
        {pending ? "Looking…" : "Check sources now"}
      </button>
    </>
  );
}

/** A post or message he found himself. It's scored and gets an opener like any other lead. */
export function AddLeadForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      setError(null);
      try {
        const { id } = unwrap(await addLead({ url, text }));
        setUrl("");
        setText("");
        router.push(`/leads#lead-${id}`);
      } catch (err) {
        setError((err as Error).message);
      }
    });

  return (
    <details className="panel reveal">
      <summary>Add a lead you found</summary>
      <div className="stack-sm" style={{ marginTop: 12 }}>
        <input
          className="field"
          placeholder="Link (optional)"
          aria-label="Link"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <textarea
          className="field"
          rows={4}
          placeholder="The post or message text"
          aria-label="Post or message text"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn btn-primary btn-sm" style={{ justifySelf: "start" }} disabled={pending || !text.trim()} onClick={submit}>
          <Plus aria-hidden /> {pending ? "Scoring…" : "Add and score"}
        </button>
        {error && (
          <p className="notice notice-danger" role="alert">
            <TriangleAlert aria-hidden />
            <span>{error}</span>
          </p>
        )}
      </div>
    </details>
  );
}
