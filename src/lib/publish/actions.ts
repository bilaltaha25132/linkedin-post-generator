"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { attempt, type ActionResult } from "@/lib/action-result";
import { clampTitle, titleFromCover } from "@/lib/carousel/title";
import { markPosted } from "@/lib/posts/actions";
import { createPost, postUrl, revokeToken, toCommentary, uploadDocument } from "@/lib/publish/linkedin-api";
import { linkedInCredentials } from "@/lib/publish/queries";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Slide } from "@/lib/llm/prompts";

const OUTBOX = "outbox";

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
 * Publishes one post to LinkedIn now, with its staged carousel PDF when given,
 * then marks it posted with the link. Runs only from the confirm step on a post
 * card: every post goes out on its own click, as LinkedIn's API terms require.
 */
export async function publishToLinkedIn(postId: string, carouselPath?: string): Promise<ActionResult<{ url: string }>> {
  if (carouselPath && !carouselPath.startsWith(`${postId}/`)) {
    return { ok: false, error: "That carousel file belongs to another post." };
  }
  try {
    return await attempt(() => publish(postId, carouselPath));
  } finally {
    // The staged PDF is only a hand-off, whatever the outcome.
    if (carouselPath) await supabaseAdmin().storage.from(OUTBOX).remove([carouselPath]);
  }
}

async function publish(postId: string, carouselPath?: string): Promise<{ url: string }> {
  const db = supabaseAdmin();
  const { data: post, error } = await db
    .from("posts")
    .select("body,carousel,carousel_title,linkedin_urn")
    .eq("id", postId)
    .single();
  if (error) throw new Error(error.message);
  if (post.linkedin_urn) throw new Error("This post is already on LinkedIn.");
  const { token, author } = await linkedInCredentials();

  let document: { urn: string; title: string } | undefined;
  if (carouselPath) {
    const { data: pdf, error: downloadError } = await db.storage.from(OUTBOX).download(carouselPath);
    if (downloadError || !pdf) throw new Error("The carousel PDF didn't reach the server. Try again.");
    const title = clampTitle(post.carousel_title ?? "") || titleFromCover((post.carousel ?? []) as Slide[]);
    document = { urn: await uploadDocument(token, author, pdf), title };
  }

  const urn = await createPost(token, author, toCommentary(post.body as string), document);
  const url = postUrl(urn);

  // From here the post is live, so a failure must not invite a second publish.
  const { error: saveError } = await db.from("posts").update({ linkedin_urn: urn }).eq("id", postId);
  try {
    if (saveError) throw new Error(saveError.message);
    await markPosted(postId, url);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Published to LinkedIn (${url}), but saving that here failed: ${reason}. Don't publish again; use Mark posted with that link.`,
    );
  }
  return { url };
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
