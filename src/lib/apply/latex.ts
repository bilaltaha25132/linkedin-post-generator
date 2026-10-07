// Reads a one-column LaTeX resume (Jake's Resume and its forks) into roles,
// bullets and skills with their exact positions in the source, and writes
// edits back only inside those positions. Everything else stays byte for byte.

export type SectionKind = "experience" | "project" | "education" | "skills" | "summary" | "other";

export interface Span {
  start: number;
  end: number;
}

export interface ParsedBullet extends Span {
  latex: string;
  plain: string;
}

export interface ParsedRole {
  section: "experience" | "project" | "education";
  employer: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  bullets: ParsedBullet[];
}

export interface ParsedSkillLine extends Span {
  category: string;
  items: string[];
}

export interface ParsedResume {
  name: string | null;
  email: string | null;
  roles: ParsedRole[];
  skills: ParsedSkillLine[];
  summary: (Span & { plain: string }) | null;
}

/** Reads the brace group that opens at `open`; handles nesting and escaped braces. */
export function readGroup(src: string, open: number): { content: string; start: number; end: number } | null {
  if (src[open] !== "{") return null;
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === "\\") {
      i++;
      continue;
    }
    if (c === "%") {
      const nl = src.indexOf("\n", i);
      if (nl === -1) return null;
      i = nl;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return { content: src.slice(open + 1, i), start: open + 1, end: i };
  }
  return null;
}

/** Reads `n` brace arguments after `from`, skipping whitespace and comments between them. */
function readArgs(src: string, from: number, n: number) {
  const args: { content: string; start: number; end: number }[] = [];
  let i = from;
  while (args.length < n) {
    while (i < src.length) {
      if (/\s/.test(src[i])) i++;
      else if (src[i] === "%") i = src.indexOf("\n", i) === -1 ? src.length : src.indexOf("\n", i) + 1;
      else break;
    }
    const g = readGroup(src, i);
    if (!g) return null;
    args.push(g);
    i = g.end + 1;
  }
  return { args, end: i };
}

const COMMAND_TEXT = /\\(?:textbf|textit|emph|underline|small|scshape|large|Large|LARGE|huge|Huge|normalsize|footnotesize|textsc|texttt|mbox)\b\s*/g;

/** LaTeX to readable text: formatting dropped, links reduced to their text, escapes undone. */
export function toPlain(latex: string): string {
  let s = latex.replace(/(^|[^\\])%.*$/gm, "$1");
  // \href{url}{text} -> text
  for (let guard = 0; guard < 50 && s.includes("\\href"); guard++) {
    const at = s.indexOf("\\href");
    const parsed = readArgs(s, at + 5, 2);
    if (!parsed) break;
    s = s.slice(0, at) + parsed.args[1].content + s.slice(parsed.end);
  }
  return s
    // Spacing and box arguments are measurements, not words.
    .replace(/\\(raisebox|hspace|vspace)\*?\{[^}]*\}/g, "")
    .replace(/\\ /g, " ")
    .replace(COMMAND_TEXT, "")
    .replace(/\$\|\$/g, "|")
    .replace(/\$([^$]*)\$/g, "$1")
    .replace(/\\\\/g, " ")
    .replace(/\\([&%$#_{}])/g, "$1")
    .replace(/\\textasciitilde\{?\}?/g, "~")
    .replace(/~/g, " ")
    .replace(/---?/g, "-")
    .replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])?/g, "")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Model text to LaTeX: specials escaped, **bold** to \textbf. Rejects raw backslashes. */
export function escapeLatex(text: string): string {
  if (text.includes("\\")) throw new Error("contains a backslash");
  return text
    .replace(/[&%$#_{}]/g, (c) => `\\${c}`)
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}")
    .replace(/\*\*(.+?)\*\*/g, "\\textbf{$1}");
}

const DATE = /\b(19|20)\d{2}\b|\bpresent\b|\bcurrent\b|\bnow\b/i;
const TITLE_WORDS =
  /\b(engineer|developer|intern|assistant|lead|manager|scientist|analyst|consultant|architect|researcher|founder|director|head|associate|specialist|fellow|teaching|programmer)\b/i;

function splitDates(text: string): { startDate: string | null; endDate: string | null } {
  const parts = text.split(/\s*(?:--|–|—|\s-\s|\bto\b)\s*/i).map((p) => p.trim()).filter(Boolean);
  return { startDate: parts[0] ?? null, endDate: parts[1] ?? null };
}

function sectionKind(title: string): SectionKind {
  const t = title.toLowerCase();
  if (/skill|technolog|stack|tools/.test(t)) return "skills";
  if (/project/.test(t)) return "project";
  if (/educat|academ/.test(t)) return "education";
  if (/experience|employment|work|career|positions/.test(t)) return "experience";
  if (/summary|profile|about|objective/.test(t)) return "summary";
  return "other";
}

/** Subheading arguments to a role, whichever order the template uses. */
function roleFromHeading(section: ParsedRole["section"], a: string[]): Omit<ParsedRole, "bullets"> {
  const [p, q, r, s] = a.map(toPlain);
  if (section === "education" || (s !== undefined && DATE.test(s) && !DATE.test(q))) {
    // {school}{location}{degree}{dates}, or {school}{dates}{degree}{location}
    const datesFirst = DATE.test(q ?? "") && !DATE.test(s ?? "");
    return {
      section,
      employer: p,
      title: r ?? "",
      location: (datesFirst ? s : q) || null,
      ...splitDates((datesFirst ? q : s) ?? ""),
    };
  }
  // {title}{dates}{employer}{location}, or {employer}{dates}{title}{location}
  const firstIsTitle = TITLE_WORDS.test(p) || !TITLE_WORDS.test(r ?? "");
  return {
    section,
    employer: firstIsTitle ? (r ?? "") : p,
    title: firstIsTitle ? p : (r ?? ""),
    location: s || null,
    ...splitDates(q ?? ""),
  };
}

export function parseResume(latex: string): ParsedResume {
  const bodyAt = latex.indexOf("\\begin{document}");
  const from = bodyAt === -1 ? 0 : bodyAt;

  const nameMatch = /\\(?:Huge|huge|LARGE)\s*(?:\\scshape\s*)?([^}\\]+)/.exec(latex.slice(from));
  const emailMatch = /mailto:([^}\s]+)/.exec(latex);

  // Section boundaries.
  const sections: { kind: SectionKind; start: number; end: number }[] = [];
  const sectionRe = /\\section\*?\s*\{/g;
  sectionRe.lastIndex = from;
  for (let m = sectionRe.exec(latex); m; m = sectionRe.exec(latex)) {
    const g = readGroup(latex, m.index + m[0].length - 1);
    if (!g) continue;
    if (sections.length) sections[sections.length - 1].end = m.index;
    sections.push({ kind: sectionKind(toPlain(g.content)), start: g.end + 1, end: latex.length });
  }
  const docEnd = latex.indexOf("\\end{document}");
  if (sections.length && docEnd !== -1) sections[sections.length - 1].end = docEnd;

  const roles: ParsedRole[] = [];
  const skills: ParsedSkillLine[] = [];
  let summary: ParsedResume["summary"] = null;

  for (const sec of sections) {
    const body = latex.slice(sec.start, sec.end);
    if (sec.kind === "skills") {
      skills.push(...parseSkills(latex, sec.start, sec.end));
      continue;
    }
    if (sec.kind === "summary") {
      summary = parseSummary(latex, sec.start, sec.end);
      continue;
    }
    if (sec.kind === "other") continue;

    const kind = sec.kind;
    // Headings and bullets in source order.
    const tokens = /\\(resumeSubheading|resumeSubSubheading|resumeProjectHeading|resumeItem|item)\b(?![a-zA-Z])/g;
    let current: ParsedRole | null = null;
    for (let m = tokens.exec(body); m; m = tokens.exec(body)) {
      const at = sec.start + m.index + m[0].length;
      const cmd = m[1];
      if (cmd === "resumeSubheading") {
        const parsed = readArgs(latex, at, 4);
        if (!parsed) continue;
        current = { ...roleFromHeading(kind, parsed.args.map((g) => g.content)), bullets: [] };
        roles.push(current);
        tokens.lastIndex = parsed.end - sec.start;
      } else if (cmd === "resumeSubSubheading") {
        const parsed = readArgs(latex, at, 2);
        if (!parsed) continue;
        const prev = current as ParsedRole | null;
        current = {
          section: kind,
          employer: prev?.employer ?? "",
          title: toPlain(parsed.args[0].content),
          location: prev?.location ?? null,
          ...splitDates(toPlain(parsed.args[1].content)),
          bullets: [],
        };
        roles.push(current);
        tokens.lastIndex = parsed.end - sec.start;
      } else if (cmd === "resumeProjectHeading") {
        const parsed = readArgs(latex, at, 2);
        if (!parsed) continue;
        const [name, stack] = toPlain(parsed.args[0].content).split(/\s*\|\s*/);
        current = {
          section: kind === "experience" ? "project" : kind,
          employer: name ?? "",
          title: stack ?? "",
          location: null,
          ...splitDates(toPlain(parsed.args[1].content)),
          bullets: [],
        };
        roles.push(current);
        tokens.lastIndex = parsed.end - sec.start;
      } else if (current) {
        const span = cmd === "resumeItem" ? readArgs(latex, at, 1)?.args[0] : itemSpan(latex, at, sec.end);
        if (!span) continue;
        const plain = toPlain(span.content);
        if (plain) current.bullets.push({ latex: span.content, plain, start: span.start, end: span.end });
        tokens.lastIndex = span.end - sec.start;
      }
    }
  }

  return {
    name: nameMatch ? toPlain(nameMatch[1]) || null : null,
    email: emailMatch ? emailMatch[1] : null,
    roles,
    skills,
    summary,
  };
}

/** A bare `\item`'s text runs to the next \item, \end or heading. */
function itemSpan(src: string, from: number, limit: number) {
  const rest = src.slice(from, limit);
  const stop = rest.search(/\\item\b|\\end\{|\\resume[A-Z]/);
  const raw = stop === -1 ? rest : rest.slice(0, stop);
  const lead = raw.length - raw.trimStart().length;
  const content = raw.trim();
  if (!content) return null;
  return { content, start: from + lead, end: from + lead + content.length };
}

/** `\textbf{Languages}{: Python, SQL} \\` and `\textbf{Languages:} Python, SQL \\`. */
function parseSkills(src: string, start: number, end: number): ParsedSkillLine[] {
  const out: ParsedSkillLine[] = [];
  const re = /\\textbf\s*\{/g;
  re.lastIndex = start;
  for (let m = re.exec(src); m && m.index < end; m = re.exec(src)) {
    const cat = readGroup(src, m.index + m[0].length - 1);
    if (!cat) continue;
    let i = cat.end + 1;
    while (src[i] === " ") i++;
    let span: Span;
    if (src[i] === "{") {
      const g = readGroup(src, i);
      if (!g) continue;
      span = { start: g.start, end: g.end };
    } else {
      const rest = src.slice(i, end);
      const stop = rest.search(/\\\\|\n|\}|\\item/);
      span = { start: i, end: i + (stop === -1 ? rest.length : stop) };
    }
    // Leading ": " stays outside the span, so a rewrite keeps the punctuation.
    const text = src.slice(span.start, span.end);
    const lead = text.match(/^\s*:?\s*/)?.[0].length ?? 0;
    const trail = text.length - text.trimEnd().length;
    span = { start: span.start + lead, end: span.end - trail };
    const items = splitItems(src.slice(span.start, span.end));
    if (items.length) out.push({ category: toPlain(cat.content).replace(/:$/, ""), items, ...span });
    re.lastIndex = span.end;
  }
  return out;
}

/** Comma-separated items; commas inside parentheses stay with their item. */
export function splitItems(latex: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let cur = "";
  for (const c of latex) {
    if (c === "(" || c === "{") depth++;
    if (c === ")" || c === "}") depth--;
    if (c === "," && depth === 0) {
      items.push(cur);
      cur = "";
    } else cur += c;
  }
  items.push(cur);
  return items.map((i) => i.trim()).filter(Boolean);
}

/** The summary's text, when it's plain enough to replace safely. */
function parseSummary(src: string, start: number, end: number): ParsedResume["summary"] {
  const body = src.slice(start, end);
  const item = /\\item\b/.exec(body);
  const from = item ? start + item.index + item[0].length : start;
  const rest = src.slice(from, end);
  const stop = rest.search(/\\end\{|\\item\b|\\vspace/);
  const raw = stop === -1 ? rest : rest.slice(0, stop);
  if (/\\begin\{/.test(raw)) return null;
  const lead = raw.length - raw.trimStart().length;
  const content = raw.trim().replace(/^\\small\s*\{/, "");
  const plain = toPlain(content);
  if (!plain) return null;
  const s = from + lead + (raw.trim().length - content.length);
  // Only the text inside an optional \small{...} wrapper.
  const inner = raw.trim().startsWith("\\small") ? readGroup(src, src.indexOf("{", from + lead)) : null;
  if (inner) return { start: inner.start, end: inner.end, plain: toPlain(inner.content) };
  return { start: s, end: s + content.length, plain };
}

/** Applies span replacements, latest first, so earlier offsets stay valid. */
export function applySpans(latex: string, edits: (Span & { text: string })[]): string {
  const sorted = [...edits].sort((a, b) => b.start - a.start);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].end > sorted[i - 1].start) throw new Error("Overlapping edits");
  }
  let out = latex;
  for (const e of sorted) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return out;
}

/** The whole `\resumeItem{...}` (or `\item ...`) command around a bullet's argument span. */
export function commandSpan(latex: string, bullet: Span): Span {
  const before = latex.slice(Math.max(0, bullet.start - 40), bullet.start);
  const at = Math.max(before.lastIndexOf("\\resumeItem"), before.lastIndexOf("\\item"));
  const start = at === -1 ? bullet.start : bullet.start - before.length + at;
  const close = latex[bullet.end] === "}" ? bullet.end + 1 : bullet.end;
  let end = close;
  while (latex[end] === " " || latex[end] === "\t") end++;
  if (latex[end] === "\n") end++;
  // Take the line's indentation with it.
  let lineStart = start;
  while (lineStart > 0 && (latex[lineStart - 1] === " " || latex[lineStart - 1] === "\t")) lineStart--;
  return { start: latex[lineStart - 1] === "\n" || lineStart === 0 ? lineStart : start, end };
}

/** Numbers, percentages, money and multipliers as written ("40%", "$1.2M", "300+", "3x"). */
export function extractNumbers(text: string): string[] {
  const found = text.match(/[$€£]?\d+(?:[.,]\d+)*\s?(?:%|\+|x\b|k\b|K\b|M\b|B\b)?/g) ?? [];
  return [...new Set(found.map(normNumber))];
}

export function normNumber(n: string): string {
  return n.replace(/\s/g, "").replace(/,/g, "").toLowerCase();
}

/** Preamble guard so the same source compiles under XeTeX (Tectonic) and pdfLaTeX. */
export function xetexSafe(latex: string): string {
  if (!/\\input\{glyphtounicode\}/.test(latex) || /\\ifPDFTeX/.test(latex)) return latex;
  return latex
    .replace(/\\input\{glyphtounicode\}\s*/, "")
    .replace(/\\pdfgentounicode\s*=\s*1\s*/, "")
    .replace(/\\begin\{document\}/, "\\usepackage{iftex}\\ifPDFTeX\\input{glyphtounicode}\\pdfgentounicode=1\\fi\n\\begin{document}");
}
