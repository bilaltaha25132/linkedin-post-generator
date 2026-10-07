export type ConnectionStatus = "suggested" | "incoming" | "sent" | "accepted" | "talking" | "ignored";

export interface Connection {
  id: string;
  name: string;
  profile_url: string | null;
  headline: string | null;
  reason: string | null;
  source: string;
  kind: "connect" | "follow";
  search_query: string | null;
  priority: number;
  note_draft: string | null;
  note_sent: boolean;
  status: ConnectionStatus;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewElement {
  key: string;
  label: string;
  status: "pass" | "improve";
  note: string;
}

export interface RecruiterQuery {
  query: string;
  terms: string[];
  missing: string[];
  fix: string;
}

export interface ProfileReview {
  elements: ReviewElement[];
  headlines: string[];
  about: string;
  skills: string[];
  queries: RecruiterQuery[];
}
