"use client";

import { useState, useTransition } from "react";
import { Bell, BellOff, ExternalLink, Plus, Trash2, TriangleAlert } from "lucide-react";

import type { ActionResult } from "@/lib/action-result";
import { addWatchPerson, markVisited, removeWatchPerson, updateWatchPerson } from "@/lib/engage/actions";
import { overdueDays } from "@/lib/engage/format";
import type { Tier, WatchPerson } from "@/lib/engage/types";
import { activityUrl } from "@/lib/links/deep";

const TIERS: { value: Tier; label: string }[] = [
  { value: "A", label: "A: big reach, on your beat" },
  { value: "B", label: "B: practitioners and founders" },
  { value: "C", label: "C: reach, off-beat" },
  { value: "target", label: "Target: hiring manager or client" },
  { value: "warm", label: "Warm: engaged with you" },
];

/** The people worth being visible to, most overdue first. Nothing is fetched from LinkedIn. */
export function EngageRounds({ people, now }: { people: WatchPerson[]; now: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", profileUrl: "", tier: "B" as Tier, topics: "" });
  const sorted = [...people].sort((a, b) => overdueDays(b, now) - overdueDays(a, now));
  const due = sorted.filter((p) => overdueDays(p, now) >= 0).length;

  const run = (work: () => Promise<ActionResult<unknown>>, after?: () => void) =>
    startTransition(async () => {
      setError(null);
      const result = await work();
      if (!result.ok) setError(result.error);
      else after?.();
    });

  return (
    <section className="panel stack-sm reveal" aria-labelledby="rounds-title">
      <div className="panel-head" style={{ marginBottom: 0 }}>
        <h2 id="rounds-title">Rounds</h2>
        <p>
          {people.length
            ? `${due} of ${people.length} due a visit. Open their recent posts, and share anything worth a comment back in.`
            : "Add the people worth being visible to: big voices on your beat, practitioners, founders, hiring managers."}
        </p>
      </div>

      {sorted.length > 0 && (
        <ul className="list-plain stack-xs">
          {sorted.map((p) => {
            const overdue = overdueDays(p, now);
            return (
              <li key={p.id} className="row small" style={{ gap: 8, flexWrap: "nowrap" }}>
                <span className={overdue >= 0 ? "chip chip-amber" : "chip"} title={`Tier ${p.tier}`}>
                  {p.tier}
                </span>
                <span className="truncate">
                  <strong>{p.name}</strong>
                  {p.topics.length > 0 && <span className="muted"> · {p.topics.slice(0, 3).join(", ")}</span>}
                </span>
                <span className="meta-mono push" style={{ whiteSpace: "nowrap" }}>
                  {p.last_visited_at ? `${Math.floor((now - Date.parse(p.last_visited_at)) / 86_400_000)}d ago` : "never"}
                </span>
                <button
                  className="btn btn-ghost btn-icon"
                  aria-pressed={p.bell}
                  title={
                    p.bell
                      ? "You get LinkedIn's email for each of their posts"
                      : "Ring the bell on their LinkedIn profile, then tick this"
                  }
                  aria-label={p.bell ? "Bell on" : "Bell off"}
                  onClick={() => run(() => updateWatchPerson(p.id, { bell: !p.bell }))}
                  disabled={pending}
                >
                  {p.bell ? <Bell aria-hidden /> : <BellOff aria-hidden />}
                </button>
                {p.profile_url ? (
                  <a
                    className="btn btn-sm"
                    href={activityUrl(p.profile_url)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => void markVisited(p.id)}
                  >
                    <ExternalLink aria-hidden /> Recent posts
                  </a>
                ) : (
                  <span className="muted">no link</span>
                )}
                <button
                  className="btn btn-ghost btn-icon btn-danger"
                  aria-label={`Remove ${p.name}`}
                  title="Remove"
                  onClick={() => run(() => removeWatchPerson(p.id))}
                  disabled={pending}
                >
                  <Trash2 aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <details>
        <summary className="small">Add someone</summary>
        <div className="form-grid" style={{ marginTop: 10 }}>
          <input
            className="field"
            placeholder="Name"
            aria-label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="field"
            placeholder="https://www.linkedin.com/in/…"
            aria-label="Profile link"
            value={form.profileUrl}
            onChange={(e) => setForm({ ...form, profileUrl: e.target.value })}
          />
          <select
            className="field"
            aria-label="Tier"
            value={form.tier}
            onChange={(e) => setForm({ ...form, tier: e.target.value as Tier })}
          >
            {TIERS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            className="field"
            placeholder="Topics, comma-separated (RAG, agents, evals)"
            aria-label="Topics"
            value={form.topics}
            onChange={(e) => setForm({ ...form, topics: e.target.value })}
          />
        </div>
        <p className="muted small">Open the profile link once to check it&rsquo;s the right person before adding it.</p>
        <button
          className="btn btn-primary btn-sm"
          disabled={pending || !form.name.trim()}
          onClick={() =>
            run(
              () => addWatchPerson(form),
              () => setForm({ name: "", profileUrl: "", tier: form.tier, topics: "" }),
            )
          }
        >
          <Plus aria-hidden /> Add to rounds
        </button>
      </details>

      {error && (
        <p className="notice notice-danger" role="alert">
          <TriangleAlert aria-hidden />
          <span>{error}</span>
        </p>
      )}
    </section>
  );
}
