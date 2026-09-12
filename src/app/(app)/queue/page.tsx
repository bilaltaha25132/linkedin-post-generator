import { PostCard } from "@/components/post-card";
import { SetupNotice } from "@/components/setup-notice";
import { listPosts } from "@/lib/posts/queries";
import { supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const configured = supabaseConfigured();
  const posts = configured ? await listPosts("queued") : [];

  return (
    <>
      <div className="page-head">
        <h1>To post</h1>
        <p>Drafts you&rsquo;ve lined up to publish. Copy one, post it on LinkedIn, then mark it posted.</p>
      </div>

      {!configured ? (
        <SetupNotice />
      ) : posts.length === 0 ? (
        <div className="empty">
          <h3>Nothing queued yet</h3>
          <p>Like a draft in the Library with &ldquo;Queue&rdquo; and it&rsquo;ll line up here, ready to post.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 18 }}>
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </>
  );
}
