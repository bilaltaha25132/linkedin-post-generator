import "server-only";

import { getDiscovery } from "@/lib/discoveries/queries";
import { chat } from "@/lib/llm/client";
import { buildCarouselPrompt, parseCarousel, SLIDE_DELIMITER, type Slide } from "@/lib/llm/prompts";

export async function generateCarousel(
  discoveryId: string,
  postBody?: string,
): Promise<Slide[]> {
  const discovery = await getDiscovery(discoveryId);
  if (!discovery) throw new Error("Discovery not found");

  const content = discovery.content_md ?? discovery.snippet ?? discovery.title ?? "";
  const prompt = buildCarouselPrompt({
    title: discovery.title ?? "",
    content,
    angle: discovery.suggested_angle,
    postBody,
  });

  // The model occasionally ignores the slide delimiter and returns one blob;
  // when too few slides parse, reroll once with a corrective nudge.
  let slides = parseCarousel(await chat(prompt));
  if (slides.length < 3) {
    slides = parseCarousel(
      await chat({
        ...prompt,
        user: `${prompt.user}\n\nIMPORTANT: your last reply did not separate the slides. Output 7-9 slides, each pair separated by a line containing exactly ${SLIDE_DELIMITER}.`,
      }),
    );
  }

  if (slides.length === 0) throw new Error("The writer returned no usable slides. Try again.");
  return slides;
}
