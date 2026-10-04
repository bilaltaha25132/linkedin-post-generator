import { Send } from "lucide-react";

import { EmptyState, PageHeader } from "@/components/page-header";
import { PostCard } from "@/components/post-card";
import { SetupNotice } from "@/components/setup-notice";
import { listPosts } from "@/lib/posts/queries";
import { supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
// Post cards can regenerate their carousel, a writer-model server action.
export const maxDuration = 60;

export default async function PostedPage() {
  const configured = supabaseConfigured();
  const posts = configured ? await listPosts("posted") : [];

  return (
    <>
      <PageHeader title="Posted" eyebrow="Posts">
        Everything you&rsquo;ve published, newest first. The writer reads these so new drafts don&rsquo;t repeat you.
      </PageHeader>

      {!configured ? (
        <SetupNotice />
      ) : posts.length === 0 ? (
        <EmptyState icon={Send} title="Nothing posted yet">
          After you publish a draft on LinkedIn, use Mark posted on its card and it moves here.
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
