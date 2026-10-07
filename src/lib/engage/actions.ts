"use server";

import { revalidatePath } from "next/cache";

import { attempt, type ActionResult } from "@/lib/action-result";
import { draftComments, draftReply } from "@/lib/engage/comments";
import type { Tier } from "@/lib/engage/types";
import { activityIdOf, cleanLinkedInUrl, postedAtFromId } from "@/lib/links/deep";
import { supabaseAdmin } from "@/lib/supabase/server";

const done = () => revalidatePath("/engage");

/**
 * Takes in a post he shared or pasted, then drafts comments for it. Only what he
 * gives is used: the URL for its age, and the text he copied.
 */
export async function capturePost(input: {
  url?: string;
  text?: string;
  via?: "share" | "bookmarklet" | "paste";
}): Promise<ActionResult<{ id: string }>> {
  return attempt(async () => {
    // The LinkedIn app shares "text… https://…" in one field.
    const rawUrl = input.url?.trim() || input.text?.match(/https?:\/\/\S*linkedin\.com\/\S+/)?.[0] || "";
    const url = rawUrl ? cleanLinkedInUrl(rawUrl) : null;
    if (rawUrl && !url) throw new Error("That isn't a LinkedIn link.");
    const text = (input.text ?? "").replace(rawUrl, "").trim().slice(0, 8000);
    if (!url && !text) throw new Error("Paste a LinkedIn post link, its text, or both.");

    const activityId = url ? activityIdOf(url) : null;
    const db = supabaseAdmin();
    const row = {
      url,
      activity_id: activityId,
      posted_at: activityId ? (postedAtFromId(activityId)?.toISOString() ?? null) : null,
      author_name: authorFromUrl(url),
      via: input.via ?? "paste",
    };

    let id: string;
    const existing = url ? await db.from("captured_posts").select("id,text").eq("url", url).maybeSingle() : null;
    if (existing?.data) {
      id = existing.data.id as string;
      if (text && text !== existing.data.text) {
        await db.from("captured_posts").update({ text, embedding: null }).eq("id", id);
      }
    } else {
      const { data, error } = await db.from("captured_posts").insert({ ...row, text }).select("id").single();
      if (error) throw new Error(error.message);
      id = data.id as string;
    }

    if (text || existing?.data?.text) await draftComments(id);
    done();
    return { id };
  });
}

/** "…/posts/jane-doe_some-title-activity-…" names the author; feed links don't. */
function authorFromUrl(url: string | null): string | null {
  const slug = url?.match(/\/posts\/([a-z0-9-]+?)_/i)?.[1];
  if (!slug) return null;
  return slug
    .split("-")
    .filter((w) => w && !/^\d+$/.test(w) && !/^[0-9a-f]{6,}$/i.test(w))
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export async function setCapturedText(id: string, text: string): Promise<ActionResult<null>> {
  return attempt(async () => {
    const { error } = await supabaseAdmin()
      .from("captured_posts")
      .update({ text: text.trim().slice(0, 8000), embedding: null })
      .eq("id", id);
    if (error) throw new Error(error.message);
    await draftComments(id);
    done();
    return null;
  });
}

export async function redraftComments(id: string): Promise<ActionResult<null>> {
  return attempt(async () => {
    await draftComments(id);
    done();
    return null;
  });
}

export async function setAuthor(id: string, author: string): Promise<ActionResult<null>> {
  return attempt(async () => {
    const { error } = await supabaseAdmin()
      .from("captured_posts")
      .update({ author_name: author.trim().slice(0, 120) || null })
      .eq("id", id);
    if (error) throw new Error(error.message);
    done();
    return null;
  });
}

export async function removeCaptured(id: string): Promise<ActionResult<null>> {
  return attempt(async () => {
    const { error } = await supabaseAdmin().from("captured_posts").delete().eq("id", id);
    if (error) throw new Error(error.message);
    done();
    return null;
  });
}

export async function saveDraftEdit(draftId: string, body: string): Promise<ActionResult<null>> {
  return attempt(async () => {
    const { error } = await supabaseAdmin()
      .from("comment_drafts")
      .update({ edited_body: body.slice(0, 3000) })
      .eq("id", draftId);
    if (error) throw new Error(error.message);
    return null;
  });
}

/** He posted this comment himself on LinkedIn; kept for the pod guard and post ideas. */
export async function logCommentPosted(draftId: string, body: string): Promise<ActionResult<null>> {
  return attempt(async () => {
    const { error } = await supabaseAdmin()
      .from("comment_drafts")
      .update({ edited_body: body.slice(0, 3000), posted_at: new Date().toISOString() })
      .eq("id", draftId);
    if (error) throw new Error(error.message);
    done();
    return null;
  });
}

// ── Rounds ──────────────────────────────────────────────────────────────────

export async function addWatchPerson(input: {
  name: string;
  profileUrl: string;
  tier: Tier;
  topics: string;
}): Promise<ActionResult<null>> {
  return attempt(async () => {
    const name = input.name.trim();
    if (!name) throw new Error("Add a name.");
    let profileUrl: string | null = null;
    if (input.profileUrl.trim()) {
      profileUrl = cleanLinkedInUrl(input.profileUrl.trim());
      if (!profileUrl || !/\/(in|company)\/[^/]+/.test(profileUrl)) {
        throw new Error("Use their LinkedIn profile or company page link.");
      }
      profileUrl = profileUrl.match(/^https:\/\/www\.linkedin\.com\/(in|company)\/[^/?#]+/)![0];
    }
    const { error } = await supabaseAdmin()
      .from("watch_people")
      .insert({
        name,
        profile_url: profileUrl,
        kind: profileUrl?.includes("/company/") ? "company" : "person",
        tier: input.tier,
        topics: splitList(input.topics),
      });
    if (error) throw new Error(error.message);
    done();
    return null;
  });
}

export async function updateWatchPerson(
  id: string,
  patch: { tier?: Tier; bell?: boolean; notes?: string; topics?: string },
): Promise<ActionResult<null>> {
  return attempt(async () => {
    const update: Record<string, unknown> = {};
    if (patch.tier) update.tier = patch.tier;
    if (patch.bell !== undefined) update.bell = patch.bell;
    if (patch.notes !== undefined) update.notes = patch.notes.slice(0, 1000) || null;
    if (patch.topics !== undefined) update.topics = splitList(patch.topics);
    const { error } = await supabaseAdmin().from("watch_people").update(update).eq("id", id);
    if (error) throw new Error(error.message);
    done();
    return null;
  });
}

export async function markVisited(id: string): Promise<void> {
  await supabaseAdmin().from("watch_people").update({ last_visited_at: new Date().toISOString() }).eq("id", id);
  done();
}

export async function removeWatchPerson(id: string): Promise<ActionResult<null>> {
  return attempt(async () => {
    const { error } = await supabaseAdmin().from("watch_people").delete().eq("id", id);
    if (error) throw new Error(error.message);
    done();
    return null;
  });
}

// ── Replies on his own posts ────────────────────────────────────────────────

export async function draftEventReply(eventId: string): Promise<ActionResult<{ reply: string }>> {
  return attempt(async () => {
    const db = supabaseAdmin();
    const { data, error } = await db.from("engagement_events").select("preview,post_url").eq("id", eventId).single();
    if (error) throw new Error(error.message);
    if (!data.preview) throw new Error("The email didn't include the comment's text. Paste it below instead.");
    const context = data.post_url ? await postTextFor(data.post_url as string) : null;
    const reply = await draftReply(data.preview as string, context);
    await db.from("engagement_events").update({ reply_draft: reply }).eq("id", eventId);
    done();
    return { reply };
  });
}

/** The pasted-comment path, for comments the email bridge didn't carry. */
export async function draftPastedReply(comment: string): Promise<ActionResult<{ reply: string }>> {
  return attempt(async () => {
    if (!comment.trim()) throw new Error("Paste the comment first.");
    return { reply: await draftReply(comment, null) };
  });
}

export async function markEventDone(eventId: string): Promise<ActionResult<null>> {
  return attempt(async () => {
    const { error } = await supabaseAdmin().from("engagement_events").update({ done: true }).eq("id", eventId);
    if (error) throw new Error(error.message);
    done();
    return null;
  });
}

/** His own post's text, when the comment is on a post published from Signal Desk. */
async function postTextFor(postUrl: string): Promise<string | null> {
  const activityId = activityIdOf(postUrl);
  if (!activityId) return null;
  const { data } = await supabaseAdmin()
    .from("posts")
    .select("body")
    .or(`external_url.ilike.%${activityId}%,linkedin_urn.ilike.%${activityId}%`)
    .limit(1)
    .maybeSingle();
  return (data?.body as string | undefined) ?? null;
}

function splitList(text: string): string[] {
  return [...new Set(text.split(",").map((t) => t.trim()).filter(Boolean))].slice(0, 20);
}
