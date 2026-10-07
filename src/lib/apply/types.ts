// Row shapes mirroring supabase/migrations/0026_apply.sql, plus the tailoring plan.

export interface LedgerRole {
  id: string;
  section: "experience" | "project" | "education";
  employer: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  sort: number;
}

export interface LedgerBullet {
  id: string;
  role_id: string | null;
  section: string;
  latex: string;
  plain: string;
  numbers: string[];
  skills: string[];
  origin: "resume" | "added";
  src_start: number | null;
  src_end: number | null;
  sort: number;
}

export interface LedgerSkill {
  id: string;
  name: string;
  category: string | null;
  origin: "resume" | "added";
  sort: number;
}

export interface Ledger {
  master: { latex: string; updated_at: string } | null;
  roles: LedgerRole[];
  bullets: LedgerBullet[];
  skills: LedgerSkill[];
}

export interface SalaryRange {
  min: number | null;
  max: number | null;
  currency: string;
  period: "month" | "year";
}

/** Work authorisation per country or region: yes, or needs sponsorship. */
export type WorkAuth = "yes" | "sponsorship";

export interface CandidateProfile {
  contact: { first_name?: string; last_name?: string; email?: string; phone?: string; city?: string; country?: string };
  links: { linkedin?: string; github?: string; portfolio?: string; website?: string };
  notice_weeks: number | null;
  years_experience: number | null;
  /** Keyed by region: gulf, saudi, europe, uk, us, remote. */
  salary: Record<string, SalaryRange>;
  languages: { name: string; level: string }[];
  /** Keyed by country or region code: PK, SA, AE, EU, UK, US. */
  work_auth: Record<string, WorkAuth>;
  /** Where he'd move to, keyed like work_auth. */
  relocate: Record<string, boolean>;
}

export interface BulletEdit {
  bullet_id: string;
  new_text: string;
  uses_facts: string[];
}

export interface TailorPlan {
  summary: string | null;
  edits: BulletEdit[];
  reorder: { role_id: string; bullet_ids: string[] }[];
  drop: string[];
  skills_order: { category: string; items: string[] }[];
  gaps: string[];
  keywords: string[];
}

export interface DiffRow {
  bulletId: string;
  role: string;
  before: string;
  after: string | null;
  status: "edited" | "rejected" | "dropped" | "kept";
  reason?: string;
}

export interface VersionReport {
  diff: DiffRow[];
  summary: { before: string; after: string | null; reason?: string } | null;
  coverage: { keyword: string; before: boolean; after: boolean }[];
  gaps: string[];
}

export interface ResumeVersion {
  id: string;
  job_id: string;
  plan: TailorPlan;
  checks: VersionReport;
  latex: string;
  pdf_path: string | null;
  created_at: string;
  accepted_at: string | null;
}

export type AnswerSource = "profile" | "resume" | "drafted" | "you";

export interface Answer {
  key: string;
  label: string;
  kind: string;
  type: string;
  required: boolean;
  options?: string[];
  maxLength?: number;
  value: string | null;
  source: AnswerSource;
  /** Something he must check: a knockout question, a missing fact, an honest gap. */
  flag?: string;
}

export interface Application {
  id: string;
  job_id: string;
  resume_version_id: string | null;
  form: import("@/lib/apply/forms").ApplicationForm | null;
  answers: Answer[];
  cover_letter: string | null;
  status: "draft" | "submitted";
  submitted_at: string | null;
  updated_at: string;
}
