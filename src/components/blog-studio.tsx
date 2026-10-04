"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { FileText, Copy, Check, Download, RotateCcw, TriangleAlert } from "lucide-react";

import { unwrap } from "@/lib/action-result";
import { generateBlogAction, saveBlogForPost } from "@/lib/blog/actions";
import { downloadMarkdown, blogWordCount } from "@/lib/blog/markdown";

export function BlogStudio({
  discoveryId,
  postBody,
  postId,
  initialBlog = "",
}: {
  discoveryId: string;
  postBody: string;
  postId?: string | null;
  initialBlog?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [blog, setBlog] = useState(initialBlog);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(initialBlog.length > 0);
  const lastSavedRef = useRef<string>(initialBlog);

  // Persist the article to its post so it travels with the post everywhere.
  useEffect(() => {
    if (!postId || blog === lastSavedRef.current) return;
    // Flagged when the save starts, not per keystroke (see writer.tsx).
    const timer = setTimeout(async () => {
      setSaved(false);
      try {
        await saveBlogForPost(postId, blog);
        lastSavedRef.current = blog;
        setSaved(true);
      } catch {
        /* left unsaved; a later edit or rebuild retries */
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [blog, postId]);

  const build = () =>
    startTransition(async () => {
      setError(null);
      try {
        setBlog(unwrap(await generateBlogAction(discoveryId, postBody || undefined)));
      } catch (err) {
        setError((err as Error).message);
      }
    });

  const copy = async () => {
    await navigator.clipboard.writeText(blog);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="panel stack" aria-labelledby="blog-heading">
      <div className="panel-head" style={{ marginBottom: 0 }}>
        <span className="panel-icon">
          <FileText aria-hidden />
        </span>
        <h2 id="blog-heading">Blog</h2>
        <p>A full article on the same story, for your website. Markdown, ready to publish.</p>
        <button className="btn btn-primary push" onClick={build} disabled={pending}>
          <FileText aria-hidden className={pending ? "spin" : undefined} />{" "}
          {pending ? "Writing the article…" : blog ? "Rewrite" : "Generate blog"}
        </button>
      </div>

      {error && (
        <p className="notice notice-danger" role="alert">
          <TriangleAlert aria-hidden />
          {error}
        </p>
      )}

      {blog && (
        <>
          <textarea
            className="field editor editor-mono"
            rows={20}
            value={blog}
            aria-label="Blog article in Markdown"
            onChange={(e) => setBlog(e.target.value)}
          />

          <div className="action-bar">
            <button className="btn" onClick={copy}>
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? "Copied" : "Copy Markdown"}
            </button>
            <button className="btn btn-primary" onClick={() => downloadMarkdown(blog)}>
              <Download aria-hidden /> Download .md
            </button>
            <button className="btn btn-ghost" onClick={build} disabled={pending}>
              <RotateCcw aria-hidden /> Rewrite
            </button>
            <span className="row push" style={{ gap: 10 }}>
              {postId && saved && (
                <span className="status-text status-ok" role="status">
                  <Check aria-hidden /> Saved to post
                </span>
              )}
              <span className="meta-mono">{blogWordCount(blog)} words</span>
            </span>
          </div>
        </>
      )}
    </section>
  );
}
