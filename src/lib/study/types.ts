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
