/** Where the summer 2027 window stands for non-EU applicants, as read on 5 November 2026. */
export type WindowStatus = "open" | "upcoming" | "closed" | "no-summer" | "text" | "unknown" | "conflict";

export type Evidence = "Verified" | "DAAD" | "To confirm" | "Verified language; dates as noted";

/** One English-taught Master's, from the research catalog. Public facts only. */
export type Program = {
  id: string;
  /** core = CS, AI or data; related = engineering, information systems and the like. */
  tier: "core" | "related";
  university: string;
  program: string;
  city: string;
  route: string | null;
  summer: string | null;
  winter: string | null;
  status: WindowStatus;
  evidence: Evidence;
  note: string;
  source: string | null;
  foundBy: string;
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
