import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { DiscussionLink, KeyNumbers } from "@/components/discussion-link";
import { Generator } from "@/components/generator";
import { SetupNotice } from "@/components/setup-notice";
import { SignalScore } from "@/components/signal-score";
import { getDiscovery } from "@/lib/discoveries/queries";
import { supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
// Generation (a server action posted to this route) drafts, then edits each
// draft for voice: two writer-model rounds.
export const maxDuration = 180;

export default async function GeneratePage({ params }: PageProps<"/generate/[id]">) {
  if (!supabaseConfigured()) {
    return <SetupNotice />;
  }

  const { id } = await params;
  const discovery = await getDiscovery(id);

  if (!discovery) {
    return (
      <div className="empty">
        <h3>Not found</h3>
        <p>That item is no longer here. <Link href="/" style={{ color: "var(--accent)" }}>Back to the wire</Link>.</p>
      </div>
    );
  }

  return (
    <>
      <Link href="/" className="btn btn-ghost" style={{ marginBottom: 20 }}>
        <ArrowLeft /> The wire
      </Link>

      <div className="panel" style={{ display: "grid", gridTemplateColumns: "56px 1fr", gap: 18, marginBottom: 24 }}>
        <SignalScore score={discovery.relevance_score} />
        <div>
          <h2 style={{ fontSize: 22 }}>{discovery.title ?? discovery.url}</h2>
          <div className="meta" style={{ marginTop: 8 }}>
            {discovery.is_launch && <span className="launch-tag">New release</span>}
            {discovery.source_name && <span>{discovery.source_name}</span>}
            {discovery.discussion && <DiscussionLink discussion={discovery.discussion} />}
            {discovery.topics.slice(0, 4).map((t) => (
              <span key={t}>#{t}</span>
            ))}
          </div>
          <KeyNumbers figures={discovery.key_numbers ?? []} />
          {discovery.suggested_angle && <p className="angle" style={{ marginTop: 12 }}>{discovery.suggested_angle}</p>}
          <a href={discovery.url} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ marginTop: 12, marginLeft: -8 }}>
            <ExternalLink /> Read the source
          </a>
        </div>
      </div>

      {discovery.discussion && (discovery.discussion_comments?.length ?? 0) > 0 && (
        <section className="panel" style={{ marginBottom: 24 }} aria-labelledby="thread-heading">
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <h3 id="thread-heading" style={{ fontSize: 18 }}>
              What people are saying
            </h3>
            <span style={{ color: "var(--ink-faint)", fontSize: 13 }}>
              Top comments from the thread. Opinions, not facts; the writer sees them too.
            </span>
          </div>
          <ul style={{ listStyle: "none", margin: "14px 0 0", padding: 0, display: "grid", gap: 14 }}>
            {discovery.discussion_comments!.map((comment, i) => (
              <li key={i} style={{ borderLeft: "2px solid var(--line)", paddingLeft: 12, maxWidth: "72ch" }}>
                <p style={{ fontSize: 14, whiteSpace: "pre-line" }}>{comment.text}</p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--ink-faint)", marginTop: 4 }}>
                  {comment.author}
                </p>
              </li>
            ))}
          </ul>
          <div style={{ marginTop: 14, fontFamily: "var(--font-mono)", fontSize: 12 }}>
            <DiscussionLink discussion={discovery.discussion} />
          </div>
        </section>
      )}

      <Generator
        discoveryId={discovery.id}
        defaultGuidance={discovery.suggested_angle ?? ""}
      />
    </>
  );
}
