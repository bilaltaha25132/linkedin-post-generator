import { Star } from "lucide-react";

import { EmptyState, PageHeader } from "@/components/page-header";
import { PostCard } from "@/components/post-card";
import { SetupNotice } from "@/components/setup-notice";
import { listPosts } from "@/lib/posts/queries";
import { supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
// Post cards can regenerate their carousel, a writer-model server action.
export const maxDuration = 60;

export default async function QueuePage() {
  const configured = supabaseConfigured();
  const posts = configured ? await listPosts("queued") : [];

  return (
    <>
      <PageHeader title="To post" eyebrow="Posts">
        Drafts you&rsquo;ve lined up to publish. Copy one, post it on LinkedIn, then mark it posted.
      </PageHeader>

      {!configured ? (
        <SetupNotice />
      ) : posts.length === 0 ? (
        <EmptyState icon={Star} title="Nothing queued yet">
          Like a draft in the Library with &ldquo;Queue&rdquo; and it&rsquo;ll line up here, ready to post.
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
