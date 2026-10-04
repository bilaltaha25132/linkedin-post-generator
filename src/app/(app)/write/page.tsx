import { PageHeader } from "@/components/page-header";
import { SetupNotice } from "@/components/setup-notice";
import { Writer } from "@/components/writer";
import { supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
// Enhance runs the writer, a voice edit and a fact-check in turn.
export const maxDuration = 180;

export default function WritePage() {
  return (
    <>
      <PageHeader title="Write" eyebrow="Posts">
        Your own post, from a rough idea or a full draft. Enhance it into your voice, then add a carousel if it
        deserves one. Everything saves to your drafts as you go.
      </PageHeader>

      {supabaseConfigured() ? <Writer /> : <SetupNotice />}
    </>
  );
}
