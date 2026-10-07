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
| Monitoring | **Hacker News**, **RSS** feeds, **Hugging Face** papers + models; **Firecrawl** v2 search/scrape | Feeds and Hugging Face are public; Firecrawl free tier, round-robined across two accounts |
| Chat (writing + scoring) | **DeepSeek** `deepseek-chat`, OpenAI-compatible | Cheap ([ADR 0003](decisions/0003-deepseek-for-chat.md)) |
| Embeddings | **Google Gemini** `gemini-embedding-001` @ 1024 dims | Free tier ([ADR 0002](decisions/0002-llm-provider-gemini.md)) |

This mirrors the pattern proven in the `mizan` project.

## Flow

```
GitHub Actions: light pass hourly (:47), full pass 04:17 UTC (DeepSeek off-peak)
  └─► GET /api/public/cron/monitor[?mode=light]   (Bearer CRON_SECRET, 300s Fluid limit)
        └─ runMonitor({ mode })  src/lib/monitor/run.ts
             ├─ every pass, read all feeds (free):
             │    hn      → Hacker News front page, via Algolia (src/lib/feeds/hacker-news.ts)
             │    rss     → RSS/Atom feeds of labs, newsrooms, writers (src/lib/feeds/rss.ts)
             │    papers  → Hugging Face Daily Papers, by upvotes (src/lib/feeds/papers.ts)
             │    models  → new trending Hugging Face models + card (src/lib/feeds/models.ts)
             ├─ full passes only, at most every MONITOR_SEARCH_INTERVAL_HOURS, one rotating source:
             │    search  → Firecrawl v2 /search (news + web), snippets only
             │    url     → one entry, page fetched below
             ├─ drop stale items and stored url_hashes in one query, before any spend
             ├─ interleave sources; take ≤ MONITOR_MAX_ITEMS_PER_SOURCE from each
             └─ per item, two at a time until the budget runs out:
                  ├─ fetch  → plain HTTP fetch of the page (src/lib/feeds/page.ts), free;
                  │           arXiv papers read their full text from arxiv.org/html
                  ├─ scrape → Firecrawl v1 /scrape, full passes only, when the feed
                  │           and the free fetch both came back thin
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
  │               build, regenerate or edit its carousel, and Publish it
  │     Publish (src/lib/publish, components/post-card.tsx), one confirm per post:
  │       ├─ carousel: jsPDF in the browser → signed upload to the private
  │       │  `outbox` bucket (Vercel caps request bodies at 4.5 MB) → server
  │       │  sends it to LinkedIn's Documents API, then deletes it
  │       ├─ POST /rest/posts as the member, commentary escaped for LinkedIn's
  │       │  "little" format (toCommentary), blank lines kept (forLinkedIn)
  │       └─ stores the share URN (posts.linkedin_urn) and marks it posted
  ├─ /posted      only what's been published, newest first
  ├─ /usage       DeepSeek balance (live, /user/balance) + token usage;
  │               Firecrawl credits left per key (live, /v2/team/credit-usage)
  ├─ /sources     manage what the monitor watches
  └─ /settings    LinkedIn connection: /api/linkedin/connect → LinkedIn consent →
                  /api/linkedin/callback (state cookie check, token exchange,
                  AES-GCM sealed with TOKEN_ENCRYPTION_KEY into `linkedin_auth`).
                  Tokens last 60 days with no refresh; every page shows a
                  reconnect notice in the last 5 days.

After every scan the cron emails each breaking story on its own (score 80+, or a
launch at 75+, found in the last 12 hours; at most 3 a pass), so Bilal can post
first. The full daily pass also emails a digest of the rest above
NOTIFY_MIN_SCORE. Both go through Resend (src/lib/notify) and mark what they
send notified, so nothing repeats.
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
the on-screen preview (`components/slide-card.tsx`) so they can't drift. The
author name sits alone in the top corner; the green square beside it was dropped
at Bilal's request (2026-10).

A deck shows the source's own figures when it has any. `sourceFigures`
(`src/lib/feeds/figures.ts`) reads an arXiv paper's figures and captions from
its HTML edition, a Hugging Face model card's images from its README, and any
other page's article images, described by figcaption, alt text, the heading and
paragraph above them and the file name. News publishers (`NO_FIGURE_HOSTS`)
get none: their images are licensed photos, not the source's own work. The
writer sees the descriptions, tags 2 or 3 body slides with `FIGURE: n` (or none
if nothing fits), and the figure is stored on the slide (`Slide.figure`, with a
`credit` such as "Figure 3 from the paper" or "From mistral.ai"). Those slides
set the heading smaller, put the figure on a white panel sized to it, and print
the credit under it. arXiv serves figures with an open CORS header, so the
canvas draws them directly; every other figure loads through `/api/figure`, a
signed-in-only relay that fetches public https images (no private hosts, no
SVG, 10 MB cap) so the canvas sees them as same-origin and can export the PDF.
A figure that fails to load leaves an ordinary text slide, and the slide editor
can remove one.

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

### Light and full passes

Being first on a story matters more than reading every corner of the web, so
the free sources are read every hour ("light" passes: feeds, HN, papers,
models, and the free page fetch) and Firecrawl runs once a day ("full" pass:
rotating searches, plus a scrape when the free fetch can't read a page). The
"Scan now" button runs a light pass, so pressing it never spends credits.
Light passes run in DeepSeek's peak hours too; only the full pass is held back.

### Research papers and new models

`papers` reads Hugging Face Daily Papers for today and yesterday and keeps the
ones above the source's minimum upvotes; a paper is dated by the day it is on
the list, since a day's list carries papers first submitted days earlier.
`models` keeps models under a week old that are trending on Hugging Face,
skipping quantisations and fine-tune re-uploads, and is dated when it is seen
trending. A paper's draft is written from its full text (up to 12k chars) with
its own shapes (`PAPER_SHAPES` in `src/lib/llm/prompts.ts`), where a short list
of headline results is allowed, and every take on a paper ends with
"Paper: <arXiv link>" above the hashtags (`withPaperLink`, `src/lib/papers.ts`).
That is the one exception to the no-links rule.

The `sources_kind_check` constraint is defined only in the newest migration that
adds a kind (currently 0018). `db:migrate` re-runs every file, so an older file
that re-added an older list would reject newer rows.

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

The wire's "From" filter groups items by where they came from
(`originOf` in `src/lib/discoveries/origin.ts`): research and papers (the
papers source, any arXiv link wherever it was found, and research feeds such as
METR), new open models, news and blogs, Hacker News, and web search.

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

### Jobs

`/jobs` is a second pipeline beside the wire, in `src/lib/jobs/`. GitHub
Actions (`.github/workflows/jobs.yml`) calls `/api/public/cron/jobs` hourly;
`runJobs` in `run.ts` does one budgeted pass:

1. **Pull** the sources that are due (`job_sources`, about 70 rows): company
   ATS boards every 6 hours, job boards on their own intervals
   (`INTERVAL_HOURS` in `sources.ts`). Every puller reads a public JSON, RSS or
   XML feed; nothing scrapes a logged-in page.
2. **Filter for free** (`classify.ts`): the title must look like AI or
   full-stack engineering, nationals-only and US-only roles are dropped, and
   region, remote scope, contract and a visa keyword flag are set from text.
3. **Dedup** on company, title and remote scope. A company's own board
   supersedes a job board's copy of the same role.
4. **Close** a role after it is missing from two complete pulls of its board,
   and job-board roles after 30 days.
5. **Score** the backlog with the utility model (`score.ts`), regions in the
   owner's order so Saudi roles are scored first. The model returns
   sub-scores; the weights, region bonus and hard caps are applied in code.
6. **Alert** by email on each new role at `JOBS_ALERT_MIN_SCORE` or above, and
   send a daily digest of roles at `JOBS_DIGEST_MIN_SCORE` or above
   (`notify.ts`).

The profile it scores against is the single `job_profile` row, edited on
`/settings`. New company boards are added from the Boards panel on `/jobs` by
pasting a careers URL; the ATS is detected and test-pulled before saving.

## Layers

- `src/lib/<domain>/` — `queries.ts` (reads, `server-only`), `actions.ts` (`"use server"` mutations). Mirrors mizan.
- `src/lib/firecrawl/`, `src/lib/llm/` — framework-free clients ported from ANTELUS.
- `src/lib/voice/profile.ts` — the always-on voice + interest profile fed into every prompt. The single lever for post quality.
- `src/components/` — UI by concern; the design system lives in `src/app/globals.css` ("The Signal Desk").

## Data model

See `supabase/migrations/0001_init.sql`. Tables: `sources`, `discoveries`,
`posts`, `voice_corpus` (all with a 1024-dim `embedding`), plus `rejections` and
`usage_events`, and for jobs `job_sources`, `job_profile` and `jobs`
(`0020_jobs.sql`). RLS is on with no
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

- Jobs don't use embeddings yet; every candidate role costs one utility-model
  call. Enterprise ATS (Workday, Oracle, SuccessFactors), Sabbar, the
  Bundesagentur API, Google Jobs and Adzuna aren't pulled.

- Discussion is captured once, at ingest. A thread that grows afterwards isn't
  refreshed.
- Post quality depends on the voice corpus being populated — run
  `scripts/import-voice.mjs` (see [setup](setup.md)).
