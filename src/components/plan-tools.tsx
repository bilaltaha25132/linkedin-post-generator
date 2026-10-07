"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";

import { unwrap } from "@/lib/action-result";
import { embedImported, importAnalytics, importShareBatch, savePillars, type PillarInput } from "@/lib/plan/actions";

const SHARE_BATCH = 150;

/**
 * Takes the analytics .xlsx (account or single post) or the data archive .zip.
 * Parsed here in the browser; only the rows go to the server.
 */
export function AnalyticsUpload() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handle = (file: File) =>
    startTransition(async () => {
      setError(null);
      setNote(`Reading ${file.name}…`);
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const { parseAnalyticsWorkbook, parseArchive } = await import("@/lib/plan/parse");
        if (/\.zip$/i.test(file.name)) {
          const shares = parseArchive(bytes);
          let posts = 0;
          let matched = 0;
          for (let i = 0; i < shares.length; i += SHARE_BATCH) {
            setNote(`Importing posts ${i + 1}-${Math.min(i + SHARE_BATCH, shares.length)} of ${shares.length}…`);
            const r = unwrap(await importShareBatch(shares.slice(i, i + SHARE_BATCH)));
            posts += r.posts;
            matched += r.matched;
          }
          setNote("Sorting posts into pillars…");
          for (let i = 0; i < 6; i++) {
            const { embedded } = unwrap(await embedImported());
            if (!embedded) break;
          }
          setNote(`${posts} posts imported from the archive, ${matched} already known.`);
        } else {
          const data = parseAnalyticsWorkbook(bytes);
          const r = unwrap(await importAnalytics(data));
          setNote(
            data.kind === "account"
              ? `${r.days} days and ${r.posts} top posts imported.`
              : `Numbers for one post imported${r.matched ? "" : " (a post not seen before)"}.`,
          );
        }
        router.refresh();
      } catch (err) {
        setNote(null);
        setError((err as Error).message);
      } finally {
        if (input.current) input.current.value = "";
      }
    });

  return (
    <div className="stack-xs">
      <div className="plan-actions">
        <button className="btn btn-dark" disabled={pending} onClick={() => input.current?.click()}>
          <Upload aria-hidden />
          {pending ? "Importing…" : "Upload an export"}
        </button>
        {note && (
          <span className="status-text" role="status">
            {note}
          </span>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept=".xlsx,.zip"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handle(file);
        }}
      />
      {error && (
        <p className="notice notice-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function PillarEditor({ pillars }: { pillars: PillarInput[] }) {
  const [rows, setRows] = useState(pillars);
  const [note, setNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const total = Math.round(rows.reduce((t, p) => t + p.target_share, 0) * 100);
  const dirty = JSON.stringify(rows) !== JSON.stringify(pillars);

  const set = (i: number, patch: Partial<PillarInput>) =>
    setRows((r) => r.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const save = () =>
    startTransition(async () => {
      setNote(null);
      try {
        const { reassigned } = unwrap(await savePillars(rows));
        setNote(reassigned ? `Saved. ${reassigned} posts re-sorted into pillars.` : "Saved.");
      } catch (err) {
        setNote((err as Error).message);
      }
    });

  return (
    <div className="stack-sm">
      {rows.map((p, i) => (
        <div key={p.id} className="pillar-edit">
          <div className="pillar-edit-head">
            <input className="field" aria-label="Pillar name" value={p.name} onChange={(e) => set(i, { name: e.target.value })} />
            <label className="pillar-share">
              <input
                className="field"
                type="number"
                min={0}
                max={100}
                step={5}
                aria-label={`Target share for ${p.name}`}
                value={Math.round(p.target_share * 100)}
                onChange={(e) => set(i, { target_share: Math.max(0, Math.min(100, Number(e.target.value) || 0)) / 100 })}
              />
              %
            </label>
          </div>
          <textarea
            className="field"
            rows={3}
            aria-label={`What ${p.name} covers`}
            value={p.description}
            onChange={(e) => set(i, { description: e.target.value })}
          />
        </div>
      ))}
      <div className="plan-actions">
        <button className="btn btn-primary btn-sm" disabled={pending || !dirty || total !== 100} onClick={save}>
          {pending ? "Saving…" : "Save pillars"}
        </button>
        <span className="status-text" role="status">
          {total !== 100 ? `Shares add up to ${total}%` : note}
        </span>
      </div>
    </div>
  );
}
