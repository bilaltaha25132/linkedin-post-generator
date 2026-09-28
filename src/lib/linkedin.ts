/**
 * LinkedIn's composer discards any line that holds only whitespace, and our
 * paragraph gaps are exactly that — so a post pasted straight from here arrives
 * with every blank line gone and reads as one slab. A line carrying Braille
 * Pattern Blank (U+2800) is not empty, so LinkedIn keeps it, and the glyph is a
 * blank braille cell, so nothing renders. Stored bodies stay clean; only the
 * copy that leaves the app carries the spacers.
 */
const BLANK_LINE = "⠀";

/** The post as LinkedIn will keep it: same text, paragraph gaps preserved. */
export function forLinkedIn(body: string): string {
  return body
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => (line.trim() ? line : BLANK_LINE))
    .join("\n");
}

export async function copyForLinkedIn(body: string): Promise<void> {
  await navigator.clipboard.writeText(forLinkedIn(body));
}
