# Leads tab

People and companies who want an AI engineer: founders posting "looking for
someone to build our agent", contract roles, freelance gigs, LinkedIn hiring
posts. Different from Jobs: the goal is a conversation, not an application.

Research: [research/engage-and-discovery.md](research/engage-and-discovery.md)
(search APIs, freshness tests) and
[research/jobs-and-leads-sources.md](research/jobs-and-leads-sources.md)
(Reddit, HN, Freelancer.com).

## Lead kinds

| Kind | Example | Where from |
|---|---|---|
| `hiring_post` | "We're hiring a founding AI engineer, DM me" on LinkedIn | search APIs over LinkedIn post URLs |
| `client_post` | "Looking for a freelancer to build a RAG chatbot for our docs" | LinkedIn via search, Reddit r/forhire / r/hiring, HN freelancer thread, Bluesky |
| `gig` | Freelancer.com project with a $2k budget | Freelancer.com public API |
| `contract_role` | Contract role on a company's Ashby/Greenhouse/Lever board | the Jobs pipeline, cross-posted |

## Finding LinkedIn hiring and client posts without scraping LinkedIn

Search engines index public LinkedIn posts, so search APIs return them with a
snippet. We use the URL and snippet only and never fetch the result.

**The catch, measured during research:** indexes lag. Test searches mostly
surfaced posts weeks to months old; an August 2026 study found the median
ranking LinkedIn post in Google was 300 days old. That makes search useless for
"comment in the first hour" but fine for leads, where a 1-7 day old hiring post
is still very much open. The URL timestamp (see
[data-and-rules.md](data-and-rules.md#a-post-url-carries-its-own-timestamp))
drops anything older than 14 days before any LLM call.

| Provider | Free | Freshness filter | Use |
|---|---|---|---|
| **Tavily** | 1,000 credits a month, recurring, no card | `time_range=day/week`, `include_domains: ["linkedin.com"]` | Main lane: ~8 queries × 3 runs a day = 720/month |
| **Exa** | $10/month recurring credit (+$20 at signup) | `startPublishedDate`, `includeDomains: ["linkedin.com/posts"]` | Semantic queries ("founder looking for a contractor to build an AI agent"), 2-3 a day |
| SerpApi | 250 a month | Google `tbs=qdr:d` | Backup, shared with Jobs' Google Jobs budget |
| Firecrawl search | spends the wire's credits | `tbs=qdr:d` (past day) | Optional bonus lane for `site:linkedin.com/posts` on hot topics, if credits allow |
| Brave, Bing, Google CSE | no free tier / retired / closing Jan 2027 | | Not used |

Query templates (rotated, tuned from results):

- `"hiring" "AI engineer" (LangGraph OR RAG OR agents)`
- `"looking for" ("AI developer" OR "AI engineer") (freelance OR contract OR consultant)`
- `"we're hiring" LLM remote`
- `"need help" building "AI agent"`
- `"founding AI engineer"`
- Region variants: `Dubai`, `UAE`, `"remote" "Pakistan"`, `EMEA contract`, `UK`.

Runs 3 times a day (`/api/public/cron/leads`), not hourly: the indexes do not
move faster than that.

### The fresh lane: searches he opens

The search APIs are days behind. LinkedIn's own post search isn't, and a link
he clicks is him browsing. The Leads tab keeps a short panel of saved searches,
each a LinkedIn content-search URL with `datePosted` and `sortBy` set
(templates in [unlocks.md](unlocks.md#2-deep-links)):

| Search | Keywords | Window |
|---|---|---|
| Hiring posts | `("hiring" OR "we're hiring" OR "join our team") AND ("AI engineer" OR "LLM engineer" OR "GenAI engineer")` | past 24h, latest |
| Client posts | `("looking for" OR "need" OR "recommend") AND ("freelance" OR "contract" OR "consultant") AND ("AI developer" OR "AI agent" OR "LLM" OR "chatbot")` | past week, latest |
| Founders asking | `("looking for" OR "anyone know") AND ("AI engineer" OR "AI developer")`, author title "founder" | past week, latest |
| Job-tagged posts | `"AI engineer"`, content type "jobs" | past 24h |
| Region variants | each of the above with `Dubai`, `UAE`, `UK`, `Pakistan` | as above |

Each row shows when he last opened it. Anything worth following up he shares
back in (same share target as Engage), and it becomes a lead with the
classifier below. LinkedIn has no saved-search alerts for posts, so these
stored links are the saved searches.

## Other lead sources

- **Reddit** via a free OAuth "script" app (unauthenticated JSON returns 403
  since May 2026): r/forhire (flair Hiring), r/hiring, r/LocalLLaMA, r/SaaS,
  r/startups, keyword searches (AI engineer, LLM, RAG, agent, chatbot). Hourly.
- **HN "Freelancer? Seeking freelancer?"** monthly thread, daily during the
  first week. Small but high quality.
- **Freelancer.com** `projects/active` (no auth for reads) with queries llm,
  rag, langchain, ai agent, chatbot; dropped below $500 or $25/h equivalent.
- **Bluesky** `searchPosts` (no auth for page 1): optional, mostly job bots, so
  the classifier has to reject bots.
- **Contract roles** from the Jobs pipeline.
- Upwork, Contra, Toptal, Arc, Braintrust: no public feed. Their own email
  alerts; later, a forwarded Gmail label parser.

## Classify and score

One DeepSeek call per new item (cached by URL or activity ID):

```json
{ "kind": "hiring_post|client_post|gig|contract_role|noise",
  "who": "founder|hiring manager|recruiter|agency|bot|unknown",
  "wants": "one line: what they want built or who they want",
  "stack": ["RAG", "Next.js"],
  "remote": "yes|no|unclear", "region": "UAE",
  "budget": "USD 3-5k | USD 40/h | unknown",
  "score": 0-100,
  "why": "one plain sentence",
  "opener": "a two-sentence reply or DM Bilal could send, in his voice" }
```

Scoring favours: a real person (founder or hiring manager) over a recruiter
over an agency; work that matches his shipped projects (RAG, agents,
full-stack AI products); remote or UAE/UK; a stated budget over $1k or $40/h;
freshness. Bots, AI-training/annotation gigs, unpaid trials and "equity only"
score under 30.

## The tab

- Grouped by kind, sorted by score then age. Filters: kind, region, age, score.
- Each card: who (name/handle and role when the snippet shows it), what they
  want, age ("posted 2 days ago", from the URL timestamp), stack chips, budget,
  score ring, why, source.
- Buttons: **Open** (the original post, in his browser), **Draft reply**
  (comment or DM opener in his voice, editable, see [engage.md](engage.md) for
  the rubric), **Pipeline** (New → Contacted → Talking → Won / Lost), **Hide**.
- A lead marked Contacted asks "when should I nudge you?" and resurfaces after
  5-7 days if nothing changed.
- 80+ leads join the instant alert email.

## Done when

- A week of Tavily/Exa runs stays inside the free budgets.
- At least 5 genuine, under-14-day client or hiring posts a week reach the tab
  (judged with Bilal).
- Noise in the 60+ band under 1 in 4.
