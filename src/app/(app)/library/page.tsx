import { PenLine } from "lucide-react";

import { EmptyState, PageHeader } from "@/components/page-header";
import { PostCard } from "@/components/post-card";
import { SetupNotice } from "@/components/setup-notice";
import { listPosts } from "@/lib/posts/queries";
import { supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
// Post cards can regenerate their carousel, a writer-model server action.
export const maxDuration = 60;

export default async function LibraryPage() {
  const configured = supabaseConfigured();
  const posts = configured ? await listPosts() : [];

  return (
    <>
      <PageHeader title="Library" eyebrow="Posts">
        Your drafts and everything you&rsquo;ve posted. Edits here feed cohesion, so the writer learns what you&rsquo;ve already said.
      </PageHeader>

      {!configured ? (
        <SetupNotice />
      ) : posts.length === 0 ? (
        <EmptyState icon={PenLine} title="No posts yet">
          Draft one from the wire and it&rsquo;ll land here.
        </EmptyState>
      ) : (
        <div className="stack">
          {posts.map((p, i) => (
            <PostCard key={p.id} post={p} index={i} />
          ))}
        </div>
      )}
    </>
  );
}
