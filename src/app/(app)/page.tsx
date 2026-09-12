import { DiscoveryRow } from "@/components/discovery-row";
import { RefreshButton } from "@/components/refresh-button";
import { SetupNotice } from "@/components/setup-notice";
import { listDiscoveries } from "@/lib/discoveries/queries";
import { supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
// The "Scan now" server action runs a full monitoring pass.
export const maxDuration = 60;

export default async function FeedPage() {
  const configured = supabaseConfigured();
  const discoveries = configured ? await listDiscoveries(["new"]) : [];

  return (
    <>
      <div className="page-head">
        <h1>The wire</h1>
        <p>
          What the monitor surfaced, ranked by how strong a post you could write from it. Draft the
          ones worth your audience&rsquo;s attention; dismiss the noise.
        </p>
        <div style={{ marginTop: 18 }}>
          <RefreshButton />
        </div>
      </div>

      {!configured ? (
        <SetupNotice />
      ) : discoveries.length === 0 ? (
        <div className="empty">
          <h3>The wire is quiet</h3>
          <p>Run a scan to pull the latest, or add topics on the Sources page.</p>
        </div>
      ) : (
        <div className="wire">
          {discoveries.map((d) => (
            <DiscoveryRow key={d.id} discovery={d} />
          ))}
        </div>
      )}
    </>
  );
}
