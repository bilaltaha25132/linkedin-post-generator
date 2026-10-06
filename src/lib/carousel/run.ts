import "server-only";

import { getDiscovery } from "@/lib/discoveries/queries";
import { sourceFigures, type SourceFigure } from "@/lib/feeds/figures";
import { chat } from "@/lib/llm/client";
import { buildCarouselPrompt, parseCarousel, SLIDE_DELIMITER, type Slide } from "@/lib/llm/prompts";

export interface CarouselSource {
  /** The news item the post came from; absent for posts written from scratch. */
  discoveryId?: string | null;
  postBody?: string;
}

export async function generateCarousel({ discoveryId, postBody }: CarouselSource): Promise<Slide[]> {
  const { prompt, figures } = await promptFor({ discoveryId, postBody });

  // The model occasionally ignores the slide delimiter and returns one blob;
  // when too few slides parse, reroll once with a corrective nudge.
  let slides = parseCarousel(await chat(prompt), figures);
  if (slides.length < 3) {
    slides = parseCarousel(
      await chat({
        ...prompt,
        user: `${prompt.user}\n\nIMPORTANT: your last reply did not separate the slides. Output 7-9 slides, each pair separated by a line containing exactly ${SLIDE_DELIMITER}.`,
      }),
      figures,
    );
  }

  if (slides.length === 0) throw new Error("The writer returned no usable slides. Try again.");
  return slides;
}

async function promptFor({ discoveryId, postBody }: CarouselSource) {
  if (discoveryId) {
    const discovery = await getDiscovery(discoveryId);
    if (!discovery) throw new Error("Discovery not found");
    // A deck shows the source's own charts (a paper's, a lab's) on its key slides.
    const figures: SourceFigure[] = await sourceFigures(discovery.url);
    const prompt = buildCarouselPrompt({
      title: discovery.title ?? "",
      content: discovery.content_md ?? discovery.snippet ?? discovery.title ?? "",
      angle: discovery.suggested_angle,
      postBody,
      figureCaptions: figures.map((f) => f.caption || "(no caption)"),
    });
    return { prompt, figures };
  }

  const body = postBody?.trim();
  if (!body) throw new Error("Write the post first, then build a carousel from it.");
  return { prompt: buildCarouselPrompt({ title: body.split("\n")[0].slice(0, 140), content: body }), figures: [] };
}
