"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { attempt, type ActionResult } from "@/lib/action-result";
import { revokeToken } from "@/lib/publish/linkedin-api";
import { getLinkedInAccount, linkedInCredentials } from "@/lib/publish/queries";
import { OUTBOX, publishPost } from "@/lib/publish/run";
import { supabaseAdmin } from "@/lib/supabase/server";

/** A one-time upload URL for the carousel PDF the browser is about to build. */
export async function stageCarousel(postId: string): Promise<ActionResult<{ path: string; uploadUrl: string }>> {
  return attempt(async () => {
    const path = `${postId}/${randomUUID()}.pdf`;
    const { data, error } = await supabaseAdmin().storage.from(OUTBOX).createSignedUploadUrl(path);
    if (error) throw new Error(`Couldn't prepare the carousel upload: ${error.message}`);
    return { path, uploadUrl: data.signedUrl };
  });
}

/**
 * Publishes one post to LinkedIn now. Runs only from the confirm step on a post
 * card: every post goes out on its own click, as LinkedIn's API terms require.
 */
export async function publishToLinkedIn(postId: string, carouselPath?: string): Promise<ActionResult<{ url: string }>> {
  if (carouselPath && !carouselPath.startsWith(`${postId}/`)) {
    return { ok: false, error: "That carousel file belongs to another post." };
  }
  return attempt(() => publishPost(postId, carouselPath));
}

/**
 * Approves one post to go out at a set time; the publish cron sends it. The
 * carousel PDF is staged now, since only the browser can draw it.
 */
export async function schedulePost(
  postId: string,
  at: string,
  carouselPath?: string,
): Promise<ActionResult<{ at: string }>> {
  if (carouselPath && !carouselPath.startsWith(`${postId}/`)) {
    return { ok: false, error: "That carousel file belongs to another post." };
  }
  const result = await attempt(async () => {
    const when = new Date(at);
    if (Number.isNaN(when.getTime())) throw new Error("Pick a date and time.");
    if (when.getTime() < Date.now() + 5 * 60_000) throw new Error("Pick a time at least five minutes from now.");
    const account = await getLinkedInAccount();
    if (!account) throw new Error("LinkedIn isn't connected yet. Connect it in Settings first.");
    if (when.getTime() >= new Date(account.expiresAt).getTime()) {
      throw new Error("The LinkedIn connection expires before then. Reconnect it in Settings, or pick an earlier time.");
    }

    const db = supabaseAdmin();
    const { data: post, error } = await db
      .from("posts")
      .select("linkedin_urn,scheduled_pdf")
      .eq("id", postId)
      .single();
    if (error) throw new Error(error.message);
    if (post.linkedin_urn) throw new Error("This post is already on LinkedIn.");

    const { error: saveError } = await db
      .from("posts")
      .update({ scheduled_at: when.toISOString(), scheduled_pdf: carouselPath ?? null, publish_error: null })
      .eq("id", postId);
    if (saveError) throw new Error(saveError.message);
    if (post.scheduled_pdf) await db.storage.from(OUTBOX).remove([post.scheduled_pdf as string]);
    revalidatePosts();
    return { at: when.toISOString() };
  });
  // A schedule that didn't save leaves nothing to publish the PDF with.
  if (!result.ok && carouselPath) await supabaseAdmin().storage.from(OUTBOX).remove([carouselPath]);
  return result;
}

export async function cancelSchedule(postId: string): Promise<ActionResult<null>> {
  return attempt(async () => {
    const db = supabaseAdmin();
    const { data: post, error } = await db.from("posts").select("scheduled_pdf").eq("id", postId).single();
    if (error) throw new Error(error.message);
    const { error: saveError } = await db
      .from("posts")
      .update({ scheduled_at: null, scheduled_pdf: null, publish_error: null })
      .eq("id", postId);
    if (saveError) throw new Error(saveError.message);
    if (post.scheduled_pdf) await db.storage.from(OUTBOX).remove([post.scheduled_pdf as string]);
    revalidatePosts();
    return null;
  });
}

function revalidatePosts() {
  revalidatePath("/library");
  revalidatePath("/queue");
}

/** Forgets the token here and revokes it at LinkedIn. */
export async function disconnectLinkedIn(): Promise<ActionResult<null>> {
  return attempt(async () => {
    const db = supabaseAdmin();
    try {
      const { token } = await linkedInCredentials();
      await revokeToken(token);
    } catch (err) {
      // An expired or unreadable token can't be revoked, and doesn't need to be.
      console.error(err);
    }
    const { error } = await db.from("linkedin_auth").delete().eq("id", 1);
    if (error) throw new Error(error.message);
    revalidatePath("/settings");
    return null;
  });
}
