import "server-only";

import { env } from "@/lib/env";
import { pullRelayed, RELAY_USER_AGENT, relayUrls } from "@/lib/leads/marketplaces";
import { judgeLead } from "@/lib/leads/score";
import { AI_WORK, GIG_WORK, leadLanes, tooOld } from "@/lib/leads/sources";
import type { RawLead } from "@/lib/leads/types";
import { supabaseAdmin } from "@/lib/supabase/server";

export interface LeadsRunResult {
  lanes: number;
  pulled: number;
  added: number;
  scored: number;
  skipped: string[];
  errors: string[];
}

const SCORE_CONCURRENCY = 3;
// Contract roles come from the Jobs pass, already scored; only decent ones become leads.
const CONTRACT_MIN_SCORE = 55;

/** One Leads pass: pull every lane that has its keys, store what's new, score the backlog. */
export async function runLeads(opts: { budgetMs?: number } = {}): Promise<LeadsRunResult> {
  const deadline = Date.now() + (opts.budgetMs ?? 240_000);
  const result: LeadsRunResult = { lanes: 0, pulled: 0, added: 0, scored: 0, skipped: [], errors: [] };

  const lanes = leadLanes();
  const ready = lanes.filter((l) => l.needs.length === 0 && !l.relay);
  for (const lane of lanes) if (lane.needs.length) result.skipped.push(`${lane.label}: needs ${lane.needs.join(", ")}`);

  const pulls = await Promise.allSettled(ready.map((l) => l.pull()));
  const raw: RawLead[] = [];
  pulls.forEach((p, i) => {
    if (p.status === "fulfilled") raw.push(...p.value);
    else result.errors.push(`${ready[i].label}: ${(p.reason as Error).message}`);
  });
  result.lanes = ready.length;
  result.pulled = raw.length;

  result.added = (await storeNew(raw)) + (await addContractRoles());

  const scoring = await scoreLeadBacklog(env.leads().maxScoredPerRun, deadline);
  result.scored = scoring.scored;
  result.errors.push(...scoring.errors);
  return result;
}

/** The pages the runner should fetch for each relayed lane. */
export async function leadsRelayPlan(): Promise<{ id: string; name: string; requests: { url: string; headers: Record<string, string> }[] }[]> {
  return Promise.all(
    leadLanes()
      .filter((l) => l.relay)
      .map(async (l) => ({
        id: l.key,
        name: l.label,
        requests: (await relayUrls(l.pull)).map((url) => ({ url, headers: { "User-Agent": RELAY_USER_AGENT } })),
      })),
  );
}

/** Parses the pages the runner fetched for one relayed lane and stores what's new; the main pass scores them. */
export async function ingestRelayedLeads(key: string, bodies: Map<string, string>): Promise<{ pulled: number; added: number }> {
  const lane = leadLanes().find((l) => l.key === key && l.relay);
  if (!lane) throw new Error(`No relayed lane "${key}"`);
  const raw = await pullRelayed(lane.pull, bodies);
  return { pulled: raw.length, added: await storeNew(raw) };
}

/** Inserts the leads not seen before. Old and off-topic items never reach the classifier. */
export async function storeNew(raw: RawLead[]): Promise<number> {
  const fresh = raw.filter(
    (l) => !tooOld(l.postedAt) && (l.kindHint === "gig" ? GIG_WORK : AI_WORK).test(`${l.title ?? ""} ${l.text}`),
  );
  const byUrl = new Map(fresh.map((l) => [l.url, l]));
  if (byUrl.size === 0) return 0;

  const db = supabaseAdmin();
  const { data: existing, error } = await db.from("leads").select("url").in("url", [...byUrl.keys()]);
  if (error) throw new Error(error.message);
  for (const row of existing ?? []) byUrl.delete(row.url as string);
  if (byUrl.size === 0) return 0;

  const rows = [...byUrl.values()].map((l) => ({
    kind: l.kindHint ?? "client_post",
    source: l.source,
    url: l.url,
    posted_at: l.postedAt,
    who: l.who,
    wants: l.title,
    stack: l.stack,
    budget: l.budget,
    snippet: l.text.slice(0, 4000),
  }));
  const { error: insertError } = await db.from("leads").upsert(rows, { onConflict: "url", ignoreDuplicates: true });
  if (insertError) throw new Error(insertError.message);
  return rows.length;
}

/** Contract and freelance roles the Jobs pass found, carried over with the job's own score. */
async function addContractRoles(): Promise<number> {
  const db = supabaseAdmin();
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const { data, error } = await db
    .from("jobs")
    .select("company,title,url_apply,posted_at,first_seen_at,location_raw,remote_scope,pay_min,pay_max,currency,pay_period,score,score_detail")
    .eq("is_contract", true)
    .is("closed_at", null)
    .gte("first_seen_at", since)
    .gte("score", CONTRACT_MIN_SCORE);
  if (error) throw new Error(error.message);
  if (!data?.length) return 0;

  const rows = data.map((j) => {
    const detail = j.score_detail as { why?: string; stack_overlap?: string[] } | null;
    return {
      kind: "contract_role",
      source: "jobs",
      url: j.url_apply,
      posted_at: j.posted_at ?? j.first_seen_at,
      who: j.company,
      wants: j.title,
      stack: detail?.stack_overlap ?? [],
      region: j.location_raw,
      remote: j.remote_scope === "onsite" ? "no" : j.remote_scope === "unknown" ? "unclear" : "yes",
      budget: j.pay_min ? `${j.currency ?? ""} ${j.pay_min}${j.pay_max ? `-${j.pay_max}` : ""}${j.pay_period ? `/${j.pay_period}` : ""}`.trim() : null,
      snippet: `${j.title} at ${j.company}`,
      score: j.score,
      score_detail: { who_type: "hiring manager", why: detail?.why ?? "A contract role from the Jobs tab." },
    };
  });
  const { data: inserted, error: insertError } = await db
    .from("leads")
    .upsert(rows, { onConflict: "url", ignoreDuplicates: true })
    .select("id");
  if (insertError) throw new Error(insertError.message);
  return inserted?.length ?? 0;
}

/** Classifies unscored leads, newest first. Noise is hidden, not deleted, so it isn't pulled again. */
export async function scoreLeadBacklog(limit: number, deadline: number): Promise<{ scored: number; errors: string[] }> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("leads")
    .select("id,kind,source,wants,snippet,who,budget,posted_at")
    .is("score", null)
    .neq("status", "hidden")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  const queue = data ?? [];
  const errors: string[] = [];
  let scored = 0;
  let cursor = 0;

  const worker = async () => {
    while (cursor < queue.length && Date.now() < deadline - 15_000) {
      const lead = queue[cursor++];
      try {
        const j = await judgeLead({
          kindHint: lead.kind,
          source: lead.source,
          title: lead.wants,
          text: lead.snippet ?? "",
          who: lead.who,
          budget: lead.budget,
          postedAt: lead.posted_at,
        });
        const noise = j.kind === "noise";
        const { error: saveError } = await db
          .from("leads")
          .update({
            ...(noise ? { status: "hidden", score: 0 } : { kind: j.kind, score: j.score }),
            who: j.who,
            wants: j.wants || lead.wants,
            stack: j.stack,
            remote: j.remote,
            region: j.region,
            budget: j.budget,
            score_detail: j.detail,
            opener: noise ? null : j.opener,
            updated_at: new Date().toISOString(),
          })
          .eq("id", lead.id);
        if (saveError) throw new Error(saveError.message);
        scored++;
      } catch (err) {
        errors.push(`Lead ${lead.id}: ${(err as Error).message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: SCORE_CONCURRENCY }, worker));
  return { scored, errors };
}
