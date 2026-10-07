"use server";

import { revalidatePath } from "next/cache";

import { attempt, type ActionResult } from "@/lib/action-result";
import { cleanLinkedInUrl } from "@/lib/links/deep";
import { embed } from "@/lib/llm/embeddings";
import { syncSuggestions } from "@/lib/network/suggest";
import type { ConnectionStatus, ProfileReview } from "@/lib/network/types";
import { draftNote, reviewProfile } from "@/lib/network/write";
import { skillDemand } from "@/lib/plan/next";
import { supabaseAdmin } from "@/lib/supabase/server";

const STATUSES: ConnectionStatus[] = ["suggested", "incoming", "sent", "accepted", "talking", "ignored"];

export async function setConnectionStatus(
  id: string,
  status: ConnectionStatus,
  opts: { withNote?: boolean } = {},
): Promise<ActionResult<null>> {
  return attempt(async () => {
    if (!STATUSES.includes(status)) throw new Error(`Unknown status: ${status}`);
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === "sent") {
      patch.sent_at = new Date().toISOString();
      patch.note_sent = Boolean(opts.withNote);
    }
    if (status === "suggested") {
      patch.sent_at = null;
      patch.note_sent = false;
    }
    const { error } = await supabaseAdmin().from("connections").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/network");
    return null;
  });
}

export async function draftConnectionNote(id: string): Promise<ActionResult<{ note: string }>> {
  return attempt(async () => {
    const db = supabaseAdmin();
    const { data, error } = await db.from("connections").select("name,reason,headline,source").eq("id", id).single();
    if (error) throw new Error(error.message);
    const note = await draftNote(data);
    await db.from("connections").update({ note_draft: note, updated_at: new Date().toISOString() }).eq("id", id);
    revalidatePath("/network");
    return { note };
  });
}

export async function addConnection(input: { name: string; url: string; reason: string }): Promise<ActionResult<null>> {
  return attempt(async () => {
    const name = input.name.trim().slice(0, 80);
    if (!name) throw new Error("Add a name.");
    let profile_url: string | null = null;
    if (input.url.trim()) {
      const clean = cleanLinkedInUrl(input.url.trim());
      if (!clean || !/linkedin\.com\/in\//.test(clean)) throw new Error("That isn't a LinkedIn profile link (linkedin.com/in/...).");
      profile_url = clean;
    }
    const { error } = await supabaseAdmin()
      .from("connections")
      .insert({
        name,
        profile_url,
        reason: input.reason.trim().slice(0, 300) || null,
        source: "manual",
        search_query: name,
        priority: 75,
        status: "suggested",
      });
    if (error) throw new Error(/duplicate/.test(error.message) ? "That person is already on your list." : error.message);
    revalidatePath("/network");
    return null;
  });
}

export async function refreshConnections(): Promise<ActionResult<{ added: number }>> {
  return attempt(async () => {
    const added = await syncSuggestions(Date.now());
    revalidatePath("/network");
    return { added };
  });
}

export async function runProfileReview(profile: string): Promise<ActionResult<ProfileReview>> {
  return attempt(async () => {
    const text = profile.trim();
    if (text.length < 200) throw new Error("Paste at least your headline, About and experience (a few paragraphs).");
    const db = supabaseAdmin();
    await db.from("profile_review").upsert({ id: 1, profile: text.slice(0, 20000), updated_at: new Date().toISOString() });
    const review = await reviewProfile(text, await skillDemand(Date.now()));
    const vector = await embed(text.slice(0, 8000));
    const { error } = await db
      .from("profile_review")
      .update({ review, reviewed_at: new Date().toISOString(), ...(vector ? { embedding: vector } : {}) })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    revalidatePath("/network");
    return review;
  });
}
