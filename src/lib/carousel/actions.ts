"use server";

import { revalidatePath } from "next/cache";

import { generateCarousel, type CarouselSource } from "@/lib/carousel/run";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Slide } from "@/lib/llm/prompts";

export async function generateCarouselAction(source: CarouselSource): Promise<Slide[]> {
  return generateCarousel(source);
}

/** Persist a deck with its post so it shows up wherever the post does. */
export async function saveCarouselForPost(postId: string, slides: Slide[]): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("posts")
    .update({ carousel: slides.length ? slides : null })
    .eq("id", postId);
  if (error) throw new Error(error.message);
  revalidatePath("/library");
  revalidatePath("/queue");
}
