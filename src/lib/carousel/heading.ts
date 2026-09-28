export const CAROUSEL_HANDLE = "Bilal Taha";

export interface HeadingRun {
  text: string;
  muted: boolean;
}

/**
 * Split a slide heading into an ink lead and a grey continuation, the EdgeFirm
 * heading style: "Four rules, / on every engagement." A `[bracketed]` phrase
 * is the grey part. Headings without brackets (older decks, hand edits) are
 * split at their first clause break, else near the middle; very short ones
 * stay one colour.
 */
export function headingRuns(heading: string): HeadingRun[] {
  if (/\[[^\]]+\]/.test(heading)) return bracketRuns(heading);

  const text = heading.trim();
  const clause = text.match(/^(.{6,}?[,:;.?!—–])\s+(\S.{3,})$/);
  if (clause) return [lead(clause[1]), { text: clause[2], muted: true }];

  const words = text.split(/\s+/);
  if (words.length < 4) return [{ text, muted: false }];
  const cut = Math.ceil(words.length / 2);
  return [lead(words.slice(0, cut).join(" ")), { text: words.slice(cut).join(" "), muted: true }];
}

function lead(text: string): HeadingRun {
  return { text: `${text} `, muted: false };
}

function bracketRuns(heading: string): HeadingRun[] {
  const runs: HeadingRun[] = [];
  let last = 0;
  for (const match of heading.matchAll(/\[([^\]]+)\]/g)) {
    if (match.index > last) runs.push({ text: heading.slice(last, match.index), muted: false });
    runs.push({ text: match[1], muted: true });
    last = match.index + match[0].length;
  }
  if (last < heading.length) runs.push({ text: heading.slice(last), muted: false });
  return runs.filter((run) => run.text.trim());
}
