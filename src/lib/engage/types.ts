export type CommentShape = "field_note" | "counterpoint" | "question" | "from_source";
export type Tier = "A" | "B" | "C" | "target" | "warm";

export interface Rubric {
  anchored: number;
  adds: number;
  length: number;
  friction: number;
  ending: number;
  voice: number;
  total: number;
  notes: string;
}

export interface CommentDraft {
  id: string;
  shape: CommentShape;
  body: string;
  rubric: Rubric | null;
  score: number | null;
  edited_body: string | null;
  posted_at: string | null;
}

export interface CapturedPost {
  id: string;
  url: string | null;
  posted_at: string | null;
  author_name: string | null;
  text: string;
  via: "share" | "bookmarklet" | "paste" | "email";
  matched_discovery_id: string | null;
  created_at: string;
  drafts: CommentDraft[];
  /** The wire story it matched, when one did. */
  story: { title: string | null; url: string } | null;
}

export interface WatchPerson {
  id: string;
  name: string;
  profile_url: string | null;
  kind: "person" | "company";
  tier: Tier;
  topics: string[];
  notes: string | null;
  bell: boolean;
  last_visited_at: string | null;
}

export interface EngagementEvent {
  id: string;
  kind: string;
  actor_name: string | null;
  preview: string | null;
  post_url: string | null;
  occurred_at: string;
  reply_draft: string | null;
}

export interface Topic {
  id: string;
  title: string;
  url: string;
  score: number | null;
  topics: string[];
  /** Watchlist people whose topics overlap this story's. */
  people: string[];
}
