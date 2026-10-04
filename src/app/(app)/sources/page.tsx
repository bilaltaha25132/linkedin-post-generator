import { PageHeader } from "@/components/page-header";
import { SetupNotice } from "@/components/setup-notice";
import { SourcesManager } from "@/components/sources-manager";
import { listSources } from "@/lib/sources/queries";
import { supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const configured = supabaseConfigured();
  const sources = configured ? await listSources() : [];

  return (
    <>
      <PageHeader title="Sources" eyebrow="Desk">
        What the monitor watches. Feeds and Hacker News are read every pass and cost no credits; search queries and
        pages use Firecrawl, so they take turns. Turn off what&rsquo;s noisy.
      </PageHeader>

      {configured ? <SourcesManager sources={sources} /> : <SetupNotice />}
    </>
  );
}
