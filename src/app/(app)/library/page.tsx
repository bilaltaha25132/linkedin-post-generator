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
      <div className="page-head">
        <h1>Library</h1>
        <p>Your drafts and everything you&rsquo;ve posted. Edits here feed cohesion — the writer learns what you&rsquo;ve already said.</p>
      </div>

      {!configured ? (
        <SetupNotice />
      ) : posts.length === 0 ? (
        <div className="empty">
          <h3>No posts yet</h3>
          <p>Draft one from the wire and it&rsquo;ll land here.</p>
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
