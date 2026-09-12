// Client helpers for the blog Markdown: title, word count, and file download.

export function blogTitle(md: string): string {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : "blog";
}

export function blogWordCount(md: string): number {
  return md.trim().split(/\s+/).filter(Boolean).length;
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "blog"
  );
}

/** Save the article as a .md file named after its title. */
export function downloadMarkdown(md: string): void {
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(blogTitle(md))}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
