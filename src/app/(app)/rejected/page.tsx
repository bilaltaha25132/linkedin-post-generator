import { PageHeader } from "@/components/page-header";
import { RejectedList } from "@/components/rejected-list";
import { SetupNotice } from "@/components/setup-notice";
import { REJECT_BELOW } from "@/lib/discoveries/queries";
import { listRejected } from "@/lib/rejections/queries";
import { supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function RejectedPage() {
  if (!supabaseConfigured()) return <SetupNotice />;
  const items = await listRejected();

  return (
    <>
      <PageHeader title="Rejected" eyebrow="Wire">
        Everything the monitor found and kept off the wire: stories that scored under {REJECT_BELOW}, with the
        scorer&rsquo;s reason, and search results dropped before scoring because they were too old or wouldn&rsquo;t
        load.
      </PageHeader>
      <RejectedList items={items} />
    </>
  );
}
