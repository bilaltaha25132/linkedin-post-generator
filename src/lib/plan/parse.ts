import { strFromU8, unzipSync } from "fflate";

// Reads LinkedIn's own exports in the browser: the creator analytics workbook,
// the single-post analytics workbook, and Shares.csv from the data archive.
// Labels are matched loosely; LinkedIn renames columns between exports.

export type Cell = string | number | null;

export interface DailyRow {
  day: string;
  impressions: number | null;
  engagements: number | null;
}

export interface TopPost {
  url: string;
  publishedAt: string | null;
  impressions: number | null;
  engagements: number | null;
}

export interface Demographic {
  kind: string;
  label: string;
  share: number;
}

export interface AccountExport {
  kind: "account";
  impressions: number | null;
  reached: number | null;
  daily: DailyRow[];
  followers: { total: number | null; daily: { day: string; newFollowers: number }[] };
  topPosts: TopPost[];
  demographics: Demographic[];
}

export interface PostExport {
  kind: "post";
  url: string;
  publishedAt: string | null;
  impressions: number | null;
  reached: number | null;
  reactions: number | null;
  comments: number | null;
  reposts: number | null;
  saves: number | null;
  sends: number | null;
  profileViews: number | null;
  followersGained: number | null;
  demographics: Demographic[];
}

export interface Share {
  date: string;
  url: string;
  text: string;
  sharedUrl: string | null;
  mediaUrl: string | null;
}

export function parseAnalyticsWorkbook(bytes: Uint8Array): AccountExport | PostExport {
  const sheets = readWorkbook(bytes);
  const named = (re: RegExp) => [...sheets.entries()].find(([name]) => re.test(name))?.[1] ?? null;

  const topPosts = named(/top posts/i);
  const engagement = named(/^engagement/i);
  if (topPosts || engagement) {
    const discovery = named(/discovery/i) ?? [];
    const followers = named(/followers/i) ?? [];
    return {
      kind: "account",
      impressions: valueAfter(discovery, /^impressions$/i),
      reached: valueAfter(discovery, /members reached/i),
      daily: engagement ? dailyRows(engagement) : [],
      followers: {
        total: valueAfter(followers, /total followers/i),
        daily: followerRows(followers),
      },
      topPosts: topPosts ? topPostRows(topPosts) : [],
      demographics: demographicRows(named(/demographic/i) ?? []),
    };
  }

  // A single post's export: label and value pairs, wherever they sit.
  const all = [...sheets.values()].flat();
  const url = String(textAfter(all, /^post url$/i) ?? "");
  if (!/linkedin\.com/.test(url)) {
    throw new Error("This doesn't look like a LinkedIn analytics export. Use Analytics → Export on LinkedIn.");
  }
  return {
    kind: "post",
    url,
    publishedAt: toDay(textAfter(all, /^post (publish )?date$/i)),
    impressions: valueAfter(all, /^impressions$/i),
    reached: valueAfter(all, /^members reached$/i),
    reactions: valueAfter(all, /^reactions$/i),
    comments: valueAfter(all, /^comments$/i),
    reposts: valueAfter(all, /^reposts$/i),
    saves: valueAfter(all, /^saves$/i),
    sends: valueAfter(all, /^sends( on linkedin)?$/i),
    profileViews: valueAfter(all, /profile view(er)?s from this post/i),
    followersGained: valueAfter(all, /followers gained from this post/i),
    demographics: demographicRows(named(/demographic/i) ?? []),
  };
}

/** Shares.csv from "Get a copy of your data". Only that file is unpacked. */
export function parseArchive(bytes: Uint8Array): Share[] {
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  let csv: string;
  if (isZip) {
    const files = unzipSync(bytes, { filter: (f) => /(^|\/)shares\.csv$/i.test(f.name) });
    const entry = Object.values(files)[0];
    if (!entry) throw new Error("No Shares.csv in that archive. Request the archive with Posts (or Complete) selected.");
    csv = strFromU8(entry);
  } else {
    csv = strFromU8(bytes);
  }
  const rows = parseCsv(csv.replace(/^﻿/, ""));
  const header = rows[0]?.map((h) => h.trim().toLowerCase()) ?? [];
  const col = (name: string) => header.indexOf(name);
  const [iDate, iLink, iText, iShared, iMedia] = ["date", "sharelink", "sharecommentary", "sharedurl", "mediaurl"].map(col);
  if (iDate < 0 || iLink < 0) throw new Error("Shares.csv is missing its Date or ShareLink column.");
  const out: Share[] = [];
  for (const r of rows.slice(1)) {
    const link = r[iLink]?.trim();
    const at = Date.parse(`${(r[iDate] ?? "").trim().replace(" ", "T")}Z`);
    if (!link || Number.isNaN(at)) continue;
    let url = link;
    try {
      url = decodeURIComponent(link);
    } catch {}
    out.push({
      date: new Date(at).toISOString(),
      url,
      text: (iText >= 0 ? (r[iText] ?? "") : "").trim(),
      sharedUrl: iShared >= 0 && r[iShared]?.trim() ? r[iShared].trim() : null,
      mediaUrl: iMedia >= 0 && r[iMedia]?.trim() ? r[iMedia].trim() : null,
    });
  }
  return out;
}

// --- workbook reading -------------------------------------------------------

function readWorkbook(bytes: Uint8Array): Map<string, Cell[][]> {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, { filter: (f) => f.name.startsWith("xl/") && f.name.endsWith(".xml") || f.name.endsWith(".rels") });
  } catch {
    throw new Error("That file isn't an .xlsx workbook.");
  }
  const text = (path: string) => (files[path] ? strFromU8(files[path]) : "");
  const workbook = text("xl/workbook.xml");
  if (!workbook) throw new Error("That file isn't an .xlsx workbook.");

  const targets = new Map<string, string>();
  for (const m of text("xl/_rels/workbook.xml.rels").matchAll(/<Relationship\b[^>]*>/g)) {
    const id = attr(m[0], "Id");
    const target = attr(m[0], "Target");
    if (id && target) targets.set(id, target.startsWith("/") ? target.slice(1) : `xl/${target}`);
  }
  const strings = [...text("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => unescapeXml(t[1])).join(""),
  );

  const sheets = new Map<string, Cell[][]>();
  for (const m of workbook.matchAll(/<sheet\b[^>]*>/g)) {
    const name = unescapeXml(attr(m[0], "name") ?? "");
    const path = targets.get(attr(m[0], "r:id") ?? "");
    if (path) sheets.set(name.trim(), readSheet(text(path), strings));
  }
  return sheets;
}

function readSheet(xml: string, strings: string[]): Cell[][] {
  const rows: Cell[][] = [];
  for (const row of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: Cell[] = [];
    for (const c of row[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = attr(c[1], "r");
      const col = ref ? columnIndex(ref) : cells.length;
      const type = attr(c[1], "t");
      const inner = c[2] ?? "";
      const v = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      let value: Cell = null;
      if (type === "s" && v !== undefined) value = strings[Number(v)] ?? null;
      else if (type === "inlineStr") value = [...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => unescapeXml(t[1])).join("");
      else if (type === "str" || type === "b") value = v !== undefined ? unescapeXml(v) : null;
      else if (v !== undefined) value = Number(v);
      cells[col] = value;
    }
    rows.push(Array.from(cells, (x) => x ?? null));
  }
  return rows;
}

function attr(tag: string, name: string): string | null {
  return tag.match(new RegExp(`\\b${name.replace(":", "\\:")}="([^"]*)"`))?.[1] ?? null;
}

function columnIndex(ref: string): number {
  let n = 0;
  for (const ch of ref.match(/^[A-Z]+/)?.[0] ?? "A") n = n * 26 + ch.charCodeAt(0) - 64;
  return n - 1;
}

function unescapeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&");
}

// --- sheet shapes ------------------------------------------------------------

const label = (c: Cell) => (typeof c === "string" ? c.trim() : "");

function num(c: Cell): number | null {
  if (typeof c === "number") return Number.isFinite(c) ? c : null;
  if (typeof c !== "string") return null;
  const n = Number(c.replace(/[,\s]/g, ""));
  return c.trim() && Number.isFinite(n) ? n : null;
}

/** The first number to the right of (or below) a matching label. */
function valueAfter(rows: Cell[][], re: RegExp): number | null {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      if (!re.test(label(row[c]))) continue;
      for (let k = c + 1; k < row.length; k++) if (num(row[k]) !== null) return num(row[k]);
      const below = rows[r + 1]?.[c];
      if (num(below ?? null) !== null) return num(below ?? null);
    }
  }
  return null;
}

function textAfter(rows: Cell[][], re: RegExp): Cell {
  for (const row of rows) {
    for (let c = 0; c < row.length; c++) {
      if (re.test(label(row[c]))) return row.slice(c + 1).find((x) => x !== null && x !== "") ?? null;
    }
  }
  return null;
}

function headerRow(rows: Cell[][], re: RegExp): number {
  return rows.findIndex((row) => row.some((c) => re.test(label(c))));
}

/** Excel serials and LinkedIn's M/D/YYYY strings, as YYYY-MM-DD. */
export function toDay(c: Cell): string | null {
  if (typeof c === "number" && c > 20000 && c < 80000) {
    return new Date(Math.round((c - 25569) * 86_400_000)).toISOString().slice(0, 10);
  }
  if (typeof c !== "string" || !c.trim()) return null;
  const us = c.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  const iso = c.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const parsed = Date.parse(c);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString().slice(0, 10);
}

function dailyRows(rows: Cell[][]): DailyRow[] {
  const h = headerRow(rows, /^date$/i);
  if (h < 0) return [];
  const cols = rows[h].map(label);
  const iDate = cols.findIndex((c) => /^date$/i.test(c));
  const iImp = cols.findIndex((c) => /impressions/i.test(c));
  const iEng = cols.findIndex((c) => /engagements/i.test(c));
  return rows
    .slice(h + 1)
    .map((r) => ({ day: toDay(r[iDate]), impressions: iImp >= 0 ? num(r[iImp]) : null, engagements: iEng >= 0 ? num(r[iEng]) : null }))
    .filter((r): r is DailyRow => r.day !== null);
}

function followerRows(rows: Cell[][]): { day: string; newFollowers: number }[] {
  const h = headerRow(rows, /^date$/i);
  if (h < 0) return [];
  const cols = rows[h].map(label);
  const iDate = cols.findIndex((c) => /^date$/i.test(c));
  const iNew = cols.findIndex((c) => /new followers/i.test(c));
  if (iNew < 0) return [];
  return rows
    .slice(h + 1)
    .map((r) => ({ day: toDay(r[iDate]), newFollowers: num(r[iNew]) }))
    .filter((r): r is { day: string; newFollowers: number } => r.day !== null && r.newFollowers !== null);
}

/** TOP POSTS holds two lists side by side: by engagements and by impressions. */
function topPostRows(rows: Cell[][]): TopPost[] {
  const h = headerRow(rows, /^post url$/i);
  if (h < 0) return [];
  const cols = rows[h].map(label);
  const byUrl = new Map<string, TopPost>();
  cols.forEach((c, i) => {
    if (!/^post url$/i.test(c)) return;
    const metric = cols[i + 2] ?? "";
    const field = /impressions/i.test(metric) ? "impressions" : /engagements/i.test(metric) ? "engagements" : null;
    for (const r of rows.slice(h + 1)) {
      const url = label(r[i]);
      if (!/linkedin\.com/.test(url)) continue;
      const entry = byUrl.get(url) ?? { url, publishedAt: toDay(r[i + 1]), impressions: null, engagements: null };
      if (field) entry[field] = num(r[i + 2]);
      byUrl.set(url, entry);
    }
  });
  return [...byUrl.values()];
}

function demographicRows(rows: Cell[][]): Demographic[] {
  const h = headerRow(rows, /percentage/i);
  if (h < 0) return [];
  const cols = rows[h].map(label);
  const iPct = cols.findIndex((c) => /percentage/i.test(c));
  const iLabel = cols.findIndex((c) => /^value$/i.test(c));
  const iKind = iLabel > 0 ? iLabel - 1 : 0;
  const out: Demographic[] = [];
  for (const r of rows.slice(h + 1)) {
    const kind = label(r[iKind]);
    const name = label(r[iLabel >= 0 ? iLabel : 1]);
    const raw = r[iPct];
    let share = typeof raw === "number" ? raw : num(String(raw ?? "").replace(/[<%]/g, ""));
    if (share === null || !kind || !name) continue;
    if (typeof raw === "string" && raw.includes("%")) share /= 100;
    if (share > 1) share /= 100;
    out.push({ kind: kind.toLowerCase(), label: name, share });
  }
  return out;
}

// --- CSV ---------------------------------------------------------------------

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
