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
      <div className="page-head">
        <h1>Posted</h1>
        <p>Everything you&rsquo;ve published, newest first. The writer reads these so new drafts don&rsquo;t repeat you.</p>
      </div>

      {!configured ? (
        <SetupNotice />
      ) : posts.length === 0 ? (
        <div className="empty">
          <h3>Nothing posted yet</h3>
          <p>After you publish a draft on LinkedIn, use Mark posted on its card and it moves here.</p>
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
