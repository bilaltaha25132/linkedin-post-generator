"use server";

import { revalidatePath } from "next/cache";

import { attempt, type ActionResult } from "@/lib/action-result";
import { DEFAULT_NUDGE_DAYS } from "@/lib/leads/format";
import { runLeads, scoreLeadBacklog, type LeadsRunResult } from "@/lib/leads/run";
import { draftOpener } from "@/lib/leads/score";
import type { LeadStatus } from "@/lib/leads/types";
import { activityIdOf, cleanLinkedInUrl, postedAtFromId } from "@/lib/links/deep";
import { supabaseAdmin } from "@/lib/supabase/server";

const STATUSES: LeadStatus[] = ["new", "contacted", "talking", "won", "lost", "hidden"];
const MANUAL_BUDGET_MS = 100_000;
const DAY = 86_400_000;

export async function setLeadStatus(id: string, status: LeadStatus): Promise<ActionResult<null>> {
  return attempt(async () => {
    if (!STATUSES.includes(status)) throw new Error(`Unknown status: ${status}`);
    // Contacting someone starts the follow-up clock; any other move stops it.
    const nudge_at = status === "contacted" ? new Date(Date.now() + DEFAULT_NUDGE_DAYS * DAY).toISOString() : null;
    const { error } = await supabaseAdmin()
      .from("leads")
      .update({ status, nudge_at, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/leads");
    return null;
  });
}

export async function snoozeLead(id: string, days: number): Promise<ActionResult<null>> {
  return attempt(async () => {
    const d = Math.min(Math.max(Math.round(days), 1), 60);
    const { error } = await supabaseAdmin()
      .from("leads")
      .update({ nudge_at: new Date(Date.now() + d * DAY).toISOString(), updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/leads");
    return null;
  });
}

export async function redraftOpener(id: string): Promise<ActionResult<{ opener: string }>> {
  return attempt(async () => {
    const db = supabaseAdmin();
    const { data: lead, error } = await db.from("leads").select("kind,who,wants,snippet").eq("id", id).single();
    if (error) throw new Error(error.message);
    const opener = await draftOpener(lead);
    await db.from("leads").update({ opener, updated_at: new Date().toISOString() }).eq("id", id);
    revalidatePath("/leads");
    return { opener };
  });
}

/** A post or message he found himself, pasted in. Scored straight away. */
export async function addLead(input: { url: string; text: string }): Promise<ActionResult<{ id: string }>> {
  return attempt(async () => {
    const text = input.text.trim();
    if (text.length < 20) throw new Error("Paste the post or message text, so it can be read and scored.");
    const rawUrl = input.url.trim();
    let url: string;
    if (!rawUrl) url = `manual:${Date.now()}`;
    else if (/linkedin\.com/i.test(rawUrl)) url = cleanLinkedInUrl(rawUrl) ?? rawUrl;
    else if (/^https?:\/\//i.test(rawUrl)) url = rawUrl;
    else throw new Error("That link doesn't look like a web address.");
    const id = activityIdOf(url);

    const db = supabaseAdmin();
    const { data, error } = await db
      .from("leads")
      .upsert(
        {
          kind: "client_post",
          source: "manual",
          url,
          posted_at: (id && postedAtFromId(id)?.toISOString()) || null,
          snippet: text.slice(0, 4000),
          score: null,
          status: "new",
        },
        { onConflict: "url" },
      )
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await scoreLeadBacklog(5, Date.now() + 60_000);
    revalidatePath("/leads");
    return { id: data.id as string };
  });
}

export async function runLeadsNow(): Promise<ActionResult<LeadsRunResult>> {
  return attempt(async () => {
    const result = await runLeads({ budgetMs: MANUAL_BUDGET_MS });
    revalidatePath("/leads");
    return result;
  });
}
