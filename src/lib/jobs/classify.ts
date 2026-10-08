import { createHash } from "node:crypto";

import type { JobRegion, RawJob, RemoteScope, VisaFlag } from "@/lib/jobs/types";

// Free pre-filter: only titles that could be an AI or full-stack engineering
// role go any further. "ai" and "ml" need word boundaries ("email", "html").
const TITLE_RE =
  /\b(ai|ml|llms?|machine learning|genai|gen ai|generative|applied (ai|scientist|ml)|rag|agents?|agentic|nlp|forward[- ]deployed|full[- ]?stack|deep learning|computer vision|mlops|data scientist|ذكاء اصطناعي)\b/i;
// Roles that match the words but aren't engineering.
const NOT_ENGINEERING_RE =
  /\b(sales|account (executive|manager)|recruit\w*|marketing|counsel|legal|attorney|designer|copywriter|accountant|finance|customer (success|support|care)|(care|support|call center) agent|data entry|executive assistant|office manager|trainer|annotat\w*|labell?er|linguist|tutor|intern(ship)?|(product|program|project|controls|validation) manager|strategist|adoption|vice president|vp|head of|director)\b/i;

// Saudi and the Gulf are where he most wants to land, so there a solid software
// role counts even without "AI" in the title; the score ranks it against the rest.
const GULF_TITLE_RE =
  /\b(software|back[- ]?end|python|node(\.?js)?|platform|data|cloud|solutions?|integration|api) (engineer|developer|architect)\b/i;

export function isCandidateTitle(title: string, region?: JobRegion): boolean {
  if (NOT_ENGINEERING_RE.test(title)) return false;
  return TITLE_RE.test(title) || ((region === "saudi" || region === "gulf") && GULF_TITLE_RE.test(title));
}

// Saudization and Emiratization roles, which are closed to him whatever the fit.
const NATIONALS_RE =
  /\b(saudi nationals?( only)?|emirati nationals?( only)?|uae nationals? only|qatari nationals? only|nationals only|tamheer|co-?op (program|trainee))\b|للسعوديين فقط|تمهير/i;

export function isNationalsOnly(job: Pick<RawJob, "title" | "description">): boolean {
  return NATIONALS_RE.test(job.title) || NATIONALS_RE.test(job.description.slice(0, 1500));
}

// Hard no's that don't need a model to spot.
const US_ONLY_RE =
  /\b(us citizens? only|must be (a )?u\.?s\.? citizen|security clearance (is )?required|active (ts|secret)[/ ]|authorized to work in the (us|united states) (without|and will not))\b/i;

export function isUsOnly(job: Pick<RawJob, "description">): boolean {
  return US_ONLY_RE.test(job.description);
}

const SAUDI = ["saudi arabia", "saudi", "ksa", "riyadh", "jeddah", "jiddah", "dammam", "khobar", "neom", "sa"];
const GULF = [
  "united arab emirates", "uae", "dubai", "abu dhabi", "sharjah", "ae", "qatar", "doha", "qa", "kuwait", "kw",
  "bahrain", "manama", "bh", "oman", "muscat", "om", "gcc", "middle east", "mena",
];
const PAKISTAN = ["pakistan", "karachi", "lahore", "islamabad", "pk"];
const EUROPE = [
  "europe", "emea", "eu", "germany", "de", "berlin", "munich", "münchen", "hamburg", "frankfurt", "cologne", "köln",
  "netherlands", "nl", "amsterdam", "rotterdam", "utrecht", "ireland", "ie", "dublin", "united kingdom", "uk", "gb",
  "england", "london", "manchester", "edinburgh", "cambridge, uk", "poland", "pl", "warsaw", "krakow", "kraków",
  "wroclaw", "sweden", "se", "stockholm", "norway", "no", "oslo", "denmark", "dk", "copenhagen", "finland", "fi",
  "helsinki", "spain", "es", "madrid", "barcelona", "portugal", "pt", "lisbon", "porto", "switzerland", "ch",
  "zurich", "zürich", "geneva", "austria", "at", "vienna", "france", "fr", "paris", "belgium", "be", "brussels",
  "italy", "it", "milan", "estonia", "ee", "tallinn", "latvia", "riga", "lithuania", "vilnius", "czech", "prague",
  "romania", "bucharest", "greece", "athens", "luxembourg",
];

/** Lower-cased words and phrases of a location, for matching against the lists above. */
function places(job: Pick<RawJob, "location" | "countries">): string[] {
  const text = [job.location, ...job.countries].join(", ").toLowerCase();
  return text
    .split(/[,;|/()•·\n]| - | or | and /)
    .map((part) => part.trim())
    .filter(Boolean);
}

function mentions(parts: string[], names: string[]): boolean {
  // Two-letter codes only count as a whole part ("de", not "madrid" ⊃ "de"), and
  // names as whole words ("oman", not "romania").
  return parts.some((part) =>
    names.some((name) => (name.length <= 2 ? part === name : wordIn(part, name))),
  );
}

function wordIn(text: string, word: string): boolean {
  const at = text.indexOf(word);
  if (at < 0) return false;
  const letter = /\p{L}/u;
  return !letter.test(text[at - 1] ?? "") && !letter.test(text[at + word.length] ?? "");
}

const WORLDWIDE_RE = /\b(anywhere|worldwide|world ?wide|global(ly)?|any location|fully remote|100% remote)\b/i;
const REMOTE_RE = /\bremote\b/i;

export function remoteScope(job: Pick<RawJob, "location" | "countries" | "remote" | "hybrid">): RemoteScope {
  const location = job.location;
  if (job.hybrid || /\bhybrid\b/i.test(location)) return "hybrid";
  const remote = job.remote ?? REMOTE_RE.test(location);
  if (!remote) return location.trim() || job.countries.length ? "onsite" : "unknown";
  if (WORLDWIDE_RE.test(location) || (!job.countries.length && /^\s*remote\s*(job)?\s*$/i.test(location)))
    return "worldwide";
  const parts = places(job);
  if (mentions(parts, ["europe", "emea", "eu", "americas", "apac", "asia", "latam", "mena", "middle east", "gcc"]))
    return "region";
  return job.countries.length || parts.some((p) => !REMOTE_RE.test(p)) ? "country" : "worldwide";
}

// Places that settle a location as outside his regions, so a board's own region
// doesn't stand in for them.
const ELSEWHERE_RE =
  /\b(united states|usa|u\.s\.?|us|canada|india|singapore|australia|japan|china|korea|brazil|mexico|philippines|egypt|serbia|turkey|israel|nigeria|kenya|argentina|colombia|san francisco|new york|nyc|palo alto|sunnyvale|seattle|boston|austin|chicago|los angeles|toronto|montreal|vancouver|bangalore|bengaluru|hyderabad|manila|cairo|belgrade|tokyo|sydney|(ca|ny|wa|tx|ma|il|co|ga|nc|va|fl))\b/i;

/** True when the location names somewhere, but nowhere he targets. */
export function isElsewhere(job: Pick<RawJob, "location" | "countries">): boolean {
  return ELSEWHERE_RE.test([job.location, ...job.countries].join(", "));
}

/** The best region a job offers him, in his priority order. */
export function jobRegion(job: Pick<RawJob, "location" | "countries">, scope: RemoteScope): JobRegion {
  const parts = places(job);
  if (mentions(parts, SAUDI)) return "saudi";
  if (mentions(parts, GULF)) return "gulf";
  if (mentions(parts, PAKISTAN)) return "pakistan";
  if (scope === "worldwide") return "remote";
  if (mentions(parts, EUROPE)) return "europe";
  return "other";
}

// One label per job. Keywords in the languages of the countries he targets.
const VISA_YES_RE =
  /\b(visa sponsorship (is )?(available|provided|offered)|we (will |can |do )?sponsor (your )?(work )?visas?|sponsor(ship)? (for )?(a |your )?(work |skilled worker )?visa|relocation (package|support|assistance|bonus)|we help with relocation|visa support|blue card|iqama (provided|sponsored)|umzugsunterstützung|visum|relocatie|wsparcie relokacji)\b/i;
const VISA_NO_RE =
  /\b(no (visa )?sponsorship|(unable|not able) to (offer |provide )?(visa )?sponsor|cannot sponsor|does not (offer|provide) (visa )?sponsorship|must (already )?have (the )?(right|authori[sz]ation) to work|eligible to work in the (uk|eu|us|united states) without|without (the need for )?(visa )?sponsorship)\b/i;

export function visaFlag(job: Pick<RawJob, "description">, region: JobRegion, scope: RemoteScope): VisaFlag {
  if (VISA_NO_RE.test(job.description)) return "unlikely";
  if (VISA_YES_RE.test(job.description)) return "likely";
  // Gulf employers sponsor the residence visa of nearly every expat hire.
  if ((region === "saudi" || region === "gulf") && scope !== "worldwide") return "possible";
  return "unknown";
}

export function isContract(employmentType: string | null, title: string): boolean {
  return /contract|freelance|contractor|temporary|fixed[- ]term/i.test(`${employmentType ?? ""} ${title}`);
}

/** Same company, same role, same remote scope: one card, whichever board it came from. */
export function dedupKey(company: string, title: string, scope: RemoteScope): string {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/\b(inc|ltd|llc|gmbh|ag|sa|bv|plc|corp|co)\b\.?/g, "")
      .replace(/\(.*?\)|\[.*?\]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  return createHash("sha256").update(`${norm(company)}|${norm(title)}|${scope}`).digest("hex").slice(0, 32);
}
