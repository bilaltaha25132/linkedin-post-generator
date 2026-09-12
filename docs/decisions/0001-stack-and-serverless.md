# 0001 — Serverless, zero-cost stack

**Status:** accepted

## Context

A personal tool that must run at no server cost, while doing scheduled web
monitoring, LLM work, and vector search. The `mizan` project already proves a
zero-cost pattern; ANTELUS already has a working Firecrawl + LLM pipeline.

## Decision

- Next.js 16 App Router on **Vercel Hobby**; mutations as Server Actions, with
  route handlers only for auth, the cron endpoint, and anything a form posts to.
- **Supabase** (Postgres + pgvector) for storage; single-user, so all access is
  server-side via the service-role key and RLS is on with no policies.
- **GitHub Actions** as the scheduler, hitting a bearer-guarded
  `/api/public/cron/monitor` — Vercel Hobby cron only fires once a day.
- Reuse ANTELUS's **Firecrawl** REST client (v2 search, v1 scrape), ported to
  plain TS without the NestJS/BullMQ/Redis microservice layer.
- Auth is a single **password gate** (signed cookie), not a full auth service —
  it's one user.

## Consequences

- Nothing runs when idle; everything sits inside free tiers.
- Two secret stores to keep in sync: Vercel env vars and GitHub Actions secrets
  (`APP_URL`, `CRON_SECRET`).
- No background job queue: a monitoring pass runs synchronously within the 60s
  function budget. If sources grow enough to exceed that, split the pass per
  source.
