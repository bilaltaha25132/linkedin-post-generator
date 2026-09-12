import { DiscoveryRow } from "@/components/discovery-row";
import { SetupNotice } from "@/components/setup-notice";
import { listDiscoveries } from "@/lib/discoveries/queries";
import { supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const configured = supabaseConfigured();
  const discoveries = configured ? await listDiscoveries(["saved"]) : [];

  return (
    <>
      <div className="page-head">
        <h1>Saved</h1>
        <p>Items you set aside to write about later.</p>
      </div>

      {!configured ? (
        <SetupNotice />
      ) : discoveries.length === 0 ? (
        <div className="empty">
          <h3>Nothing saved yet</h3>
          <p>Save an item from the wire and it&rsquo;ll wait for you here.</p>
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
