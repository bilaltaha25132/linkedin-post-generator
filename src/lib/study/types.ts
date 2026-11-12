/** Where a summer window stands for non-EU applicants. Dated rows are recomputed live (see windows.ts). */
export type WindowStatus = "open" | "upcoming" | "closed" | "no-summer" | "text" | "unknown" | "conflict";

export type Evidence = "Verified" | "DAAD" | "To confirm" | "Verified language; dates as noted";

/** [month, day] */
export type MonthDay = [number, number];
/** A recurring window: start (null when only a closing date is known) and end. */
export type DaySpan = [MonthDay | null, MonthDay];

export type ProgramFacts = {
  duration?: string;
  /** DAAD's "Winter semester, Summer semester" line. */
  intakes?: string;
  tuition?: string;
  ielts?: string;
  toefl?: string;
  /** CEFR level of English asked for. */
  english?: string;
  /** German level needed, often only by the end of the first year. */
  german?: string;
  /** Needs uni-assist's VPD before applying. */
  vpd?: boolean;
  /** An English-medium degree is not accepted as proof of English. */
  moiRefused?: boolean;
  grade?: string;
  ects?: string;
  tests?: string[];
  interview?: boolean;
  entranceTest?: boolean;
  letter?: boolean;
  references?: boolean;
  work?: boolean;
  admission?: string;
  daadUrl?: string;
};

/** One English-taught Master's, from the research catalog. Public facts only. */
export type Program = {
  id: string;
  /** core = CS, AI or data; related = information systems, engineering informatics; wider = maths, EE, cognitive science. */
  tier: "core" | "related" | "wider";
  university: string;
  program: string;
  city: string;
  /** German state (Bundesland). */
  state: string | null;
  kind: "university" | "uas" | "private";
  route: string | null;
  summer: string | null;
  winter: string | null;
  summerSpan: DaySpan | null;
  winterSpan: DaySpan | null;
  status: WindowStatus;
  evidence: Evidence;
  note: string;
  source: string | null;
  /** The official page the rescan re-reads for dates, scores and fees. */
  checkUrl: string | null;
  /** Higher Education Compass entry, a second public listing of the same program. */
  compassUrl?: string;
  /** The compass's next non-EU deadline month, e.g. "January 2027", a second source to set against our dates. */
  compassDeadline?: string;
  foundBy: string;
  facts: ProgramFacts;
};

export type StudyStage = "shortlist" | "preparing" | "applied" | "admitted" | "rejected" | "dropped";
export type StudyIntake = "summer-2027" | "winter-2027" | "later";
export type StudyFit = "best" | "possible" | "line" | "test" | "out";

export type TrackedProgram = {
  program_id: string;
  stage: StudyStage;
  intake: StudyIntake;
  fit: StudyFit | null;
  fit_note: string;
  notes: string;
  updated_at: string;
};

export type DocumentState = { key: string; done: boolean; note: string };

export type CheckStatus = "ok" | "blocked" | "failed" | "skipped";
export type CheckVerdict = "match" | "differs" | "no-dates";

/** The latest automatic read of a program's official page. */
export type ProgramCheck = {
  program_id: string;
  url: string;
  checked_at: string;
  status: CheckStatus;
  verdict: CheckVerdict | null;
  signals: string[];
  snippets: string[];
  last_ok_at: string | null;
  last_changed_at: string | null;
  error: string | null;
};

/** One time a page's dates, scores or fees moved between two reads. */
export type ProgramChange = {
  id: number;
  program_id: string;
  url: string;
  detected_at: string;
  added: string[];
  removed: string[];
  before_snippets: string[];
  after_snippets: string[];
};

/** What a card needs from the latest check; the full snippets stay on the server. */
export type CheckSummary = Pick<ProgramCheck, "url" | "checked_at" | "status" | "verdict" | "last_ok_at" | "last_changed_at" | "error"> & {
  dates: string[];
  snippets: string[];
};
