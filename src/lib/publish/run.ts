import "server-only";

import { clampTitle, titleFromCover } from "@/lib/carousel/title";
import { markPosted } from "@/lib/posts/actions";
import { createPost, postUrl, toCommentary, uploadDocument } from "@/lib/publish/linkedin-api";
import { linkedInCredentials } from "@/lib/publish/queries";
import { emailConfigured, sendEmail } from "@/lib/notify/email";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Slide } from "@/lib/llm/prompts";

export const OUTBOX = "outbox";

/**
 * Publishes one post to LinkedIn, with its staged carousel PDF when given, then
 * marks it posted with the link. The staged PDF is removed whatever the outcome.
 */
export async function publishPost(postId: string, carouselPath?: string): Promise<{ url: string }> {
  try {
    return await publish(postId, carouselPath);
  } finally {
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

/**
 * Publishes every post whose scheduled time has come. Each one is claimed by
 * clearing its schedule first, so overlapping runs can't post it twice, and a
 * failure isn't retried on its own: it's shown on the card and emailed.
 */
export async function publishDue(baseUrl: string): Promise<{ published: number; failed: number; errors: string[] }> {
  const db = supabaseAdmin();
  const { data: due, error } = await db
    .from("posts")
    .select("id,body,scheduled_pdf")
    .not("scheduled_at", "is", null)
    .lte("scheduled_at", new Date().toISOString())
    .is("linkedin_urn", null)
    .order("scheduled_at")
    .limit(5);
  if (error) throw new Error(error.message);

  let published = 0;
  const errors: string[] = [];
  for (const { id, body, scheduled_pdf: pdfPath } of due ?? []) {
    const { data: claimed, error: claimError } = await db
      .from("posts")
      .update({ scheduled_at: null, scheduled_pdf: null, publish_error: null })
      .eq("id", id)
      .not("scheduled_at", "is", null)
      .select("id")
      .maybeSingle();
    if (claimError) {
      errors.push(claimError.message);
      continue;
    }
    if (!claimed) continue;

    const opening = firstLine(body as string);
    try {
      const { url } = await publishPost(id, (pdfPath as string | null) ?? undefined);
      published++;
      await tell(`Published: ${opening}`, `Your scheduled post is live on LinkedIn: ${url}`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      errors.push(reason);
      await db.from("posts").update({ publish_error: reason }).eq("id", id);
      await tell(
        `Scheduled post didn't go out: ${opening}`,
        `${reason}\n\nOpen Signal Desk to publish it now or pick a new time: ${baseUrl}/queue`,
      );
    }
  }
  return { published, failed: errors.length, errors };
}

function firstLine(body: string): string {
  const line = body.trim().split("\n")[0] ?? "";
  return line.length > 70 ? `${line.slice(0, 67)}...` : line;
}

async function tell(subject: string, text: string): Promise<void> {
  if (!emailConfigured()) return;
  try {
    await sendEmail(subject, `<p>${escapeHtml(text).replace(/\n/g, "<br>")}</p>`, text);
  } catch (err) {
    console.error(err);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
