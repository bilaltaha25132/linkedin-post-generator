// Draws a Jake's Resume style .tex as HTML that looks like the compiled page,
// for the resume editor. Every piece of text he can edit is a Unit: a source
// span plus its HTML. Markup the editor can't map back (icons, spacing, math)
// becomes an atom that carries its raw LaTeX, so writing a Unit back
// (src/components/resume-editor.tsx) reproduces it byte for byte.

import { readGroup } from "@/lib/apply/latex";

export interface Unit {
  start: number;
  end: number;
  html: string;
}

export type Block =
  | { kind: "heading"; unit: Unit }
  | { kind: "section"; unit: Unit }
  | { kind: "sub"; args: [Unit, Unit, Unit, Unit] }
  | { kind: "subsub"; args: [Unit, Unit] }
  | { kind: "project"; args: [Unit, Unit] }
  | { kind: "item"; unit: Unit }
  | { kind: "text"; unit: Unit };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function atom(raw: string, display = "", cls = "") {
  return `<span class="tex-atom${cls ? ` ${cls}` : ""}" contenteditable="false" data-raw="${esc(raw)}">${display}</span>`;
}

function wrap(tag: string, pre: string, post: string, inner: string, cls = "") {
  return `<${tag}${cls ? ` class="${cls}"` : ""} data-pre="${esc(pre)}" data-post="${esc(post)}">${inner}</${tag}>`;
}

const svg = (body: string) =>
  `<svg viewBox="0 0 24 24" width="0.9em" height="0.9em" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const ICONS: Record<string, string> = {
  faPhone: svg(
    '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  ),
  faEnvelope: svg('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>'),
  faGlobe: svg('<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>'),
  faLinkedin: svg(
    '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
  ),
  faGithub: svg(
    '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/>',
  ),
  faLink: svg(
    '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  ),
};

const FORMAT: Record<string, [tag: string, cls?: string]> = {
  textbf: ["b"],
  textit: ["i"],
  emph: ["i"],
  underline: ["u"],
  textsc: ["span", "tex-sc"],
  texttt: ["span", "tex-tt"],
  mbox: ["span"],
};

// Declarations that change the rest of their group.
const SWITCH: Record<string, string> = {
  tiny: "tex-tiny",
  scriptsize: "tex-scriptsize",
  footnotesize: "tex-footnotesize",
  small: "tex-small",
  normalsize: "tex-normalsize",
  large: "tex-large",
  Large: "tex-Large",
  LARGE: "tex-LARGE",
  huge: "tex-huge",
  Huge: "tex-Huge",
  scshape: "tex-sc",
  bfseries: "tex-bf",
  itshape: "tex-it",
};

const SYMBOL: Record<string, string> = {
  textasciitilde: "~",
  textasciicircum: "^",
  textbackslash: "\\",
  ldots: "…",
  dots: "…",
  textbullet: "•",
  LaTeX: "LaTeX",
  TeX: "TeX",
  textbar: "|",
};

const MATH: [RegExp, string][] = [
  [/\\sim/g, "~"],
  [/\\approx/g, "≈"],
  [/\\times/g, "×"],
  [/\\cdot/g, "·"],
  [/\\bullet/g, "•"],
  [/\\leq?/g, "≤"],
  [/\\geq?/g, "≥"],
  [/\\rightarrow|\\to/g, "→"],
  [/\\%/g, "%"],
  [/\\[a-zA-Z]+/g, ""],
  [/[{}^_]/g, ""],
];

/** Skips one optional [..] argument; returns where reading continues. */
function optional(src: string, i: number): number {
  if (src[i] !== "[") return i;
  const close = src.indexOf("]", i);
  return close === -1 ? i : close + 1;
}

/** HTML for src[start, end). */
export function inline(src: string, start: number, end: number): string {
  let out = "";
  let text = "";
  const flush = () => {
    out += esc(text);
    text = "";
  };
  for (let i = start; i < end; ) {
    const c = src[i];
    if (c === "%") {
      const nl = src.indexOf("\n", i);
      const stop = nl === -1 || nl > end ? end : nl;
      flush();
      out += atom(src.slice(i, stop));
      i = stop;
    } else if (c === "{") {
      const g = readGroup(src, i);
      if (!g || g.end >= end) {
        text += c;
        i++;
        continue;
      }
      flush();
      out += wrap("span", "{", "}", inline(src, g.start, g.end));
      i = g.end + 1;
    } else if (c === "$") {
      let close = i + 1;
      while (close < end && (src[close] !== "$" || src[close - 1] === "\\")) close++;
      const raw = src.slice(i, Math.min(close + 1, end));
      let shown = raw.slice(1, -1);
      for (const [re, to] of MATH) shown = shown.replace(re, to);
      flush();
      out += atom(raw, esc(shown.trim()));
      i += raw.length;
    } else if (c === "~") {
      text += " ";
      i++;
    } else if (c === "-" && src[i + 1] === "-") {
      const raw = src[i + 2] === "-" ? "---" : "--";
      flush();
      out += atom(raw, raw === "---" ? "—" : "–");
      i += raw.length;
    } else if (c === "\\") {
      const next = src[i + 1] ?? "";
      if (next === "\\") {
        // A line break, with its optional [space] argument.
        const stop = optional(src, i + 2);
        flush();
        out += `<br data-raw="${esc(src.slice(i, stop))}">`;
        i = stop;
        continue;
      }
      if (!/[a-zA-Z]/.test(next)) {
        if ("&%$#_{}".includes(next)) text += next;
        else {
          flush();
          out += atom(src.slice(i, i + 2), next === " " ? " " : next === "," ? "\u2009" : "");
        }
        i += 2;
        continue;
      }
      const name = /^[a-zA-Z]+\*?/.exec(src.slice(i + 1, i + 40))![0];
      let j = i + 1 + name.length;
      flush();
      if (FORMAT[name] || name === "href") {
        let k = j;
        while (src[k] === " ") k++;
        const first = readGroup(src, k);
        if (!first || first.end >= end) {
          out += atom(src.slice(i, j));
          i = j;
          continue;
        }
        if (name === "href") {
          let m = first.end + 1;
          while (src[m] === " ") m++;
          const label = readGroup(src, m);
          if (!label || label.end >= end) {
            out += atom(src.slice(i, first.end + 1));
            i = first.end + 1;
            continue;
          }
          out += wrap("a", src.slice(i, label.start), "}", inline(src, label.start, label.end));
          i = label.end + 1;
        } else {
          const [tag, cls] = FORMAT[name];
          out += wrap(tag, src.slice(i, first.start), "}", inline(src, first.start, first.end), cls);
          i = first.end + 1;
        }
      } else if (SWITCH[name]) {
        // Takes effect up to the end of the enclosing group.
        while (src[j] === " " || src[j] === "\n" || src[j] === "\r" || src[j] === "\t") j++;
        out += atom(src.slice(i, j));
        out += `<span class="${SWITCH[name]}">${inline(src, j, end)}</span>`;
        return out;
      } else if (/^[vh]space\*?$/.test(name) || name === "raisebox") {
        const g = readGroup(src, j);
        const stop = g && g.end < end ? g.end + 1 : j;
        out += atom(src.slice(i, stop), name.startsWith("h") ? " " : "");
        i = stop;
      } else if (name === "begin" || name === "end") {
        const g = readGroup(src, j);
        const stop = g && g.end < end ? optional(src, g.end + 1) : j;
        out += atom(src.slice(i, stop));
        i = stop;
      } else if (name.startsWith("fa")) {
        out += atom(src.slice(i, j), ICONS[name] ?? "•", "tex-icon");
        i = j;
      } else if (SYMBOL[name] !== undefined) {
        const stop = src.startsWith("{}", j) ? j + 2 : j;
        out += atom(src.slice(i, stop), esc(SYMBOL[name]));
        i = stop;
      } else {
        // \item, \centering and anything unknown: no text of its own.
        out += atom(src.slice(i, j));
        i = j;
      }
    } else {
      text += c;
      i++;
    }
  }
  flush();
  return out;
}

function unit(src: string, start: number, end: number): Unit {
  return { start, end, html: inline(src, start, end) };
}

/** Reads `n` brace groups after `from`, skipping whitespace and comments. */
function args(src: string, from: number, n: number) {
  const out: { start: number; end: number }[] = [];
  let i = from;
  while (out.length < n) {
    while (i < src.length && (/\s/.test(src[i]) || src[i] === "%")) {
      if (src[i] === "%") {
        const nl = src.indexOf("\n", i);
        i = nl === -1 ? src.length : nl;
      } else i++;
    }
    const g = readGroup(src, i);
    if (!g) return null;
    out.push(g);
    i = g.end + 1;
  }
  return { args: out, end: i };
}

const TOKEN =
  /\\begin\{center\}|\\section\*?\s*\{|\\(resumeSubheading|resumeSubSubheading|resumeProjectHeading|resumeItem|resumeSubItem)(?![a-zA-Z])/g;

/** The page as blocks, in source order. */
export function previewBlocks(latex: string): Block[] {
  const begin = latex.indexOf("\\begin{document}");
  const docEnd = latex.indexOf("\\end{document}");
  const from = begin === -1 ? 0 : begin + "\\begin{document}".length;
  const to = docEnd === -1 ? latex.length : docEnd;
  const blocks: Block[] = [];

  TOKEN.lastIndex = from;
  for (let m = TOKEN.exec(latex); m && m.index < to; m = TOKEN.exec(latex)) {
    const at = m.index + m[0].length;
    if (m[0] === "\\begin{center}") {
      const close = latex.indexOf("\\end{center}", at);
      if (close === -1 || close > to) continue;
      blocks.push({ kind: "heading", unit: unit(latex, at, close) });
      TOKEN.lastIndex = close;
    } else if (m[0].startsWith("\\section")) {
      const title = readGroup(latex, at - 1);
      if (!title) continue;
      blocks.push({ kind: "section", unit: unit(latex, title.start, title.end) });
      // A section without resume commands (skills, summary) is shown as one block of text.
      const next = latex.slice(title.end + 1, to).search(/\\section\*?\s*\{/);
      const bodyEnd = next === -1 ? to : title.end + 1 + next;
      const body = latex.slice(title.end + 1, bodyEnd);
      if (!/\\resume(Subheading|SubSubheading|ProjectHeading|Item|SubItem)\b/.test(body)) {
        const lead = body.length - body.trimStart().length;
        const trimmed = body.trim();
        if (trimmed) blocks.push({ kind: "text", unit: unit(latex, title.end + 1 + lead, title.end + 1 + lead + trimmed.length) });
        TOKEN.lastIndex = bodyEnd;
      } else TOKEN.lastIndex = title.end + 1;
    } else {
      const cmd = m[1];
      const n = cmd === "resumeSubheading" ? 4 : cmd === "resumeSubSubheading" || cmd === "resumeProjectHeading" ? 2 : 1;
      const read = args(latex, at, n);
      if (!read) continue;
      const units = read.args.map((g) => unit(latex, g.start, g.end));
      if (cmd === "resumeSubheading") blocks.push({ kind: "sub", args: units as [Unit, Unit, Unit, Unit] });
      else if (cmd === "resumeSubSubheading") blocks.push({ kind: "subsub", args: units as [Unit, Unit] });
      else if (cmd === "resumeProjectHeading") blocks.push({ kind: "project", args: units as [Unit, Unit] });
      else blocks.push({ kind: "item", unit: units[0] });
      TOKEN.lastIndex = read.end;
    }
  }
  return blocks;
}

/** The parts of a DOM node the writer reads, so it runs on the page's DOM or a test's. */
export interface TexNode {
  nodeType: number;
  nodeName: string;
  nodeValue: string | null;
  childNodes: ArrayLike<TexNode>;
  getAttribute?(name: string): string | null;
}

const TYPED: Record<string, [string, string]> = {
  B: ["\\textbf{", "}"],
  STRONG: ["\\textbf{", "}"],
  I: ["\\textit{", "}"],
  EM: ["\\textit{", "}"],
  U: ["\\underline{", "}"],
};

/** Text he typed, as LaTeX. */
export function escapeTyped(text: string): string {
  return text
    .replace(/\\/g, "\u0000")
    .replace(/[&%$#_{}]/g, (c) => `\\${c}`)
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}")
    .replace(/\u0000/g, "\\textbackslash{}")
    .replace(/\u00a0/g, "~");
}

/** A Unit's edited DOM back to LaTeX. Atoms and wrappers give back the source they came from. */
export function toLatex(node: TexNode): string {
  if (node.nodeType === 3) return escapeTyped(node.nodeValue ?? "");
  if (node.nodeType !== 1) return "";
  const raw = node.getAttribute?.("data-raw");
  if (raw != null) return raw;
  if (node.nodeName === "BR") return "\\\\";
  // A control word swallows the letters typed straight after it, so keep them apart.
  const inner = Array.from(node.childNodes, toLatex).reduce(
    (acc, part) => acc + (/\\[a-zA-Z]+$/.test(acc) && /^[a-zA-Z]/.test(part) ? " " : "") + part,
    "",
  );
  const pre = node.getAttribute?.("data-pre");
  if (pre != null) return pre + inner + (node.getAttribute?.("data-post") ?? "");
  const typed = TYPED[node.nodeName];
  return typed ? typed[0] + inner + typed[1] : inner;
}
