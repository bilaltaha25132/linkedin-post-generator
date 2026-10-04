import "server-only";

import { REJECT_BELOW } from "@/lib/discoveries/queries";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { SourceKind } from "@/lib/db/types";

export type RejectionReason = "low_score" | "too_old" | "unreadable";

export interface RejectedItem {
  id: string;
  url: string;
  title: string;
  host: string | null;
  /** Which kind of source turned it up; null when the source was deleted. */
  kind: SourceKind | null;
  sourceLabel: string | null;
  reason: RejectionReason;
  score: number | null;
  /** The scorer's own explanation, for low scores. */
  explanation: string | null;
  /** When the monitor found it. */
  foundAt: string;
  /** Set for scored stories, which can still be drafted. */
  discoveryId: string | null;
}

type SourceJoin = { kind: SourceKind; label: string | null; value: string } | null;

// A payload guard, as on the wire: filtering happens client-side.
const LIMIT = 400;

/** Everything the monitor found and turned down, newest first. */
export async function listRejected(): Promise<RejectedItem[]> {
  const db = supabaseAdmin();
  const [scored, dropped] = await Promise.all([
    db
      .from("discoveries")
      .select("id,url,title,source_name,relevance_score,relevance_reason,discovered_at,sources(kind,label,value)")
      .eq("status", "new")
      .lt("relevance_score", REJECT_BELOW)
      .order("discovered_at", { ascending: false })
      .limit(LIMIT),
    db
      .from("rejections")
      .select("id,url,title,source_name,reason,created_at,sources(kind,label,value)")
      .order("created_at", { ascending: false })
      .limit(LIMIT),
  ]);
  if (scored.error) throw new Error(scored.error.message);
  if (dropped.error) throw new Error(dropped.error.message);

  const label = (s: SourceJoin) => (s ? s.label || s.value : null);

  const low: RejectedItem[] = (scored.data ?? []).map((r) => {
    const source = r.sources as unknown as SourceJoin;
    return {
      id: r.id,
      url: r.url,
      title: r.title ?? r.url,
      host: r.source_name,
      kind: source?.kind ?? null,
      sourceLabel: label(source),
      reason: "low_score",
      score: r.relevance_score,
      explanation: r.relevance_reason,
      foundAt: r.discovered_at,
      discoveryId: r.id,
    };
  });
  const early: RejectedItem[] = (dropped.data ?? []).map((r) => {
    const source = r.sources as unknown as SourceJoin;
    return {
      id: r.id,
      url: r.url,
      title: r.title ?? r.url,
      host: r.source_name,
      kind: source?.kind ?? null,
      sourceLabel: label(source),
      reason: r.reason as RejectionReason,
      score: null,
      explanation: null,
      foundAt: r.created_at,
      discoveryId: null,
    };
  });

  return [...low, ...early].sort((a, b) => b.foundAt.localeCompare(a.foundAt));
}
