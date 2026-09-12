import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import type { Post, PostStatus } from "@/lib/db/types";

const COLUMNS =
  "id,discovery_id,body,variants,status,carousel,blog,external_url,created_at,posted_at";

export async function listPosts(status?: PostStatus): Promise<Post[]> {
  let query = supabaseAdmin().from("posts").select(COLUMNS).order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query.limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as Post[];
}

export async function getPost(id: string): Promise<Post | null> {
  const { data, error } = await supabaseAdmin().from("posts").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Post | null) ?? null;
}
