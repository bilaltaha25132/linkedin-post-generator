import { FeedList } from "@/components/feed-list";
import { PageHeader } from "@/components/page-header";
import { RefreshButton } from "@/components/refresh-button";
import { SetupNotice } from "@/components/setup-notice";
import { REJECT_BELOW, listDiscoveries } from "@/lib/discoveries/queries";
import { supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
// The "Scan now" server action runs a monitoring pass (90s budget, see monitor/actions.ts).
export const maxDuration = 150;

export default async function FeedPage() {
  const configured = supabaseConfigured();
  const { items: discoveries, total } = configured
    ? await listDiscoveries(["new"], { minScore: REJECT_BELOW })
    : { items: [], total: 0 };

  return (
    <>
      <PageHeader title="The wire" eyebrow="Feed" action={configured ? <RefreshButton /> : undefined}>
        What the monitor surfaced, ranked by how strong a post you could write from it. Draft the ones worth your
        audience&rsquo;s attention; dismiss the noise.
      </PageHeader>

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
