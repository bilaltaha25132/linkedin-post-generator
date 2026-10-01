"use server";

import { revalidatePath } from "next/cache";

import { embed } from "@/lib/llm/embeddings";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Save a chosen draft. Embeds the body so future generations know about it. */
export async function createPost(input: {
  discoveryId: string | null;
  body: string;
  variants?: string[];
}): Promise<string> {
  const db = supabaseAdmin();
  const embedding = await embed(input.body);

  const { data, error } = await db
    .from("posts")
    .insert({
      discovery_id: input.discoveryId,
      body: input.body,
      variants: input.variants ?? null,
      status: "draft",
      embedding,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (input.discoveryId) {
    await db.from("discoveries").update({ status: "drafted" }).eq("id", input.discoveryId);
  }
  revalidatePath("/library");
  revalidatePath("/");
  return data.id as string;
}

/**
 * Auto-save a draft as it's written. Keeps one draft row per discovery (reuses
 * the existing one on regenerate/edit) so the library shows one entry per item
 * instead of a pile of near-identical takes. Returns the post id.
 */
export async function upsertDraftForDiscovery(input: {
  discoveryId: string;
  body: string;
  variants?: string[];
}): Promise<string> {
  const db = supabaseAdmin();
  const embedding = await embed(input.body);

  const { data: existing } = await db
    .from("posts")
    .select("id")
    .eq("discovery_id", input.discoveryId)
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(1);
  const existingId = existing?.[0]?.id as string | undefined;

  let postId: string;
  if (existingId) {
    const { error } = await db
      .from("posts")
      .update({ body: input.body, variants: input.variants ?? null, embedding })
      .eq("id", existingId);
    if (error) throw new Error(error.message);
    postId = existingId;
  } else {
    const { data, error } = await db
      .from("posts")
      .insert({
        discovery_id: input.discoveryId,
        body: input.body,
        variants: input.variants ?? null,
        status: "draft",
        embedding,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    postId = data.id as string;
  }

  await db.from("discoveries").update({ status: "drafted" }).eq("id", input.discoveryId);
  revalidatePath("/library");
  revalidatePath("/");
  return postId;
}

/**
 * Autosave path, called on every pause in typing, so it doesn't re-embed: that
 * burned the free embeddings quota. The post is embedded when created and
 * again, on its final text, when marked posted.
 */
export async function updatePostBody(id: string, body: string): Promise<void> {
  const db = supabaseAdmin();
  const { error } = await db.from("posts").update({ body }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/library");
  revalidatePath("/posted");
}

/** Add a draft to the "to be posted" queue, or take it back out. */
export async function setPostQueued(id: string, queued: boolean): Promise<void> {
  const db = supabaseAdmin();
  const { error } = await db
    .from("posts")
    .update({ status: queued ? "queued" : "draft" })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/library");
  revalidatePath("/queue");
}

export async function markPosted(id: string, externalUrl?: string): Promise<void> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("posts")
    .update({ status: "posted", posted_at: new Date().toISOString(), external_url: externalUrl ?? null })
    .eq("id", id)
    .select("discovery_id,body")
    .single();
  if (error) throw new Error(error.message);

  // Re-embed the final text so repeat checks compare against what went out.
  const embedding = await embed(data.body as string);
  if (embedding) await db.from("posts").update({ embedding }).eq("id", id);

  if (data.discovery_id) {
    await db.from("discoveries").update({ status: "posted" }).eq("id", data.discovery_id);
  }
  revalidatePath("/library");
  revalidatePath("/queue");
  revalidatePath("/posted");
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await supabaseAdmin().from("posts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/library");
  revalidatePath("/queue");
  revalidatePath("/posted");
}
