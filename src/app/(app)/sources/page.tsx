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
      <div className="page-head">
        <h1>Sources</h1>
        <p>
          The topics and pages the monitor watches. Search queries run against news and the web;
          page URLs are scraped directly. Turn off what&rsquo;s noisy.
        </p>
      </div>

      {configured ? <SourcesManager sources={sources} /> : <SetupNotice />}
    </>
  );
}
