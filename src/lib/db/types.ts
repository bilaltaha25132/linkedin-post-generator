// Row shapes mirroring supabase/migrations/0001_init.sql.

export type SourceKind = "search" | "rss" | "url" | "hn" | "papers" | "models";

export interface Source {
  id: string;
  kind: SourceKind;
  value: string;
  label: string | null;
  enabled: boolean;
  last_scanned_at: string | null;
  created_at: string;
}

export type DiscoveryStatus = "new" | "saved" | "dismissed" | "drafted" | "posted";

/** A public thread about the story: where it is and how much it's being talked about. */
export interface Discussion {
  platform: string;
  url: string;
  points: number | null;
  comments: number | null;
}

export interface DiscussionComment {
  author: string;
  text: string;
}

export interface Discovery {
  id: string;
  url: string;
  url_hash: string;
  title: string | null;
  source_name: string | null;
  source_id: string | null;
  published_at: string | null;
  snippet: string | null;
  content_md: string | null;
  topics: string[];
  relevance_score: number | null;
  relevance_reason: string | null;
  suggested_angle: string | null;
  /** Benchmark scores, prices and other hard figures pulled from the story. */
  key_numbers: string[];
  /** Announces a newly released AI model, product or tool. */
  is_launch: boolean;
  discussion: Discussion | null;
  status: DiscoveryStatus;
  discovered_at: string;
  /** The source that found it; null once that source is deleted. */
  sources?: { kind: SourceKind; label: string } | null;
}

export type PostStatus = "draft" | "queued" | "posted";

export interface CarouselSlide {
  heading: string;
  body: string;
  figure?: { src: string; caption: string; credit?: string };
}

export interface Post {
  id: string;
  discovery_id: string | null;
  body: string;
  variants: string[] | null;
  status: PostStatus;
  carousel: CarouselSlide[] | null;
  carousel_title: string | null;
  blog: string | null;
  external_url: string | null;
  created_at: string;
  posted_at: string | null;
}

export type VoiceKind = "linkedin" | "blog" | "work" | "note";

export interface VoiceSample {
  id: string;
  kind: VoiceKind;
  title: string | null;
  content: string;
  created_at: string;
}
