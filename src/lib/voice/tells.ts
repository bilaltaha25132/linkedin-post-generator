/**
 * Patterns that mark a post as machine-written. Found in the drafts themselves
 * (2026-10): summary lines, colon labels, stacked fragments, aphorism closers,
 * the "it wasn't X, it was Y" turn. The prompts ban them too, but models slip,
 * so the humanize edit is told exactly which ones this draft contains.
 */
const PHRASES: [RegExp, string][] = [
  [/\bhere'?s the (thing|part|kicker|catch|twist|problem|deal|takeaway)\b/i, `"Here's the thing/part…" setup`],
  [/\bthat'?s the (whole|real|shape|point|part|story|catch|problem|lesson|trick|difference)\b/i, `"That's the whole/real…" summary line`],
  [/^(the )?(fix|lesson|takeaway|reframe|point|catch|twist|kicker|result|verdict|punchline|upshot|kicker|real story|bottom line)\s*:/im, "a label followed by a colon (\"The fix:\")"],
  [/\b(sharper|real|bigger|actual|uncomfortable|quiet) (reframe|lesson|question|story|truth|point|takeaway|thing|work|debate|engineering|problem|issue|innovation|difference)\b/i, `"the real lesson / uncomfortable truth" framing`],
  [/\b(isn'?t|wasn'?t|is not|was not|aren'?t|weren'?t)\b[^.!?\n]{1,70}[.,;]\s*(it'?s|it was|it is|they'?re|they were|that'?s|that is|that was)\b/i, `"it isn't X, it's Y" antithesis`],
  [/\b(doesn'?t|don'?t|didn'?t) (come|start|end|live) (from|with|in)\b[^.!?\n]{1,60},\s*it (comes|came|starts|started|ends|ended|lives|lived)\b/i, `"doesn't come from X, it comes from Y" antithesis`],
  [/\bnot (just |only )?(a |an |about )?[^.!?\n]{1,40}\.\s+(it'?s|it is|it was|that'?s|that is)\b/i, `"Not X. It's Y." antithesis`],
  [/\b(\w+) (wasn'?t|isn'?t|was not|is not) the (\w+)\.\s+the \3 (was|is)\b/i, `"X wasn't the bottleneck. The bottleneck was Y." turn`],
  // Reflective pivots the drafts kept reaching for once the older tells were banned.
  [/\b(i keep (coming back to|chewing on|thinking about|returning to|poking at|replaying)|the (part|bit|thing|question) i keep|worth sitting with|sit with that|what (bothers|strikes|interests|gets) me|my read is|the interesting (part|bit|thing|number|question)( here)? (is|isn'?t|in))\b/i, `a stock reflective pivot ("the part I keep coming back to", "worth sitting with")`],
  // Wikipedia's "signs of AI writing": participle tails and copula avoidance.
  [/,\s+(highlighting|underscoring|showcasing|emphasizing|emphasising|reflecting|signaling|signalling|cementing|solidifying)\b/i, `a ", highlighting/underscoring…" tail`],
  [/\b(serves|stands|acts) as (a|an|the)\b|\bboasts\b/i, `"serves as / stands as" instead of "is"`],
  [/\b(let that sink in|read that again|full stop|make no mistake|spoiler|hot take|unpopular opinion|plot twist|buckle up)\b/i, "a stock LinkedIn phrase"],
  [/\b(game[- ]?changer|delve|tapestry|testament to|in today'?s|landscape|leverag\w*|seamless\w*|robust|unlock\w*|navigat\w* the|paradigm)\b/i, "an AI-favourite word"],
  [/\b(should stop you|are blunt|is blunt|numbers are (brutal|stark))\b/i, "dramatic signposting (\"the numbers are blunt\")"],
  // Word-level markers over-represented in LLM text (iScience 2026, SAGE analysis).
  [/\bnot only\b[^.!?\n]*\bbut also\b|\b(furthermore|moreover|regarding|to ensure|the importance of|is fundamental|in conclusion)\b/i, "formal connectives LLMs overuse (furthermore, not only… but also, to ensure)"],
  [/\b(clearly|undoubtedly|without a doubt|definitely|certainly|undeniably)\b/i, "certainty stacking (clearly, undoubtedly, definitely)"],
  [/\b(remarkabl[ey]|incredibl[ey]|crucial|pivotal|powerful|groundbreaking|transformative)\b/i, "empty intensifiers (remarkable, crucial, powerful)"],
  [/\bwhat'?s your\b[^?\n]*\?\s*$/im, `the stock "What's your…?" closing question`],
  // The writer doesn't know his history, so these are invented.
  [/\b(in my experience|i'?ve always|every time i|when i (built|shipped|worked on))\b/i, "a claim about his own past work: state the opinion without it"],
];

/** The sentence(s) a match spans, so the editor knows exactly what to rewrite. */
function sentencesAround(post: string, from: number, to: number): string {
  const start = Math.max(0, ...[". ", "? ", "! ", "\n"].map((e) => post.lastIndexOf(e, from - 1) + e.length));
  const ends = [". ", "? ", "! ", "\n"].map((e) => post.indexOf(e, to - 1)).filter((i) => i >= 0);
  const end = ends.length ? Math.min(...ends) + 1 : post.length;
  return post.slice(start, end).trim();
}

/** What in this post reads as generated, in plain words for the editor. */
export function aiTells(post: string): string[] {
  const found = PHRASES.flatMap(([re, label]) => {
    const m = re.exec(post);
    return m ? [`${label}: "${sentencesAround(post, m.index, m.index + m[0].length)}"`] : [];
  });

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

  // "I have not tested it. He is honest that it is..." People contract when they talk.
  const spelledOut = post.match(/\b(i have not|i would|it is|that is|he is|she is|they are|do not|does not|is not|are not|was not|cannot|i am|we are|there is)\b/gi) ?? [];
  const contracted = post.match(/\b\w+'(s|t|re|ve|ll|d|m)\b/gi) ?? [];
  if (spelledOut.length >= 4 && spelledOut.length > contracted.length) {
    found.push(`stiff, uncontracted phrasing ("${spelledOut.slice(0, 3).join('", "')}"): contract them the way people talk`);
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
