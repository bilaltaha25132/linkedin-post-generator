# Architecture

Signal Desk monitors the web for items worth posting about, then drafts LinkedIn
posts in Bilal's voice, grounded in what he's already written. It's a single-user
tool designed to cost nothing to run.

## The zero-cost stack

| Concern | Choice | Why free |
| --- | --- | --- |
| App + hosting | Next.js 16 (App Router) on **Vercel Hobby** | Free tier |
| Data | **Supabase** Postgres + `pgvector` | Free tier |
| Scheduler | **GitHub Actions** cron → cron endpoint | Free minutes; sidesteps Vercel Hobby's once-a-day cron cap |
| Monitoring | **Hacker News** + **RSS** feeds; **Firecrawl** v2 search/scrape | Feeds are public; Firecrawl free tier, round-robined across two accounts |
| Chat (writing + scoring) | **DeepSeek** `deepseek-chat`, OpenAI-compatible | Cheap ([ADR 0003](decisions/0003-deepseek-for-chat.md)) |
| Embeddings | **Google Gemini** `gemini-embedding-001` @ 1024 dims | Free tier ([ADR 0002](decisions/0002-llm-provider-gemini.md)) |

This mirrors the pattern proven in the `mizan` project.

## Flow

```
GitHub Actions (04:17, 12:17, 20:17 UTC: every 8h, all DeepSeek off-peak)
  └─► GET /api/public/cron/monitor   (Bearer CRON_SECRET, 300s Fluid limit)
        └─ runMonitor()  src/lib/monitor/run.ts
             ├─ every pass, read all feeds (free):
             │    hn      → Hacker News front page, via Algolia (src/lib/feeds/hacker-news.ts)
             │    rss     → RSS/Atom feeds of labs and writers (src/lib/feeds/rss.ts)
             ├─ at most every MONITOR_SEARCH_INTERVAL_HOURS, one rotating source:
             │    search  → Firecrawl v2 /search (news + web), snippets only
             │    url     → one entry, page fetched below
             ├─ drop stale items and stored url_hashes in one query, before any spend
             ├─ interleave sources; take ≤ MONITOR_MAX_ITEMS_PER_SOURCE from each
             └─ per item, two at a time until the budget runs out:
                  ├─ scrape → Firecrawl v1 /scrape, unless the feed carries the article
                  ├─ HN thread + top comments (hn stories carry theirs; others are
                  │  looked up by URL)
                  ├─ relevance gate → DeepSeek → {score, reason, topics, angle, key_numbers, launch}
                  └─ insert into discoveries

Browser (behind password gate, src/proxy.ts)
  ├─ /            Feed — new discoveries, ranked by score
  ├─ /saved       discoveries set aside
  ├─ /rejected    what the monitor kept off the wire: scored under
  │               REJECT_BELOW (45), or dropped before scoring (too old,
  │               unreadable page; logged to `rejections`)
  ├─ /generate/[id]
  │     generateForDiscovery()  src/lib/generate/run.ts
  │       ├─ embed the discovery (query)
  │       ├─ match_voice  → closest samples of Bilal's blog writing (tone)
  │       ├─ match_posts  → similar past posts (dedup warning + cohesion)
  │       ├─ recent posts → "don't repeat these"
  │       ├─ DeepSeek writer → N drafts, one per POST_SHAPE, in parallel
  │       ├─ humanize pass → each draft edited against the AI tells
  │       │  src/lib/voice/tells.ts finds in it (src/lib/voice/humanize.ts)
  │       └─ "Make this take better": reviseForDiscovery() rewrites the
  │          current take from Bilal's note, added as the next take
  │     Carousel Studio (src/lib/carousel + components/carousel-studio.tsx)
  │       └─ DeepSeek → 7-9 slides → editable → jsPDF (1080×1350) download
  ├─ /write       a post he writes himself (discovery_id null)
  │     enhanceDraft()  src/lib/write/run.ts
  │       ├─ DeepSeek writer → a polish + a bolder rewrite
  │       └─ fact-check pass → strips specifics his draft doesn't contain
  │     autosaves to drafts; carousel built from the post body on request
  ├─ /library     drafts + posted; edit / copy / mark posted; every card can
  │               build, regenerate or edit its carousel
  ├─ /posted      only what's been published, newest first
  ├─ /usage       DeepSeek balance (live, /user/balance) + token usage;
  │               Firecrawl credits left per key (live, /v2/team/credit-usage)
  └─ /sources     manage what the monitor watches

After each scan the cron also emails a digest of top new items
(src/lib/notify, via Resend) and marks them notified so none repeat.
Post/carousel voice follows 2025-26 LinkedIn best practice — see
[ADR 0005](decisions/0005-linkedin-best-practices-and-carousels.md).
```

### Carousel design

The deck follows the EdgeFirm site. Every heading is a black lead with a grey
continuation on its own line ("Four rules, / on every engagement."): a
`[bracketed]` phrase is the grey part, and headings without brackets are split
at their first clause break (`src/lib/carousel/heading.ts`). Content slides sit
on warm paper `#f0eeea`; the cover and closing slide are black. All colours and
type sizes live in `src/lib/carousel/design.ts`, shared by the PDF renderer and
the on-screen preview (`components/slide-card.tsx`) so they can't drift.

**The font is Season Sans, and it is not in this repo.** Its Displaay licence
forbids redistributing, modifying, or publicly hosting the file. It lives in a
private Supabase bucket (`scripts/upload-brand-font.mjs`) and reaches the
browser only through `/api/brand-font`, which the proxy restricts to signed-in
sessions. Because converting it to TrueType would modify it, `pdf.ts` draws each
slide to a 2× canvas with the browser's copy of the font and places the pages in
the PDF as images. Without the uploaded font, slides fall back to Inter Tight.

### Firecrawl credits

Search is 2 credits per 10 results and `limit` applies **per source**, so
`news + web` returns double. Scraping adds a credit per page. The monitor
therefore searches without `scrapeOptions` (snippets only) and pays for a scrape
exactly once per *new* URL — re-runs cost nothing for stories already stored.
Keys are round-robined and fall back on the other when one returns 402.
Social and video hosts (`EXCLUDED_HOSTS` in `src/lib/monitor/run.ts`) are
excluded from every search — they scored worst and are reactions to a story,
not the story.

### Where the wire comes from

Feeds are the primary source and search is the supplement. Generic web search
turned out to be the wrong tool for "what's new": it returned homepages, section
indexes and listicles, and general-interest queries averaged under 30. Feeds
are current to the hour, cost nothing to read, and a feed that carries the full
article (Latent Space, The Verge, Pragmatic Engineer) costs no scrape either.

Hacker News does double duty. Its front page is what engineers are arguing about
right now, and any story, from any source, that has an HN thread with traction
gets the thread's points, comment count and top comments attached. The relevance
gate reads them as a timeliness signal, the draft page shows them under "What
people are saying", and the writer may engage with the debate but may not treat
a comment as fact. Reddit rate-limits comment feeds (HTTP 429), so r/LocalLLaMA
contributes posts but no comments.

`key_numbers` are the hard figures the relevance gate pulls from the article
(benchmark results, prices, context sizes), shown on the wire and the draft
page. Thread stats and publication dates are excluded by the prompt.

`is_launch` marks a story that announces a newly released AI model, product or
tool. Launches get a "New release" tag and filter on the wire, and lead the email
digest at a lower score bar (55), so a release reaches Bilal by the next pass.

Search sources rotate one per pass, so the number of them sets how often each is
revisited. Keep that list short and specific.

### DeepSeek off-peak

DeepSeek bills double during peak: 01:00-04:00 and 06:00-10:00 UTC, weekdays
(`src/lib/llm/peak.ts`). Scoring every new story is most of the spend, so the
scheduled scans sit off-peak, and the cron route skips a pass that GitHub starts
late into peak (`?force=1` overrides); stories stay in their feeds for the next
one. Drafting is on demand and can't be moved, so the nav shows a notice during
peak with when it ends, and Bilal decides whether to wait.

### Why drafts don't read as AI

Each draft is written in English, one per `POST_SHAPE` so the three drafts
don't share the same arc. `VOICE_RULES` in `src/lib/voice/profile.ts` describe
how people actually write (plain words, contractions, uneven rhythm, real
doubt) and forbid inventing facts or his experience. `aiTells()` names the
patterns that give a post away (summary lines, "the real X", the "it's not
X, it's Y" turn, invented "in my experience" claims); the humanize edit fixes
the ones a draft contains, and an edit that comes back worse is discarded.

Tried and dropped (2026-10): writing in Urdu and translating to English. It
fooled AI detectors (GPTZero 100% human, where English-first drafts score
100% AI) but the English came out clumsy, and the goal is posts that read
well, not detector scores. His published LinkedIn posts were partly
AI-assisted, so they aren't used as a voice reference anywhere.

## Layers

- `src/lib/<domain>/` — `queries.ts` (reads, `server-only`), `actions.ts` (`"use server"` mutations). Mirrors mizan.
- `src/lib/firecrawl/`, `src/lib/llm/` — framework-free clients ported from ANTELUS.
- `src/lib/voice/profile.ts` — the always-on voice + interest profile fed into every prompt. The single lever for post quality.
- `src/components/` — UI by concern; the design system lives in `src/app/globals.css` ("The Signal Desk").

## Data model

See `supabase/migrations/0001_init.sql`. Tables: `sources`, `discoveries`,
`posts`, `voice_corpus` (all with a 1024-dim `embedding`), plus `rejections` and
`usage_events`. RLS is on with no
policies — only the server-side service-role key can read/write. Similarity
lookups go through the `match_posts` / `match_voice` SQL functions.

### What counts as rejected

Every story that gets scored is stored. Below `REJECT_BELOW` (45, the relevance
prompt's LOW band) it stays off the wire and shows on `/rejected` with the
scorer's reason, and can still be drafted from there. Stories dropped before
scoring go to the `rejections` table: search and page results older than
`MONITOR_ARTICLE_MAX_AGE_DAYS`, and any story whose page had no readable text.
Feeds' old entries aren't logged, since every RSS feed carries its back
catalogue and would repeat them each pass. Duplicates aren't logged either.

## Not yet built

- Discussion is captured once, at ingest. A thread that grows afterwards isn't
  refreshed.
- Post quality depends on the voice corpus being populated — run
  `scripts/import-voice.mjs` (see [setup](setup.md)).
