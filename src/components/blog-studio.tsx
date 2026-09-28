"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { FileText, Copy, Check, Download, RotateCcw } from "lucide-react";

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
        setBlog(await generateBlogAction(discoveryId, postBody || undefined));
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
    <div className="panel" style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h3 style={{ fontSize: 18 }}>Blog</h3>
        <span style={{ color: "var(--ink-faint)", fontSize: 13 }}>
          A full article on the same story, for your website. Markdown, ready to publish.
        </span>
        <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={build} disabled={pending}>
          <FileText /> {pending ? "Writing the article…" : blog ? "Rewrite" : "Generate blog"}
        </button>
      </div>

      {error && <p className="notice" style={{ borderColor: "var(--danger)" }}>{error}</p>}

      {blog && (
        <>
          <textarea
            className="field"
            rows={20}
            value={blog}
            onChange={(e) => setBlog(e.target.value)}
            style={{ lineHeight: 1.6, fontFamily: "var(--font-mono)", fontSize: 13 }}
          />

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn" onClick={copy}>
              {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy Markdown"}
            </button>
            <button className="btn btn-primary" onClick={() => downloadMarkdown(blog)}>
              <Download /> Download .md
            </button>
            <button className="btn btn-ghost" onClick={build} disabled={pending}>
              <RotateCcw /> Rewrite
            </button>
            <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 10 }}>
              {postId && saved && (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Check style={{ width: 13, height: 13 }} /> Saved to post
                </span>
              )}
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-faint)" }}>
                {blogWordCount(blog)} words
              </span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}
