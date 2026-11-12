import "server-only";

import { PROGRAMS } from "@/lib/study/catalog";
import { dateSignal, looksBlocked, pageText, readPage, verdictFor } from "@/lib/study/extract";
import type { Program } from "@/lib/study/types";
import { supabaseAdmin } from "@/lib/supabase/server";

const USER_AGENT = "Mozilla/5.0 (compatible; SignalDesk/1.0; personal study tracker)";
const FETCH_TIMEOUT_MS = 20_000;
const CONCURRENCY = 6;
// Every page weekly; the ones being followed daily, since a moved deadline matters most there.
const ALL_EVERY_MS = 7 * 24 * 3600_000;
const FOLLOWED_EVERY_MS = 20 * 3600_000;
const MAX_BODY = 3_000_000;

export type RescanResult = { due: number; checked: number; read: number; blocked: number; failed: number; changed: number; errors: string[] };

type CheckRow = {
  program_id: string;
  url: string;
  checked_at: string;
  status: string;
  verdict: string | null;
  signals: string[];
  snippets: string[];
  signals_hash: string | null;
  last_ok_at: string | null;
  last_changed_at: string | null;
};

export function catalogEnds(p: Program): string[] {
  return [p.summerSpan, p.winterSpan].flatMap((s) => (s ? [dateSignal(s[1][0], s[1][1])] : []));
}

/** One pass: re-read the pages that are due, store what they say, record any change. */
export async function rescanPrograms(opts: { budgetMs: number; force?: boolean; only?: string[] }): Promise<RescanResult> {
  const deadline = Date.now() + opts.budgetMs;
  const db = supabaseAdmin();
  const [{ data: checks, error }, { data: tracked, error: trackedError }] = await Promise.all([
    db.from("study_checks").select("program_id,url,checked_at,status,verdict,signals,snippets,signals_hash,last_ok_at,last_changed_at"),
    db.from("study_tracked").select("program_id,stage"),
  ]);
  if (error) throw new Error(error.message);
  if (trackedError) throw new Error(trackedError.message);

  const previous = new Map((checks as CheckRow[]).map((c) => [c.program_id, c]));
  const followed = new Set(
    (tracked as { program_id: string; stage: string }[]).filter((t) => t.stage !== "dropped").map((t) => t.program_id),
  );
  const now = Date.now();
  const due = PROGRAMS.filter((p) => {
    if (!p.checkUrl) return false;
    if (opts.only) return opts.only.includes(p.id);
    const last = previous.get(p.id);
    if (opts.force || !last || last.url !== p.checkUrl) return true;
    const age = now - Date.parse(last.checked_at);
    return age >= (followed.has(p.id) ? FOLLOWED_EVERY_MS : ALL_EVERY_MS);
  }).sort((a, b) => {
    // Followed first, then the longest unchecked.
    const fa = followed.has(a.id) ? 0 : 1;
    const fb = followed.has(b.id) ? 0 : 1;
    if (fa !== fb) return fa - fb;
    return Date.parse(previous.get(a.id)?.checked_at ?? "1970") - Date.parse(previous.get(b.id)?.checked_at ?? "1970");
  });

  const result: RescanResult = { due: due.length, checked: 0, read: 0, blocked: 0, failed: 0, changed: 0, errors: [] };
  // Pages on one host share a server, so they are read one at a time, never in parallel.
  const busyHosts = new Set<string>();
  const queue = [...due];

  const worker = async () => {
    while (Date.now() < deadline - FETCH_TIMEOUT_MS) {
      const i = queue.findIndex((p) => !busyHosts.has(new URL(p.checkUrl!).host));
      if (i === -1) {
        if (!queue.length) return;
        await new Promise((r) => setTimeout(r, 250));
        continue;
      }
      const [program] = queue.splice(i, 1);
      const host = new URL(program.checkUrl!).host;
      busyHosts.add(host);
      try {
        const outcome = await checkProgram(program, previous.get(program.id));
        result.checked++;
        result[outcome.status === "ok" ? "read" : outcome.status === "blocked" ? "blocked" : "failed"]++;
        if (outcome.changed) result.changed++;
      } catch (err) {
        result.errors.push(`${program.id}: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        busyHosts.delete(host);
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return result;
}

async function checkProgram(p: Program, last: CheckRow | undefined): Promise<{ status: string; changed: boolean }> {
  const url = p.checkUrl!;
  const checkedAt = new Date().toISOString();
  const db = supabaseAdmin();
  let status: "ok" | "blocked" | "failed" | "skipped" = "failed";
  let httpStatus: number | null = null;
  let errorText: string | null = null;
  let read = { signals: [] as string[], snippets: [] as string[] };

  if (/\.pdf($|\?)/i.test(url)) {
    status = "skipped";
    errorText = "PDF, read by hand";
  } else {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5", "Accept-Language": "en,de;q=0.8" },
        redirect: "follow",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      httpStatus = res.status;
      const type = res.headers.get("content-type") ?? "";
      const body = type.includes("pdf") ? "" : (await res.text()).slice(0, MAX_BODY);
      if (looksBlocked(res.status, body)) {
        status = "blocked";
        errorText = `HTTP ${res.status}, the site refused an automated read`;
      } else if (!res.ok) {
        errorText = `HTTP ${res.status}`;
      } else if (type.includes("pdf")) {
        status = "skipped";
        errorText = "PDF, read by hand";
      } else {
        status = "ok";
        read = readPage(pageText(body));
      }
    } catch (err) {
      errorText = err instanceof Error ? (err.name === "TimeoutError" ? "Timed out" : err.message) : String(err);
    }
  }

  const hash = status === "ok" ? read.signals.join("|") : last?.signals_hash ?? null;
  // A change counts only between two good reads of the same page, so an outage or a new URL never raises one.
  const changed = status === "ok" && !!last && last.status === "ok" && last.url === url && last.signals_hash !== hash;

  if (changed) {
    const before = new Set(last!.signals);
    const after = new Set(read.signals);
    const { error } = await db.from("study_changes").insert({
      program_id: p.id,
      url,
      added: read.signals.filter((s) => !before.has(s)),
      removed: last!.signals.filter((s) => !after.has(s)),
      before_snippets: last!.snippets,
      after_snippets: read.snippets,
    });
    if (error) throw new Error(error.message);
  }

  const keepOld = status !== "ok" && last?.url === url;
  const { error } = await db.from("study_checks").upsert(
    {
      program_id: p.id,
      url,
      checked_at: checkedAt,
      status,
      http_status: httpStatus,
      verdict: status === "ok" ? verdictFor(read.signals, catalogEnds(p)) : keepOld ? last!.verdict : null,
      // A failed read keeps the last good findings, so the card can still say what the page said.
      signals: keepOld ? last!.signals : read.signals,
      snippets: keepOld ? last!.snippets : read.snippets,
      signals_hash: hash,
      last_ok_at: status === "ok" ? checkedAt : last?.url === url ? last.last_ok_at : null,
      last_changed_at: changed ? checkedAt : last?.url === url ? last.last_changed_at : null,
      error: errorText?.slice(0, 300) ?? null,
    },
    { onConflict: "program_id" },
  );
  if (error) throw new Error(error.message);
  return { status, changed };
}
