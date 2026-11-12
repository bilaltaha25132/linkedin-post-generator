/**
 * Pulls what can move on an admissions page: deadline dates, English scores and tuition.
 * Each finding is a short signal ("date:01-15", "ielts:6.5", "fee:1500"); comparing the set
 * between two reads is what flags a change. Pure, so it runs the same in tests and the cron.
 */

const MONTHS: Record<string, number> = {
  january: 1, jan: 1, januar: 1, jänner: 1,
  february: 2, feb: 2, februar: 2,
  march: 3, mar: 3, märz: 3, maerz: 3, mär: 3, mrz: 3,
  april: 4, apr: 4,
  may: 5, mai: 5,
  june: 6, jun: 6, juni: 6,
  july: 7, jul: 7, juli: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  october: 10, oct: 10, oktober: 10, okt: 10,
  november: 11, nov: 11,
  december: 12, dec: 12, dezember: 12, dez: 12,
};
const MONTH = Object.keys(MONTHS)
  .sort((a, b) => b.length - a.length)
  .join("|");

// A line has to talk about applying or deadlines before its dates count, so news and event dates stay out.
const DEADLINE_WORDS =
  /deadline|application|apply|applicants|closing|submission|semester|intake|admission|enrol|bewerb|frist|zulassung|einschreib|sommersemester|wintersemester|until|bis zum|bis spätestens/i;
const FEE_WORDS = /tuition|studiengebühr|study fee|fees? per semester|semester fee|fees for international|non-eu/i;

const DATE_PATTERNS: { re: RegExp; read: (m: RegExpExecArray) => [number, number] | null }[] = [
  // 15 January, 15. Januar, 1st of March
  { re: new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\.?\\s+(?:of\\s+)?(${MONTH})\\b\\.?`, "gi"), read: (m) => [MONTHS[m[2].toLowerCase()], +m[1]] },
  // January 15, March 1st
  { re: new RegExp(`\\b(${MONTH})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?![.:]\\d)`, "gi"), read: (m) => [MONTHS[m[1].toLowerCase()], +m[2]] },
  // 15.01. or 15.01.2027 (German numeric)
  { re: /\b(\d{1,2})\.(\d{1,2})\.(?:\s?(?:20)?\d{2}\b)?/g, read: (m) => [+m[2], +m[1]] },
  // 2027-01-15
  { re: /\b20\d{2}-(\d{2})-(\d{2})\b/g, read: (m) => [+m[1], +m[2]] },
  // 15/01/2027, read day first as German and most English-language German pages do
  { re: /\b(\d{1,2})\/(\d{1,2})\/20\d{2}\b/g, read: (m) => [+m[2], +m[1]] },
];

export type PageRead = { signals: string[]; snippets: string[] };

const pad = (n: number) => String(n).padStart(2, "0");

export function dateSignal(month: number, day: number): string {
  return `date:${pad(month)}-${pad(day)}`;
}

/** Visible text of an HTML page, one block per line. */
export function pageText(htmlSource: string): string {
  return htmlSource
    .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/h\d|\/td|\/th|\/dt|\/dd|\/section)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&auml;/g, "ä")
    .replace(/&ouml;/g, "ö")
    .replace(/&uuml;/g, "ü")
    .replace(/&szlig;/g, "ß")
    .replace(/&euro;/g, "€")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&[a-z]+;/gi, " ")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function datesIn(line: string): [number, number][] {
  const out: [number, number][] = [];
  for (const { re, read } of DATE_PATTERNS) {
    re.lastIndex = 0;
    for (let m = re.exec(line); m; m = re.exec(line)) {
      const d = read(m);
      if (d && d[0] >= 1 && d[0] <= 12 && d[1] >= 1 && d[1] <= 31) out.push(d);
    }
  }
  return out;
}

export function readPage(text: string): PageRead {
  const lines = text.split("\n");
  const signals = new Set<string>();
  const snippets: string[] = [];
  const keep = (line: string) => {
    const s = line.length > 220 ? `${line.slice(0, 217)}...` : line;
    if (snippets.length < 12 && !snippets.includes(s)) snippets.push(s);
  };

  lines.forEach((line, i) => {
    if (line.length > 1200) return;
    // A table often has the label in one cell and the date in the next, so look one line ahead too.
    const window = DEADLINE_WORDS.test(line) ? [line, lines[i + 1] ?? ""] : [];
    for (const l of window) {
      const dates = datesIn(l);
      if (dates.length) keep(l);
      for (const [m, d] of dates) signals.add(dateSignal(m, d));
    }

    for (const m of line.matchAll(/\bIELTS\b[^0-9]{0,40}?([4-9](?:[.,][05])?)\b/gi)) {
      signals.add(`ielts:${m[1].replace(",", ".")}`);
      keep(line);
    }
    for (const m of line.matchAll(/\bTOEFL\b[^0-9]{0,40}?\b(\d{2,3})\b/gi)) {
      const score = +m[1];
      if (score >= 60 && score <= 120) {
        signals.add(`toefl:${score}`);
        keep(line);
      }
    }
    if (FEE_WORDS.test(line)) {
      for (const m of line.matchAll(/(?:€|\bEUR|\beuros?)\s?(\d{1,2}[.,]?\d{3})\b|\b(\d{1,2}[.,]?\d{3})\s?(?:€|(?:EUR|euros?)\b)/gi)) {
        const amount = +(m[1] ?? m[2]).replace(/[.,]/g, "");
        if (amount >= 500 && amount <= 40000) {
          signals.add(`fee:${amount}`);
          keep(line);
        }
      }
    }
  });
  return { signals: [...signals].sort(), snippets };
}

/** Bot walls and refusals, recorded as blocked and never worked around. */
export function looksBlocked(status: number, body: string): boolean {
  if (status === 401 || status === 403 || status === 429) return true;
  return /cf-challenge|challenge-platform|just a moment\.\.\.|captcha|access denied|are you a robot|ddos protection/i.test(body.slice(0, 20000));
}

/** match when a closing date the catalog holds is on the page. */
export function verdictFor(signals: string[], catalogEnds: string[]): "match" | "differs" | "no-dates" {
  const dates = signals.filter((s) => s.startsWith("date:"));
  if (!dates.length) return "no-dates";
  return catalogEnds.some((e) => dates.includes(e)) ? "match" : "differs";
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "date:01-15" reads as "15 Jan", "ielts:6.5" as "IELTS 6.5", "fee:1500" as "EUR 1,500". */
export function describeSignal(signal: string): string {
  const [kind, value] = signal.split(":");
  if (kind === "date") {
    const [m, d] = value.split("-").map(Number);
    return `${d} ${MONTH_SHORT[m - 1]}`;
  }
  if (kind === "ielts") return `IELTS ${value}`;
  if (kind === "toefl") return `TOEFL ${value}`;
  if (kind === "fee") return `EUR ${Number(value).toLocaleString("en-GB")}`;
  return signal;
}
