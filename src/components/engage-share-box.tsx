"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquarePlus, TriangleAlert } from "lucide-react";

import { capturePost } from "@/lib/engage/actions";

/** Paste, share sheet or bookmarklet: a LinkedIn post in, comment drafts out. */
export function EngageShareBox({
  initialUrl = "",
  initialText = "",
  via = "paste",
  autoFocus = false,
}: {
  initialUrl?: string;
  initialText?: string;
  via?: "share" | "bookmarklet" | "paste";
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);
  const [text, setText] = useState(initialText);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      setError(null);
      const result = await capturePost({ url, text, via });
      if (!result.ok) return setError(result.error);
      setUrl("");
      setText("");
      router.push(`/engage#post-${result.data.id}`);
      router.refresh();
    });

  return (
    <section className="panel stack-sm reveal" aria-label="Share a post in">
      <div className="panel-head" style={{ marginBottom: 0 }}>
        <span className="panel-icon">
          <MessageSquarePlus aria-hidden />
        </span>
        <h2>Comment on a post</h2>
        <p>
          Paste a LinkedIn post&rsquo;s link and the text you want to answer. You get drafts to edit, then post them
          yourself.
        </p>
      </div>
      <input
        className="field"
        placeholder="https://www.linkedin.com/posts/…"
        aria-label="Post link"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        autoFocus={autoFocus && !initialUrl}
      />
      <textarea
        className="field"
        rows={4}
        placeholder="The post's text (copy it from LinkedIn)"
        aria-label="Post text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus={autoFocus && Boolean(initialUrl) && !initialText}
      />
      <div className="row">
        <button className="btn btn-primary" onClick={submit} disabled={pending || (!url.trim() && !text.trim())}>
          <MessageSquarePlus aria-hidden /> {pending ? "Drafting…" : "Draft comments"}
        </button>
        {pending && <span className="muted small">Matching it to your wire and writing drafts, about 15 seconds.</span>}
      </div>
      {error && (
        <p className="notice notice-danger" role="alert">
          <TriangleAlert aria-hidden />
          <span>{error}</span>
        </p>
      )}
    </section>
  );
}
