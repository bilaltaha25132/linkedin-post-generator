// Row shapes mirroring supabase/migrations/0020_jobs.sql.

export type RemoteScope = "worldwide" | "region" | "country" | "onsite" | "hybrid" | "unknown";
export type VisaFlag = "likely" | "possible" | "unlikely" | "unknown";
export type JobStatus = "new" | "saved" | "applied" | "interviewing" | "offer" | "closed" | "hidden";
/** Where a job is, in the order of the profile's `regions`. */
export type JobRegion = "saudi" | "gulf" | "europe" | "remote" | "pakistan" | "other";

export interface JobSource {
  id: string;
  kind: string;
  token: string;
  name: string;
  region: string | null;
  enabled: boolean;
  last_pulled_at: string | null;
  last_ok: boolean | null;
  last_error: string | null;
  last_count: number | null;
}

/** One posting as a puller hands it over, before classification. */
export interface RawJob {
  sourceId: string;
  company: string;
  title: string;
  location: string;
  /** Country names or ISO codes the posting names, when it structures them. */
  countries: string[];
  /** The source's own remote flag, when it has one. */
  remote: boolean | null;
  hybrid?: boolean;
  employmentType: string | null;
  payMin: number | null;
  payMax: number | null;
  currency: string | null;
  payPeriod: string | null;
  urlApply: string;
  urlSource: string | null;
  postedAt: string | null;
  description: string;
}

export interface ScoreDetail {
  stack: number;
  eligibility: number;
  seniority: number;
  product: number;
  pay: number;
  region_bonus: number;
  remote_from_pk: "yes" | "no" | "unclear";
  seniority_fit: "under" | "fit" | "over";
  stack_overlap: string[];
  gaps: string[];
  red_flags: string[];
  why: string;
  capped?: string;
}

export interface Job {
  id: string;
  source: string;
  source_id: string;
  source_credit: string | null;
  company: string;
  title: string;
  location_raw: string | null;
  countries: string[];
  region: JobRegion | null;
  remote_scope: RemoteScope;
  employment_type: string | null;
  is_contract: boolean;
  pay_min: number | null;
  pay_max: number | null;
  currency: string | null;
  pay_period: string | null;
  url_apply: string;
  url_source: string | null;
  posted_at: string | null;
  first_seen_at: string;
  closed_at: string | null;
  visa_flag: VisaFlag;
  score: number | null;
  score_detail: ScoreDetail | null;
  status: JobStatus;
}

export interface JobProfile {
  titles: string[];
  must_have: string[];
  nice_to_have: string[];
  regions: string[];
  min_pay_usd: number | null;
  seniority: string | null;
  dealbreakers: string[];
  summary: string;
}
