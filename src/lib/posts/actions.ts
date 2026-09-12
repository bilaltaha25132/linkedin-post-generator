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

export async function updatePostBody(id: string, body: string): Promise<void> {
  const db = supabaseAdmin();
  const embedding = await embed(body);
  const { error } = await db.from("posts").update({ body, embedding }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/library");
}

export async function markPosted(id: string, externalUrl?: string): Promise<void> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("posts")
    .update({ status: "posted", posted_at: new Date().toISOString(), external_url: externalUrl ?? null })
    .eq("id", id)
    .select("discovery_id")
    .single();
  if (error) throw new Error(error.message);

  if (data.discovery_id) {
    await db.from("discoveries").update({ status: "posted" }).eq("id", data.discovery_id);
  }
  revalidatePath("/library");
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await supabaseAdmin().from("posts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/library");
}
