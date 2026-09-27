import { FeedList } from "@/components/feed-list";
import { RefreshButton } from "@/components/refresh-button";
import { SetupNotice } from "@/components/setup-notice";
import { listDiscoveries } from "@/lib/discoveries/queries";
import { supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
// The "Scan now" server action runs a full monitoring pass.
export const maxDuration = 60;

export default async function FeedPage() {
  const configured = supabaseConfigured();
  const { items: discoveries, total } = configured
    ? await listDiscoveries(["new"])
    : { items: [], total: 0 };

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
      ) : (
        <FeedList
          discoveries={discoveries}
          total={total}
          emptyTitle="The wire is quiet"
          emptyHint="Run a scan to pull the latest, or add topics on the Sources page."
        />
      )}
    </>
  );
}
