import "server-only";

import { env } from "@/lib/env";
import { htmlToText } from "@/lib/feeds/text";
import {
  pullArc,
  pullBraintrust,
  pullFreelancermap,
  pullGuru,
  pullKhamsat,
  pullMostaql,
  pullPeoplePerHour,
  pullUreed,
  pullWorkana,
} from "@/lib/leads/marketplaces";
import type { RawLead } from "@/lib/leads/types";
import { activityIdOf, postedAtFromId } from "@/lib/links/deep";

// Pullers for the Leads tab (docs/growth/leads.md). Each returns what its
// source hands over; nothing here fetches a LinkedIn page. Search-API lanes
// read the provider's own index, URL and snippet only.

const UA = "SignalDesk/1.0 (personal lead finder)";
const MAX_AGE_DAYS = 14;

/** Worth a classifier call at all: mentions AI work, not just "AI-powered" marketing. */
export const AI_WORK =
  /\b(llm|llms|gpt|openai|anthropic|claude|gemini|rag|retrieval|langchain|langgraph|llamaindex|agents?|agentic|chatbots?|genai|generative ai|machine learning|ml engineer|ai engineer|ai developer|nlp|vector|embeddings?|fine[- ]tun\w*|prompt)\b/i;

/** Marketplace gigs he'd take beyond AI work: automation, scraping, full-stack builds. Arabic for Mostaql and Khamsat. */
export const GIG_WORK = new RegExp(
  `${AI_WORK.source}|\\b(automat\\w*|n8n|zapier|make\\.com|scrap\\w*|crawler|next\\.?js|react|node\\.?js|fastapi|django|flask|python|full[- ]?stack|saas|web app|api integration|whatsapp)\\b|ذكاء اصطناعي|بوت|أتمتة|اتمتة|بايثون|سكربت`,
  "i",
);

export interface LeadLane {
  key: string;
  label: string;
  /** Missing env var names; empty when the lane can run. */
  needs: string[];
  pull: () => Promise<RawLead[]>;
  /** Fetched by the GitHub runner instead of Vercel (src/lib/leads/marketplaces.ts). */
  relay?: boolean;
}

export function leadLanes(): LeadLane[] {
  const keys = env.search();
  return [
    { key: "hn", label: "HN freelancer thread", needs: [], pull: pullHackerNews },
    { key: "freelancer", label: "Freelancer.com", needs: [], pull: pullFreelancer },
    { key: "peopleperhour", label: "PeoplePerHour", needs: [], pull: pullPeoplePerHour },
    { key: "workana", label: "Workana", needs: [], pull: pullWorkana, relay: true },
    { key: "mostaql", label: "Mostaql", needs: [], pull: pullMostaql },
    { key: "arc", label: "Arc.dev contracts", needs: [], pull: pullArc },
    { key: "guru", label: "Guru", needs: [], pull: pullGuru, relay: true },
    { key: "braintrust", label: "Braintrust", needs: [], pull: pullBraintrust },
    { key: "freelancermap", label: "freelancermap", needs: [], pull: pullFreelancermap },
    { key: "ureed", label: "Ureed", needs: [], pull: pullUreed },
    { key: "khamsat", label: "Khamsat", needs: [], pull: pullKhamsat },
    {
      key: "reddit",
      label: "Reddit r/forhire and r/hiring",
      needs: [!keys.redditId && "REDDIT_CLIENT_ID", !keys.redditSecret && "REDDIT_CLIENT_SECRET"].filter(Boolean) as string[],
      pull: () => pullReddit(keys.redditId, keys.redditSecret),
    },
    {
      key: "tavily",
      label: "Tavily search over LinkedIn posts",
      needs: keys.tavilyKey ? [] : ["TAVILY_API_KEY"],
      pull: () => pullTavily(keys.tavilyKey),
    },
    {
      key: "exa",
      label: "Exa search over LinkedIn posts",
      needs: keys.exaKey ? [] : ["EXA_API_KEY"],
      pull: () => pullExa(keys.exaKey),
    },
  ];
}

export function tooOld(postedAt: string | null, now = Date.now()): boolean {
  return postedAt !== null && now - Date.parse(postedAt) > MAX_AGE_DAYS * 86_400_000;
}

async function getJSON<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "user-agent": UA, accept: "application/json", ...init.headers },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${new URL(url).host} answered ${res.status}`);
  return (await res.json()) as T;
}

// --- Hacker News: the monthly "Freelancer? Seeking freelancer?" thread -------

async function pullHackerNews(): Promise<RawLead[]> {
  // A regular user posts it now, not whoishiring, and copies sometimes appear;
  // the busiest one from the latest month is the real thread.
  const search = await getJSON<{ hits: { objectID: string; title: string; created_at_i: number; num_comments: number | null }[] }>(
    `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent('"Seeking freelancer"')}&tags=story&hitsPerPage=10`,
  );
  const threads = search.hits.filter((h) => /^Ask HN: Freelancer\? Seeking freelancer\?/i.test(h.title));
  if (!threads.length) return [];
  const latest = Math.max(...threads.map((h) => h.created_at_i));
  const thread = threads
    .filter((h) => latest - h.created_at_i < 5 * 86_400)
    .sort((a, b) => (b.num_comments ?? 0) - (a.num_comments ?? 0))[0];
  const item = await getJSON<{ children: { id: number; author: string | null; text: string | null; created_at: string }[] }>(
    `https://hn.algolia.com/api/v1/items/${thread.objectID}`,
  );
  return item.children
    .filter((c) => c.text && /^\s*(<p>)?\s*seeking freelancer/i.test(c.text))
    .map((c) => {
      const text = htmlToText(c.text!).replace(/^\s*seeking freelancer:?\s*/i, "").trim();
      return {
        source: "hn",
        url: `https://news.ycombinator.com/item?id=${c.id}`,
        postedAt: c.created_at,
        title: null,
        text,
        who: c.author,
        kindHint: "client_post" as const,
        budget: null,
        stack: [],
      };
    })
    .filter((l) => AI_WORK.test(l.text));
}

// --- Freelancer.com public projects API (reads need no auth) ----------------

const FREELANCER_QUERIES = ["llm", "rag", "langchain", "ai agent", "chatbot"];
const MIN_FIXED_USD = 500;
const MIN_HOURLY_USD = 25;

interface FreelancerProject {
  id: number;
  title: string;
  seo_url: string;
  type: "fixed" | "hourly";
  budget: { minimum?: number; maximum?: number };
  currency: { code: string; exchange_rate: number };
  time_submitted: number;
  description?: string;
  preview_description?: string;
  jobs?: { name: string }[];
}

async function pullFreelancer(): Promise<RawLead[]> {
  const seen = new Set<number>();
  const out: RawLead[] = [];
  for (const q of FREELANCER_QUERIES) {
    const params = new URLSearchParams({ query: q, limit: "20", full_description: "true", job_details: "true", compact: "true" });
    const data = await getJSON<{ result: { projects: FreelancerProject[] } }>(
      `https://www.freelancer.com/api/projects/0.1/projects/active/?${params}`,
    );
    for (const p of data.result.projects) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      const rate = p.currency.exchange_rate || 1;
      const maxUsd = (p.budget.maximum ?? p.budget.minimum ?? 0) * rate;
      if (maxUsd < (p.type === "hourly" ? MIN_HOURLY_USD : MIN_FIXED_USD)) continue;
      const usd = (n: number | undefined) => (n ? Math.round(n * rate) : null);
      const [lo, hi] = [usd(p.budget.minimum), usd(p.budget.maximum)];
      out.push({
        source: "freelancer",
        url: `https://www.freelancer.com/projects/${p.seo_url}`,
        postedAt: new Date(p.time_submitted * 1000).toISOString(),
        title: p.title,
        text: `${p.title}\n${p.description ?? p.preview_description ?? ""}`,
        who: null,
        kindHint: "gig",
        budget: `USD ${lo ?? "?"}${hi && hi !== lo ? `-${hi}` : ""}${p.type === "hourly" ? "/h" : " fixed"}`,
        stack: (p.jobs ?? []).map((j) => j.name).slice(0, 8),
      });
    }
  }
  return out;
}

// --- Reddit (free OAuth script app; anonymous JSON is blocked) ---------------

async function pullReddit(id: string, secret: string): Promise<RawLead[]> {
  const token = await getJSON<{ access_token: string }>("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const q = '(AI OR LLM OR RAG OR agent OR chatbot OR GPT) (hiring OR "looking for" OR freelance OR contract)';
  const params = new URLSearchParams({ q, restrict_sr: "1", sort: "new", t: "week", limit: "50" });
  const data = await getJSON<{
    data: { children: { data: { permalink: string; title: string; selftext: string; author: string; created_utc: number; link_flair_text: string | null } }[] };
  }>(`https://oauth.reddit.com/r/forhire+hiring+freelance_forhire/search?${params}`, {
    headers: { authorization: `Bearer ${token.access_token}` },
  });
  return data.data.children
    .map(({ data: p }) => ({
      source: "reddit",
      url: `https://www.reddit.com${p.permalink}`,
      postedAt: new Date(p.created_utc * 1000).toISOString(),
      title: p.title,
      text: `${p.title}\n${p.selftext}`.slice(0, 4000),
      who: `u/${p.author}`,
      kindHint: "client_post" as const,
      budget: null,
      stack: [],
    }))
    // r/forhire mixes people offering work with people selling it.
    .filter((l) => !/\[for hire\]/i.test(l.title ?? "") && AI_WORK.test(l.text));
}

// --- Search APIs over public LinkedIn posts -----------------------------------

const LINKEDIN_QUERIES = [
  '"hiring" "AI engineer" (LangGraph OR RAG OR agents)',
  '"looking for" ("AI developer" OR "AI engineer") (freelance OR contract OR consultant)',
  '"we\'re hiring" LLM engineer remote',
  '"need help" building "AI agent"',
  '"founding AI engineer"',
];

/** Three queries a run, rotated by the hour, keeps Tavily inside its free 1,000 a month. */
function rotatingQueries(count: number): string[] {
  const start = Math.floor(Date.now() / 3_600_000) % LINKEDIN_QUERIES.length;
  return Array.from({ length: count }, (_, i) => LINKEDIN_QUERIES[(start + i) % LINKEDIN_QUERIES.length]);
}

function linkedInLead(source: string, url: string, title: string | null, text: string, published: string | null): RawLead | null {
  if (!/linkedin\.com\/(posts|feed\/update)\//.test(url)) return null;
  const id = activityIdOf(url);
  return {
    source,
    url,
    postedAt: (id && postedAtFromId(id)?.toISOString()) || published,
    title,
    text,
    who: null,
    kindHint: null,
    budget: null,
    stack: [],
  };
}

async function pullTavily(key: string): Promise<RawLead[]> {
  const out: RawLead[] = [];
  for (const query of rotatingQueries(3)) {
    const data = await getJSON<{ results: { url: string; title: string; content: string; published_date?: string }[] }>(
      "https://api.tavily.com/search",
      {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({ query, include_domains: ["linkedin.com"], time_range: "week", max_results: 10 }),
      },
    );
    for (const r of data.results) {
      const lead = linkedInLead("tavily", r.url, r.title, r.content, r.published_date ?? null);
      if (lead) out.push(lead);
    }
  }
  return out;
}

async function pullExa(key: string): Promise<RawLead[]> {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const out: RawLead[] = [];
  for (const query of ["founder looking for a contractor to build an AI agent", "startup hiring an AI engineer to build RAG"]) {
    const data = await getJSON<{ results: { url: string; title: string | null; publishedDate?: string; text?: string }[] }>(
      "https://api.exa.ai/search",
      {
        method: "POST",
        headers: { "x-api-key": key, "content-type": "application/json" },
        body: JSON.stringify({
          query,
          includeDomains: ["linkedin.com"],
          startPublishedDate: since,
          numResults: 10,
          contents: { text: { maxCharacters: 1200 } },
        }),
      },
    );
    for (const r of data.results) {
      const lead = linkedInLead("exa", r.url, r.title, r.text ?? r.title ?? "", r.publishedDate ?? null);
      if (lead) out.push(lead);
    }
  }
  return out;
}
