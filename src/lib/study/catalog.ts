import catalog from "@/lib/study/programs.json";
import type { Program, StudyFit, StudyIntake, StudyStage, WindowStatus } from "@/lib/study/types";

/**
 * Generated from the study-abroad research (research/data/windows.json), with the
 * applicant's own numbers removed because this repo is public. Regenerate it
 * rather than editing rows by hand, so it stays in step with the research.
 */
export const PROGRAMS = catalog as Program[];

/** When the catalog's dates were read. Windows move, so the UI says how old they are. */
export const CATALOG_AS_OF = "5 November 2026";

export const STATUS_LABEL: Record<WindowStatus, string> = {
  open: "Open",
  upcoming: "Opens soon",
  closed: "Closed",
  "no-summer": "Winter only",
  text: "See note",
  unknown: "No date",
  conflict: "Sources disagree",
};

export const STATUS_CHIP: Record<WindowStatus, string> = {
  open: "chip-mint",
  upcoming: "chip-blue",
  closed: "chip-rose",
  "no-summer": "",
  text: "chip-amber",
  unknown: "",
  conflict: "chip-amber",
};

export const STAGES: { stage: StudyStage; label: string }[] = [
  { stage: "shortlist", label: "Shortlist" },
  { stage: "preparing", label: "Preparing" },
  { stage: "applied", label: "Applied" },
  { stage: "admitted", label: "Admitted" },
  { stage: "rejected", label: "Rejected" },
  { stage: "dropped", label: "Dropped" },
];

export const INTAKES: { intake: StudyIntake; label: string }[] = [
  { intake: "summer-2027", label: "Summer 2027" },
  { intake: "winter-2027", label: "Winter 2027" },
  { intake: "later", label: "Later" },
];

export const FITS: { fit: StudyFit; label: string; chip: string }[] = [
  { fit: "best", label: "Best fit", chip: "chip-mint" },
  { fit: "possible", label: "Possible, with risk", chip: "chip-blue" },
  { fit: "line", label: "On the line", chip: "chip-amber" },
  { fit: "test", label: "Needs a test", chip: "chip-lavender" },
  { fit: "out", label: "Out", chip: "chip-rose" },
];

export const TIER_LABEL: Record<Program["tier"], string> = {
  core: "CS, AI, data",
  related: "Related",
  wider: "Wider field",
};

export const KIND_LABEL: Record<Program["kind"], string> = {
  university: "University",
  uas: "Applied sciences",
  private: "Private",
};

/** English names for the Bundesländer, keyed by the German name the institution list uses. */
export const STATE_LABEL: Record<string, string> = {
  "Baden-Württemberg": "Baden-Württemberg",
  Bayern: "Bavaria",
  Berlin: "Berlin",
  Brandenburg: "Brandenburg",
  Bremen: "Bremen",
  Hamburg: "Hamburg",
  Hessen: "Hesse",
  "Mecklenburg-Vorpommern": "Mecklenburg-Vorpommern",
  Niedersachsen: "Lower Saxony",
  "Nordrhein-Westfalen": "North Rhine-Westphalia",
  "Rheinland-Pfalz": "Rhineland-Palatinate",
  Saarland: "Saarland",
  Sachsen: "Saxony",
  "Sachsen-Anhalt": "Saxony-Anhalt",
  "Schleswig-Holstein": "Schleswig-Holstein",
  "Thüringen": "Thuringia",
};

export function stateName(state: string | null): string {
  return state ? (STATE_LABEL[state] ?? state) : "Unknown state";
}

/** Baden-Württemberg charges non-EU students a state fee that DAAD's "no tuition" line often leaves out. */
export function feeWarning(p: Program): string | null {
  if (p.state !== "Baden-Württemberg" || p.kind === "private") return null;
  return "Baden-Württemberg charges non-EU students EUR 1,500 per semester at public universities.";
}

const byId = new Map(PROGRAMS.map((p) => [p.id, p]));

export function programById(id: string): Program | undefined {
  return byId.get(id);
}
