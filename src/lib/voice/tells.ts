/**
 * Patterns that mark a post as machine-written. Found in the drafts themselves
 * (2026-10): summary lines, colon labels, stacked fragments, aphorism closers,
 * the "it wasn't X, it was Y" turn. The prompt bans them too, but models slip,
 * so the humanize pass is told exactly which ones this draft contains.
 */
const PHRASES: [RegExp, string][] = [
  [/\bhere'?s the (thing|part|kicker|catch|twist|problem|deal|takeaway)\b/i, `"Here's the thing/part…" setup`],
  [/\bthat'?s the (whole|real|shape|point|part|story|catch|problem|lesson|trick|difference)\b/i, `"That's the whole/real…" summary line`],
  [/^(the )?(fix|lesson|takeaway|reframe|point|catch|twist|kicker|result|verdict|punchline|upshot|kicker|real story|bottom line)\s*:/im, "a label followed by a colon (\"The fix:\")"],
  [/\b(sharper|real|bigger|actual|uncomfortable|quiet) (reframe|lesson|question|story|truth|point|takeaway)\b/i, `"the real lesson / uncomfortable truth" framing`],
  [/\b(isn'?t|wasn'?t|is not|was not|aren'?t|weren'?t)\b[^.!?\n]{1,70}[.,;]\s*(it'?s|it was|it is|they'?re|they were)\b/i, `"it isn't X, it's Y" antithesis`],
  [/\bnot (just |only )?(a |an |about )?[^.!?\n]{1,40}\.\s+(it'?s|it is|it was)\b/i, `"Not X. It's Y." antithesis`],
  [/\b(let that sink in|read that again|full stop|make no mistake|spoiler|hot take|unpopular opinion|plot twist|buckle up)\b/i, "a stock LinkedIn phrase"],
  [/\b(game[- ]?changer|delve|tapestry|testament to|in today'?s|landscape|leverag\w*|seamless\w*|robust|unlock\w*|navigat\w* the|paradigm)\b/i, "an AI-favourite word"],
  [/\b(should stop you|are blunt|is blunt|numbers are (brutal|stark))\b/i, "dramatic signposting (\"the numbers are blunt\")"],
  // Word-level markers over-represented in LLM text (iScience 2026, SAGE analysis).
  [/\bnot only\b[^.!?\n]*\bbut also\b|\b(furthermore|moreover|regarding|to ensure|the importance of|is fundamental|in conclusion)\b/i, "formal connectives LLMs overuse (furthermore, not only… but also, to ensure)"],
  [/\b(clearly|undoubtedly|without a doubt|definitely|certainly|undeniably)\b/i, "certainty stacking (clearly, undoubtedly, definitely)"],
  [/\b(remarkabl[ey]|incredibl[ey]|crucial|pivotal|powerful|groundbreaking|transformative)\b/i, "empty intensifiers (remarkable, crucial, powerful)"],
  [/\bwhat'?s your\b[^?\n]*\?\s*$/im, `the stock "What's your…?" closing question`],
];

/** What in this post reads as generated, in plain words for the editor. */
export function aiTells(post: string): string[] {
  const found = PHRASES.filter(([re]) => re.test(post)).map(([, label]) => label);

  const paragraphs = post
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith("#"));
  const sentencesOf = (p: string) => p.split(/(?<=[.!?])\s+/).filter(Boolean);

  const fragmentRun = paragraphs.some((p) => {
    let run = 0;
    for (const s of sentencesOf(p)) {
      run = s.split(/\s+/).length <= 4 ? run + 1 : 0;
      if (run >= 3) return true;
    }
    return false;
  });
  if (fragmentRun) found.push("three or more clipped fragments in a row");

  const single = paragraphs.filter((p) => sentencesOf(p).length === 1).length;
  if (paragraphs.length >= 6 && single / paragraphs.length > 0.6) {
    found.push("nearly every paragraph is a single sentence");
  }

  // Human writing varies sentence length far more than LLM output does.
  const lengths = paragraphs.flatMap(sentencesOf).map((s) => s.split(/\s+/).length);
  if (lengths.length >= 8) {
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const sd = Math.sqrt(lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / lengths.length);
    if (sd / mean < 0.4) found.push("sentences are all about the same length");
  }

  // Two short sentences ending a post, both under ~8 words: the aphorism closer.
  const last = paragraphs.at(-1);
  if (last) {
    const s = sentencesOf(last);
    if (s.length === 2 && s.every((x) => x.split(/\s+/).length <= 8) && !last.endsWith("?")) {
      found.push("a two-line aphorism as the ending");
    }
  }

  return found;
}
