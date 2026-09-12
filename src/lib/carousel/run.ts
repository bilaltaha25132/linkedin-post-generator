import "server-only";

import { getDiscovery } from "@/lib/discoveries/queries";
import { chat } from "@/lib/llm/client";
import { buildCarouselPrompt, parseCarousel, type Slide } from "@/lib/llm/prompts";

export async function generateCarousel(
  discoveryId: string,
  postBody?: string,
): Promise<Slide[]> {
  const discovery = await getDiscovery(discoveryId);
  if (!discovery) throw new Error("Discovery not found");

  const content = discovery.content_md ?? discovery.snippet ?? discovery.title ?? "";
  const raw = await chat(
    buildCarouselPrompt({
      title: discovery.title ?? "",
      content,
      angle: discovery.suggested_angle,
      postBody,
    }),
  );

  const slides = parseCarousel(raw);
  if (slides.length === 0) throw new Error("The writer returned no usable slides. Try again.");
  return slides;
}
