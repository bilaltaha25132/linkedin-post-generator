import "server-only";

import { env } from "@/lib/env";
import {
  dedupKey,
  isCandidateTitle,
  isContract,
  isElsewhere,
  isNationalsOnly,
  isUsOnly,
  jobRegion,
  remoteScope,
  visaFlag,
} from "@/lib/jobs/classify";
import { getJobProfile } from "@/lib/jobs/queries";
import { scoreJob } from "@/lib/jobs/score";
import { ATS_INTERVAL_HOURS, ATS_KINDS, INTERVAL_HOURS, PULLERS, fetchDescription } from "@/lib/jobs/sources";
import { payText } from "@/lib/jobs/format";
import type { JobRegion, JobSource, RawJob, RemoteScope, VisaFlag } from "@/lib/jobs/types";
import { supabaseAdmin } from "@/lib/supabase/server";

export interface JobsRunResult {
  sources: number;
  pulled: number;
  added: number;
  closed: number;
  scored: number;
  errors: string[];
}

const ALL_REGIONS: JobRegion[] = ["saudi", "gulf", "europe", "remote", "pakistan", "other"];
const PULL_CONCURRENCY = 6;
const SCORE_CONCURRENCY = 3;
// Older postings are left out: on a company board they're usually evergreen reqs.
const MAX_AGE_DAYS = 90;
// Boards only show a recent slice, so their jobs close by age.
const BOARD_JOB_LIFETIME_DAYS = 30;
// Time kept back for the scoring step after pulling.
const SCORE_RESERVE_MS = 60_000;

/** One pass: pull the boards that are due, store new roles, close gone ones, score a slice. */
export async function runJobs(opts: { budgetMs?: number; force?: boolean } = {}): Promise<JobsRunResult> {
  const cfg = env.jobs();
  const deadline = Date.now() + (opts.budgetMs ?? cfg.budgetMs);
  const result: JobsRunResult = { sources: 0, pulled: 0, added: 0, closed: 0, scored: 0, errors: [] };

  const due = await dueSources(cfg.maxSourcesPerRun, opts.force ?? false);
  result.sources = due.length;

  let cursor = 0;
  const pullWorker = async () => {
    while (cursor < due.length && Date.now() < deadline - SCORE_RESERVE_MS) {
      const source = due[cursor++];
      try {
        const counts = await pullSource(source);
        result.pulled += counts.pulled;
        result.added += counts.added;
        result.closed += counts.closed;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        result.errors.push(`${source.name} (${source.kind}): ${message}`);
        await supabaseAdmin()
          .from("job_sources")
          .update({ last_pulled_at: new Date().toISOString(), last_ok: false, last_error: message.slice(0, 300) })
          .eq("id", source.id);
      }
    }
  };
  await Promise.all(Array.from({ length: PULL_CONCURRENCY }, pullWorker));

  result.closed += await closeStaleBoardJobs();

  try {
    const scoring = await scoreBacklog(cfg.maxScoredPerRun, deadline);
    result.scored = scoring.scored;
    result.errors.push(...scoring.errors);
  } catch (err) {
    result.errors.push(`Scoring: ${err instanceof Error ? err.message : String(err)}`);
  }
  return result;
}

async function dueSources(limit: number, force: boolean): Promise<JobSource[]> {
  const { data, error } = await supabaseAdmin()
    .from("job_sources")
    .select("*")
    .eq("enabled", true)
    .order("last_pulled_at", { ascending: true, nullsFirst: true });
  if (error) throw new Error(error.message);

  const now = Date.now();
  return (data as JobSource[])
    .filter((s) => {
      if (!PULLERS[s.kind]) return false;
      if (force || !s.last_pulled_at) return true;
      const hours = ATS_KINDS.has(s.kind) ? ATS_INTERVAL_HOURS : (INTERVAL_HOURS[s.kind] ?? 6);
      // A little slack so an hourly cron that starts early still picks it up.
      return now - Date.parse(s.last_pulled_at) >= hours * 3_600_000 - 10 * 60_000;
    })
    .slice(0, limit);
}

interface Classified {
  raw: RawJob;
  sourceId: string;
  scope: RemoteScope;
  region: JobRegion;
  visa: VisaFlag;
  key: string;
}

async function pullSource(source: JobSource): Promise<{ pulled: number; added: number; closed: number }> {
  const { jobs, complete } = await PULLERS[source.kind](source);
  return ingestJobs(source, jobs, complete);
}

/**
 * Filters, dedups and stores one source's postings, and marks the source pulled.
 * `complete` means the list is every open role on that board, so missing ones closed.
 */
export async function ingestJobs(
  source: JobSource,
  jobs: RawJob[],
  complete: boolean,
): Promise<{ pulled: number; added: number; closed: number }> {
  const db = supabaseAdmin();
  const ats = ATS_KINDS.has(source.kind);
  // IDs are only unique within one company's board.
  const idOf = (raw: RawJob) => (ats ? `${source.token}:${raw.sourceId}` : raw.sourceId);
  const seenIds = jobs.map(idOf);
  const now = new Date().toISOString();
  const oldest = Date.now() - MAX_AGE_DAYS * 86_400_000;

  const candidates: Classified[] = [];
  for (const raw of jobs) {
    if (!raw.title || !raw.urlApply) continue;
    // HN posts put the role anywhere in the first lines, so the whole head is checked.
    const head = source.kind === "hn" ? raw.description.slice(0, 400) : raw.title;
    if (isNationalsOnly(raw) || isUsOnly(raw)) continue;
    if (raw.postedAt && Date.parse(raw.postedAt) < oldest) continue;
    const scope = remoteScope(raw);
    let region = jobRegion(raw, scope);
    // A European company's board with a city the list doesn't know is still Europe.
    if (region === "other" && (source.region === "europe" || source.region === "gulf") && !isElsewhere(raw)) {
      region = source.region;
    }
    if (!isCandidateTitle(head, region)) continue;
    // Somewhere named, and none of it in his regions: it could only score at the cap.
    if (region === "other" && (raw.location.trim() || raw.countries.length)) continue;
    candidates.push({
      raw,
      sourceId: idOf(raw),
      scope,
      region,
      visa: visaFlag(raw, region, scope),
      key: dedupKey(raw.company, raw.title, scope),
    });
  }

  // Roles already stored from this source: just mark them seen.
  const existing = new Set<string>();
  for (const ids of chunks(candidates.map((c) => c.sourceId), 150)) {
    const { data, error } = await db
      .from("jobs")
      .update({ last_seen_at: now, missed_pulls: 0 })
      .eq("source", source.kind)
      .in("source_id", ids)
      .is("closed_at", null)
      .select("source_id");
    if (error) throw new Error(error.message);
    for (const row of data) existing.add(row.source_id);
  }
  const fresh = candidates.filter((c) => !existing.has(c.sourceId));

  // The same role from another source becomes one card; the company's own board wins.
  const duplicates = new Map<string, { id: string; source: string }>();
  for (const keys of chunks([...new Set(fresh.map((c) => c.key))], 150)) {
    const { data, error } = await db
      .from("jobs")
      .select("id,source,dedup_key")
      .in("dedup_key", keys)
      .is("closed_at", null);
    if (error) throw new Error(error.message);
    for (const row of data) duplicates.set(row.dedup_key, { id: row.id, source: row.source });
  }
  const supersede: string[] = [];
  const rows = [];
  for (const c of fresh) {
    const dupe = duplicates.get(c.key);
    if (dupe) {
      if (!ats || ATS_KINDS.has(dupe.source)) continue;
      supersede.push(dupe.id);
    }
    duplicates.set(c.key, { id: "", source: source.kind });
    rows.push(toRow(source, c));
  }

  if (rows.length) {
    const { error } = await db.from("jobs").upsert(rows, { onConflict: "source,source_id", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }
  if (supersede.length) {
    await db.from("jobs").update({ closed_at: now }).in("id", supersede);
  }

  let closed = supersede.length;
  if (complete) closed += await countMissedPulls(source, new Set(seenIds));

  await db
    .from("job_sources")
    .update({ last_pulled_at: now, last_ok: true, last_error: null, last_count: jobs.length })
    .eq("id", source.id);

  return { pulled: jobs.length, added: rows.length, closed };
}

function toRow(source: JobSource, c: Classified) {
  const { raw } = c;
  return {
    source: source.kind,
    source_id: c.sourceId,
    source_ref: source.id,
    source_credit: source.name,
    company: raw.company.slice(0, 200),
    title: raw.title.slice(0, 300),
    location_raw: raw.location.slice(0, 500) || null,
    countries: [...new Set(raw.countries)].slice(0, 20),
    region: c.region,
    remote_scope: c.scope,
    employment_type: raw.employmentType,
    is_contract: isContract(raw.employmentType, raw.title),
    pay_min: raw.payMin ? Math.round(raw.payMin) : null,
    pay_max: raw.payMax ? Math.round(raw.payMax) : null,
    currency: raw.currency,
    pay_period: raw.payPeriod,
    url_apply: raw.urlApply,
    url_source: raw.urlSource,
    posted_at: raw.postedAt,
    description: raw.description.slice(0, 12_000),
    dedup_key: c.key,
    visa_flag: c.visa,
  };
}

/** A company board listed every open role: roles missing twice in a row have closed. */
async function countMissedPulls(source: JobSource, seen: Set<string>): Promise<number> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("jobs")
    .select("id,source_id,missed_pulls")
    .eq("source_ref", source.id)
    .is("closed_at", null);
  if (error) throw new Error(error.message);

  const missing = data.filter((row) => !seen.has(row.source_id));
  const closing = missing.filter((row) => row.missed_pulls >= 1).map((row) => row.id);
  const missedOnce = missing.filter((row) => row.missed_pulls < 1).map((row) => row.id);
  if (closing.length) {
    await db.from("jobs").update({ closed_at: new Date().toISOString(), missed_pulls: 2 }).in("id", closing);
  }
  if (missedOnce.length) await db.from("jobs").update({ missed_pulls: 1 }).in("id", missedOnce);
  return closing.length;
}

async function closeStaleBoardJobs(): Promise<number> {
  const cutoff = new Date(Date.now() - BOARD_JOB_LIFETIME_DAYS * 86_400_000).toISOString();
  const { data, error } = await supabaseAdmin()
    .from("jobs")
    .update({ closed_at: new Date().toISOString() })
    .not("source", "in", `(${[...ATS_KINDS].join(",")})`)
    .is("closed_at", null)
    .lt("last_seen_at", cutoff)
    .in("status", ["new", "hidden"])
    .select("id");
  if (error) throw new Error(error.message);
  return data.length;
}

interface QueuedJob {
  id: string;
  source: string;
  source_id: string;
  company: string;
  title: string;
  location_raw: string | null;
  remote_scope: RemoteScope;
  region: JobRegion | null;
  visa_flag: VisaFlag;
  employment_type: string | null;
  pay_min: number | null;
  pay_max: number | null;
  currency: string | null;
  pay_period: string | null;
  posted_at: string | null;
  description: string | null;
}

/** Score unscored open roles, his top region first, then the newest. */
export async function scoreBacklog(limit: number, deadline: number): Promise<{ scored: number; errors: string[] }> {
  const db = supabaseAdmin();
  const profile = await getJobProfile();
  const regions = [...profile.regions, ...ALL_REGIONS.filter((r) => !profile.regions.includes(r))];
  const queue: QueuedJob[] = [];
  for (const region of regions) {
    if (queue.length >= limit) break;
    const { data, error } = await db
      .from("jobs")
      .select(
        "id,source,source_id,company,title,location_raw,remote_scope,region,visa_flag,employment_type,pay_min,pay_max,currency,pay_period,posted_at,description",
      )
      .eq("region", region)
      .is("score", null)
      .is("closed_at", null)
      .neq("status", "hidden")
      .order("posted_at", { ascending: false, nullsFirst: false })
      .limit(limit - queue.length);
    if (error) throw new Error(error.message);
    queue.push(...(data as QueuedJob[]));
  }

  let scored = 0;
  const errors: string[] = [];
  let cursor = 0;
  const worker = async () => {
    while (cursor < queue.length && Date.now() < deadline - 15_000) {
      const job = queue[cursor++];
      try {
        // Some lists carry only a teaser; the posting itself has the whole ad.
        if ((job.description?.length ?? 0) < 600) {
          const full = await fetchDescription(job.source, job.source_id).catch(() => null);
          if (full && full.length > (job.description?.length ?? 0)) {
            job.description = full;
            await db.from("jobs").update({ description: full.slice(0, 12_000) }).eq("id", job.id);
          }
        }
        const { score, detail, visa } = await scoreJob(
          {
            company: job.company,
            title: job.title,
            location: job.location_raw ?? "",
            remoteScope: job.remote_scope,
            region: job.region ?? "other",
            visaFlag: job.visa_flag,
            employmentType: job.employment_type,
            pay: payText(job),
            postedAt: job.posted_at,
            description: job.description ?? "",
          },
          profile,
        );
        const { error: saveError } = await db
          .from("jobs")
          .update({ score, score_detail: detail, visa_flag: visa, scored_at: new Date().toISOString() })
          .eq("id", job.id);
        if (saveError) throw new Error(saveError.message);
        scored += 1;
      } catch (err) {
        errors.push(`Scoring "${job.title}": ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  };
  await Promise.all(Array.from({ length: SCORE_CONCURRENCY }, worker));
  return { scored, errors };
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

