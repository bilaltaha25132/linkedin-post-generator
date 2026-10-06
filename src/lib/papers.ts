/**
 * Research papers get their link in the post: readers want to check the
 * source, and a post about a paper without it reads like a rumour. Other
 * stories keep the no-links rule. Shared by the server and the editor.
 */

const ARXIV = /^https?:\/\/(?:www\.)?arxiv\.org\/(?:abs|pdf|html)\/([0-9]{4}\.[0-9]{4,5})(?:v\d+)?/i;
const HF_PAPER = /^https?:\/\/(?:www\.)?huggingface\.co\/papers\/([0-9]{4}\.[0-9]{4,5})/i;
const OPENREVIEW = /^https?:\/\/(?:www\.)?openreview\.net\/(?:forum|pdf)\?id=[\w-]+/i;

/** The link a post should cite for a paper URL, or null when it isn't one. */
export function paperLink(url: string | null | undefined): string | null {
  if (!url) return null;
  const arxiv = ARXIV.exec(url) ?? HF_PAPER.exec(url);
  if (arxiv) return `https://arxiv.org/abs/${arxiv[1]}`;
  if (OPENREVIEW.test(url)) return url.replace("/pdf?", "/forum?");
  return null;
}

/** The paper's arXiv full-text page, which is free to fetch, or null. */
export function paperFullTextUrl(url: string): string | null {
  const id = (ARXIV.exec(url) ?? HF_PAPER.exec(url))?.[1];
  return id ? `https://arxiv.org/html/${id}` : null;
}

/** Put "Paper: <link>" just above the hashtag line, unless the post already has it. */
export function withPaperLink(post: string, link: string): string {
  if (post.includes(link)) return post;
  const lines = post.trimEnd().split("\n");
  const last = lines.at(-1)?.trim() ?? "";
  const hasTags = /^(#\w+\s*)+$/.test(last);
  const body = (hasTags ? lines.slice(0, -1) : lines).join("\n").trimEnd();
  return `${body}\n\nPaper: ${link}${hasTags ? `\n\n${last}` : ""}`;
}
