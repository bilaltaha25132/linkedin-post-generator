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
| Monitoring | **Firecrawl** v2 search/scrape | Existing key |
| Chat (writing + scoring) | **DeepSeek** `deepseek-chat`, OpenAI-compatible | Cheap ([ADR 0003](decisions/0003-deepseek-for-chat.md)) |
| Embeddings | **Google Gemini** `gemini-embedding-001` @ 1024 dims | Free tier ([ADR 0002](decisions/0002-llm-provider-gemini.md)) |

This mirrors the pattern proven in the `mizan` project.

## Flow

```
GitHub Actions (every 6h)
  └─► GET /api/public/cron/monitor   (Bearer CRON_SECRET)
        └─ runMonitor()  src/lib/monitor/run.ts
             ├─ for each enabled source (sources table):
             │    search  → Firecrawl v2 /search (news + web)
             │    url     → Firecrawl v1 /scrape
             ├─ dedup by url_hash (src/lib/dedup/url-hash.ts)
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
  ├─ /library     drafts + posted; edit / copy / mark posted
  └─ /sources     manage what the monitor watches
```

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
