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
    <div style={{ display: "grid", gap: 10, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span className="chip">
          <FileText style={{ width: 13, height: 13 }} /> Blog · {blogWordCount(blog)} words
        </span>
        <span style={{ color: "var(--ink-soft)", fontSize: 13, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {blogTitle(blog)}
        </span>
        <span style={{ display: "inline-flex", gap: 8, marginLeft: "auto" }}>
          <button className="btn btn-ghost" onClick={() => setOpen((v) => !v)}>
            {open ? <ChevronUp /> : <ChevronDown />} {open ? "Hide" : "Preview"}
          </button>
          <button className="btn btn-ghost" onClick={copy}>
            {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
          </button>
          <button className="btn btn-ghost" onClick={() => downloadMarkdown(blog)}>
            <Download /> .md
          </button>
        </span>
      </div>
      {open && (
        <pre
          style={{
            whiteSpace: "pre-wrap",
            fontFamily: "var(--font-mono)",
            fontSize: 12.5,
            lineHeight: 1.6,
            color: "var(--ink-soft)",
            background: "var(--paper)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius)",
            padding: 14,
            maxHeight: 340,
            overflow: "auto",
          }}
        >
          {blog}
        </pre>
      )}
    </div>
  );
}
