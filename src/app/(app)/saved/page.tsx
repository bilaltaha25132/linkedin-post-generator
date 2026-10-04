import { FeedList } from "@/components/feed-list";
import { PageHeader } from "@/components/page-header";
import { SetupNotice } from "@/components/setup-notice";
import { listDiscoveries } from "@/lib/discoveries/queries";
import { supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const configured = supabaseConfigured();
  const { items: discoveries, total } = configured
    ? await listDiscoveries(["saved"])
    : { items: [], total: 0 };

  return (
    <>
      <PageHeader title="Saved" eyebrow="Wire">
        Items you set aside to write about later.
      </PageHeader>

      {!configured ? (
        <SetupNotice />
      ) : (
        <FeedList
          discoveries={discoveries}
          total={total}
          emptyTitle="Nothing saved yet"
          emptyHint="Save an item from the wire and it'll wait for you here."
        />
      )}
    </>
  );
}
