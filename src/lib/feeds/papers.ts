import { clip } from "@/lib/feeds/text";

// Hugging Face Daily Papers: arXiv papers the research community submits and
// upvotes each day. Public and keyless. Upvotes are the signal that a paper is
// being talked about, which arXiv's own listings (400+ a day per category) lack.
const API = "https://huggingface.co/api/daily_papers";

export interface DailyPaper {
  id: string;
  title: string;
  /** The arXiv abstract page: the link a post cites. */
  url: string;
  /**
   * The day it is on the Daily Papers list, which is when people are talking
   * about it. A day's list also carries papers first submitted days before.
   */
  date: string;
  upvotes: number;
  /** Abstract plus who wrote it and where the code is, for scoring and drafting. */
  text: string;
  summary: string;
}

interface ApiPaper {
  title: string;
  paper: {
    id: string;
    summary?: string;
    upvotes?: number;
    authors?: { name?: string }[];
    organization?: { fullname?: string; name?: string } | null;
    githubRepo?: string | null;
    githubStars?: number | null;
    projectPage?: string | null;
  };
}

async function papersOn(date: string): Promise<(ApiPaper & { listedOn: string })[]> {
  const response = await fetch(`${API}?date=${date}`, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Hugging Face Papers returned HTTP ${response.status}`);
  const body: unknown = await response.json();
  // A day nobody has submitted to yet comes back as an error object, not a list.
  return Array.isArray(body) ? (body as ApiPaper[]).map((p) => ({ ...p, listedOn: `${date}T12:00:00.000Z` })) : [];
}

/** Today's and yesterday's papers (UTC) with at least `minUpvotes`, most upvoted first. */
export async function dailyPapers(minUpvotes: number, now = new Date()): Promise<DailyPaper[]> {
  const day = (offset: number) => new Date(now.getTime() - offset * 86_400_000).toISOString().slice(0, 10);
  const lists = await Promise.all([papersOn(day(0)), papersOn(day(1))]);

  const seen = new Set<string>();
  return lists
    .flat()
    .filter((p) => (p.paper.upvotes ?? 0) >= minUpvotes && !seen.has(p.paper.id) && seen.add(p.paper.id))
    .sort((a, b) => (b.paper.upvotes ?? 0) - (a.paper.upvotes ?? 0))
    .map((p) => {
      const { paper } = p;
      const org = paper.organization?.fullname || paper.organization?.name;
      const authors = (paper.authors ?? []).map((a) => a.name).filter(Boolean);
      const summary = (paper.summary ?? "").trim();
      const facts = [
        org && `Organisation: ${org}`,
        authors.length && `Authors: ${authors.slice(0, 6).join(", ")}${authors.length > 6 ? " et al." : ""}`,
        paper.githubRepo && `Code: ${paper.githubRepo}${paper.githubStars ? ` (${paper.githubStars} GitHub stars)` : ""}`,
        paper.projectPage && `Project page: ${paper.projectPage}`,
        `Hugging Face Daily Papers: ${paper.upvotes ?? 0} upvotes`,
      ].filter(Boolean);
      return {
        id: paper.id,
        title: p.title,
        url: `https://arxiv.org/abs/${paper.id}`,
        date: p.listedOn,
        upvotes: paper.upvotes ?? 0,
        summary: clip(summary, 500),
        text: `${facts.join("\n")}\n\nAbstract: ${summary}`,
      };
    });
}
