"use client";

import { useState } from "react";
import { FileText, Copy, Check, Download, ChevronDown, ChevronUp } from "lucide-react";

import { blogTitle, blogWordCount, downloadMarkdown } from "@/lib/blog/markdown";

/** Read-only blog article attached to a saved post: title, copy, download, preview. */
export function BlogAttachment({ blog }: { blog: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!blog.trim()) return null;

  const copy = async () => {
    await navigator.clipboard.writeText(blog);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="attachment">
      <div className="attachment-head">
        <span className="chip chip-blue">
          <FileText aria-hidden /> Blog, {blogWordCount(blog)} words
        </span>
        <span className="attachment-title">{blogTitle(blog)}</span>
        <span className="row" style={{ gap: 2 }}>
          <button className="btn btn-ghost" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            {open ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />} {open ? "Hide" : "Preview"}
          </button>
          <button className="btn btn-ghost" onClick={copy}>
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? "Copied" : "Copy"}
          </button>
          <button className="btn btn-ghost" onClick={() => downloadMarkdown(blog)} aria-label="Download Markdown">
            <Download aria-hidden /> .md
          </button>
        </span>
      </div>
      {open && <pre className="preview-pre scroll-slim">{blog}</pre>}
    </div>
  );
}
