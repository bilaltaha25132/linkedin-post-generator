import { headingRuns } from "@/lib/carousel/heading";
import type { Slide } from "@/lib/llm/prompts";

/** LinkedIn's limit for the document title it asks for on upload. */
export const LINKEDIN_TITLE_MAX = 58;

/**
 * The deck's title: the cover hook as plain text, with any grey-run brackets
 * dropped. The cover is already the deck's strongest short claim, so it names
 * the document without a second call to the writer.
 */
export function titleFromCover(slides: Slide[]): string {
  const plain = headingRuns(slides[0]?.heading ?? "")
    .map((run) => run.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return clampTitle(plain);
}

/** LinkedIn truncates silently, so cut at a word boundary before it has to. */
export function clampTitle(title: string): string {
  const text = title.trim();
  if (text.length <= LINKEDIN_TITLE_MAX) return text;
  const clipped = text.slice(0, LINKEDIN_TITLE_MAX + 1);
  const lastSpace = clipped.lastIndexOf(" ");
  return (lastSpace > 0 ? clipped.slice(0, lastSpace) : text.slice(0, LINKEDIN_TITLE_MAX)).trimEnd();
}
