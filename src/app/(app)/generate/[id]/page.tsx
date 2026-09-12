import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { Generator } from "@/components/generator";
import { SetupNotice } from "@/components/setup-notice";
import { SignalScore } from "@/components/signal-score";
import { getDiscovery } from "@/lib/discoveries/queries";
import { supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
// Generation (a server action posted to this route) runs the writer model.
export const maxDuration = 60;

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
            {discovery.source_name && <span>{discovery.source_name}</span>}
            {discovery.topics.slice(0, 4).map((t) => (
              <span key={t}>#{t}</span>
            ))}
          </div>
          {discovery.suggested_angle && <p className="angle" style={{ marginTop: 12 }}>{discovery.suggested_angle}</p>}
          <a href={discovery.url} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ marginTop: 12, marginLeft: -8 }}>
            <ExternalLink /> Read the source
          </a>
        </div>
      </div>

      <Generator
        discoveryId={discovery.id}
        defaultGuidance={discovery.suggested_angle ?? ""}
      />
    </>
  );
}
