<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Signal Desk

Serverless, zero-cost tool: monitor the web (Firecrawl) → score items (LLM) →
draft LinkedIn posts in the owner's voice (LLM + pgvector cohesion). Stack:
Next.js 16 App Router · Supabase (Postgres + pgvector) · Gemini via its
OpenAI-compatible endpoint · GitHub Actions cron · Vercel Hobby.

**Read `docs/` first** — [architecture](docs/architecture.md),
[setup](docs/setup.md), [conventions](docs/conventions.md), and the ADRs in
`docs/decisions/`. Post quality lives in `src/lib/voice/profile.ts` and
`src/lib/llm/prompts.ts`. Data access follows the `queries.ts` / `actions.ts`
split per domain. Model IDs drift — if LLM calls 404/410, update `LLM_*_MODEL`.
