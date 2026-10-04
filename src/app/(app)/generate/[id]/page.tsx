import Link from "next/link";
import { ArrowLeft, ExternalLink, MessagesSquare, SearchX } from "lucide-react";

import { DiscussionLink, KeyNumbers } from "@/components/discussion-link";
import { Generator } from "@/components/generator";
import { EmptyState } from "@/components/page-header";
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
      <EmptyState
        icon={SearchX}
        title="Not found"
        action={
          <Link href="/" className="btn">
            <ArrowLeft aria-hidden /> Back to the wire
          </Link>
        }
      >
        That item is no longer here.
      </EmptyState>
    );
  }

  const comments = discovery.discussion ? (discovery.discussion_comments ?? []) : [];

  return (
    <div className="stack">
      <div className="reveal">
        <Link href="/" className="btn btn-ghost" style={{ marginLeft: -10 }}>
          <ArrowLeft aria-hidden /> The wire
        </Link>
      </div>

      <section className="panel story reveal" style={{ "--reveal-delay": "40ms" } as React.CSSProperties}>
        <SignalScore score={discovery.relevance_score} />
        <div style={{ minWidth: 0 }}>
          <h2>{discovery.title ?? discovery.url}</h2>
          <div className="meta">
            {discovery.is_launch && <span className="launch-tag">New release</span>}
            {discovery.source_name && <span>{discovery.source_name}</span>}
            {discovery.discussion && <DiscussionLink discussion={discovery.discussion} />}
            {discovery.topics.slice(0, 4).map((t) => (
              <span key={t} className="topic">
                #{t}
              </span>
            ))}
          </div>
          <KeyNumbers figures={discovery.key_numbers ?? []} />
          {discovery.suggested_angle && (
            <p className="angle">
              <b>Suggested angle</b>
              {discovery.suggested_angle}
            </p>
          )}
          <a
            href={discovery.url}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost"
            style={{ marginTop: 12, marginLeft: -10 }}
          >
            <ExternalLink aria-hidden /> Read the source
          </a>
        </div>
      </section>

      {comments.length > 0 && discovery.discussion && (
        <section
          className="panel reveal"
          aria-labelledby="thread-heading"
          style={{ "--reveal-delay": "80ms" } as React.CSSProperties}
        >
          <div className="panel-head">
            <span className="panel-icon">
              <MessagesSquare aria-hidden />
            </span>
            <h2 id="thread-heading">What people are saying</h2>
            <p>Top comments from the thread. Opinions, not facts; the writer sees them too.</p>
          </div>
          <ul className="comments">
            {comments.map((comment, i) => (
              <li key={i}>
                <p>{comment.text}</p>
                <p className="who">
                  <span className="avatar" aria-hidden>
                    {comment.author.slice(0, 1)}
                  </span>
                  {comment.author}
                </p>
              </li>
            ))}
          </ul>
          <div className="small" style={{ marginTop: 14 }}>
            <DiscussionLink discussion={discovery.discussion} />
          </div>
        </section>
      )}

      <div className="reveal" style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
        <Generator discoveryId={discovery.id} defaultGuidance={discovery.suggested_angle ?? ""} />
      </div>
    </div>
  );
}
