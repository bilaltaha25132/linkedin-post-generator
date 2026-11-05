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

const byId = new Map(PROGRAMS.map((p) => [p.id, p]));

export function programById(id: string): Program | undefined {
  return byId.get(id);
}
