export type LeadKind = "hiring_post" | "client_post" | "gig" | "contract_role" | "recruiter_message";
export type LeadStatus = "new" | "contacted" | "talking" | "won" | "lost" | "hidden";

/** One item as a source hands it over, before the classifier sees it. */
export interface RawLead {
  source: string;
  url: string;
  postedAt: string | null;
  title: string | null;
  text: string;
  who: string | null;
  kindHint: LeadKind | null;
  budget: string | null;
  stack: string[];
}

export interface LeadDetail {
  who_type: "founder" | "hiring manager" | "recruiter" | "agency" | "bot" | "unknown";
  why: string;
  capped?: string;
}

export interface Lead {
  id: string;
  kind: LeadKind;
  source: string;
  url: string | null;
  posted_at: string | null;
  who: string | null;
  wants: string | null;
  stack: string[];
  region: string | null;
  remote: string | null;
  budget: string | null;
  snippet: string | null;
  score: number | null;
  score_detail: LeadDetail | null;
  opener: string | null;
  status: LeadStatus;
  nudge_at: string | null;
  created_at: string;
}
