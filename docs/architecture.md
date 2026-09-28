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
| Monitoring | **Firecrawl** v2 search/scrape | Free tier, round-robined across two accounts |
| Chat (writing + scoring) | **DeepSeek** `deepseek-chat`, OpenAI-compatible | Cheap ([ADR 0003](decisions/0003-deepseek-for-chat.md)) |
| Embeddings | **Google Gemini** `gemini-embedding-001` @ 1024 dims | Free tier ([ADR 0002](decisions/0002-llm-provider-gemini.md)) |

This mirrors the pattern proven in the `mizan` project.

## Flow

```
GitHub Actions (every 6h)
  └─► GET /api/public/cron/monitor   (Bearer CRON_SECRET)
        └─ runMonitor()  src/lib/monitor/run.ts
             ├─ for each enabled source (sources table):
             │    search  → Firecrawl v2 /search (news + web), snippets only
             │    url     → one entry, page fetched below
             ├─ dedup by url_hash (src/lib/dedup/url-hash.ts)
             ├─ scrape the page → Firecrawl v1 /scrape, only for new URLs
             ├─ drop items older than MONITOR_ARTICLE_MAX_AGE_DAYS
             ├─ relevance gate  → DeepSeek → {score, reason, topics, angle}
             ├─ embed (Gemini, 1024-dim)
             └─ insert into discoveries

Browser (behind password gate, src/proxy.ts)
  ├─ /            Feed — new discoveries, ranked by score
  ├─ /saved       discoveries set aside
  ├─ /generate/[id]
  │     generateForDiscovery()  src/lib/generate/run.ts
  │       ├─ embed the discovery (query)
  │       ├─ match_voice  → closest samples of Bilal's real writing
  │       ├─ match_posts  → similar past posts (dedup warning + cohesion)
  │       ├─ recent posts → "don't repeat these"
  │       └─ DeepSeek writer → N distinct drafts
  │     Carousel Studio (src/lib/carousel + components/carousel-studio.tsx)
  │       └─ DeepSeek → 7-9 slides → editable → jsPDF (1080×1350) download
  ├─ /write       a post he writes himself (discovery_id null)
  │     enhanceDraft()  src/lib/write/run.ts
  │       ├─ DeepSeek writer → a polish + a bolder rewrite
  │       └─ fact-check pass → strips specifics his draft doesn't contain
  │     autosaves to drafts; carousel built from the post body on request
  ├─ /library     drafts + posted; edit / copy / mark posted; every card can
  │               build, regenerate or edit its carousel
  ├─ /usage       DeepSeek token usage + est. cost
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

A pass only gets through one or two sources inside the time budget, so the
number of enabled sources sets how often each is revisited, not the credit
spend. Keep the list short so each topic is checked every day or two.

## Layers

- `src/lib/<domain>/` — `queries.ts` (reads, `server-only`), `actions.ts` (`"use server"` mutations). Mirrors mizan.
- `src/lib/firecrawl/`, `src/lib/llm/` — framework-free clients ported from ANTELUS.
- `src/lib/voice/profile.ts` — the always-on voice + interest profile fed into every prompt. The single lever for post quality.
- `src/components/` — UI by concern; the design system lives in `src/app/globals.css` ("The Signal Desk").

## Data model

See `supabase/migrations/0001_init.sql`. Tables: `sources`, `discoveries`,
`posts`, `voice_corpus` (all with a 1024-dim `embedding`). RLS is on with no
policies — only the server-side service-role key can read/write. Similarity
lookups go through the `match_posts` / `match_voice` SQL functions.

## Not yet built

- RSS sources: the `sources.kind = 'rss'` value is accepted and stored but not
  ingested (`hitsForSource` returns `[]` for it). Needs a feed parser.
- Post quality depends on the voice corpus being populated — run
  `scripts/import-voice.mjs` (see [setup](setup.md)).
