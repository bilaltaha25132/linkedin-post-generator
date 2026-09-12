"use server";

import { generateCarousel } from "@/lib/carousel/run";
import type { Slide } from "@/lib/llm/prompts";

export async function generateCarouselAction(discoveryId: string, postBody?: string): Promise<Slide[]> {
  return generateCarousel(discoveryId, postBody);
}
