"use client";

import { useSyncExternalStore } from "react";

import { LIVE_STATUSES, type RunReply, type RunStatus } from "@/lib/agent/status";

/**
 * The live view of the last batch sent from the Agentic Apply button. The batch
 * (which jobs, since when) is kept in this browser, and one poller serves every
 * button on the page, however many rows show one. Polling stops once every job
 * has a finished run, or the batch is too old to still be going.
 */

export interface ProgressRun {
  id: string;
  job_id: string | null;
  status: RunStatus;
  steps: number;
  summary: string | null;
  blocker: string | null;
  activity: string | null;
  reply: RunReply | null;
}

export interface Batch {
  since: string;
  jobIds: string[];
}

interface Snapshot {
  batch: Batch | null;
  runs: Record<string, ProgressRun>;
}

const KEY = "sd-agent-batch";
const POLL_MS = 4000;
// A batch this old is over, whatever its records say (the agent window was closed mid-run).
const STALE_MS = 3 * 60 * 60_000;
// Server and browser clocks drift a little; a run started just before "since" still counts.
const SKEW_MS = 2 * 60_000;

const EMPTY: Snapshot = { batch: null, runs: {} };
let snapshot: Snapshot = EMPTY;
let loaded = false;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function set(next: Snapshot) {
  snapshot = next;
  for (const l of listeners) l();
}

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as Batch | null;
    if (saved?.jobIds?.length && Date.now() - Date.parse(saved.since) < STALE_MS) snapshot = { batch: saved, runs: {} };
  } catch {
    // No storage in this window: the view starts empty.
  }
}

/** Every job in the batch has a run that's no longer live. */
export function batchFinished({ batch, runs }: Snapshot): boolean {
  if (!batch) return true;
  if (Date.now() - Date.parse(batch.since) > STALE_MS) return true;
  return batch.jobIds.every((id) => runs[id] && !LIVE_STATUSES.includes(runs[id].status));
}

async function poll() {
  timer = null;
  const { batch } = snapshot;
  if (!batch || !listeners.size) return;
  if (!document.hidden) {
    try {
      const res = await fetch(`/api/agent/progress?jobs=${batch.jobIds.join(",")}&since=${encodeURIComponent(batch.since)}`, { cache: "no-store" });
      if (res.ok) {
        const { runs } = (await res.json()) as { runs: ProgressRun[] };
        if (snapshot.batch === batch)
          set({
            batch,
            runs: Object.fromEntries(runs.filter((r) => r.job_id).map((r) => [r.job_id!, r])),
          });
      }
    } catch {
      // Offline for a moment: the next poll tries again.
    }
  }
  if (snapshot.batch === batch && !batchFinished(snapshot) && listeners.size) timer = setTimeout(poll, POLL_MS);
}

/** Polls now, instead of waiting for the next tick (after he answers a waiting run). */
export function refreshProgress() {
  if (timer) clearTimeout(timer);
  void poll();
}

/** A new batch from the button. One still going keeps its jobs, so both stay in view. */
export function startBatch(jobIds: string[]) {
  load();
  const current = snapshot.batch && !batchFinished(snapshot) ? snapshot.batch : null;
  const batch: Batch = current
    ? {
        since: current.since,
        jobIds: [...new Set([...current.jobIds, ...jobIds])],
      }
    : { since: new Date(Date.now() - SKEW_MS).toISOString(), jobIds };
  try {
    localStorage.setItem(KEY, JSON.stringify(batch));
  } catch {
    // Not kept across reloads, but the view still works on this page.
  }
  set({ batch, runs: current ? snapshot.runs : {} });
  refreshProgress();
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  if (listeners.size === 1 && !timer) void poll();
  return () => {
    listeners.delete(listener);
  };
}

export function useBatchProgress(): Snapshot {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => EMPTY,
  );
}
