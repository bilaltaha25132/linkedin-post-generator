"use server";

import { revalidatePath } from "next/cache";

import { generateBlog } from "@/lib/blog/run";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function generateBlogAction(discoveryId: string, postBody?: string): Promise<string> {
  return generateBlog(discoveryId, postBody);
}

/** Persist a blog article with its post so it travels with the post. */
export async function saveBlogForPost(postId: string, blog: string): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("posts")
    .update({ blog: blog.trim() || null })
    .eq("id", postId);
  if (error) throw new Error(error.message);
  revalidatePath("/library");
  revalidatePath("/queue");
}
