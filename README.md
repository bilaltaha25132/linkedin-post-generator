# Signal Desk

A serverless, zero-cost personal tool that watches the web for post-worthy tech
news and drafts LinkedIn posts in your own voice — grounded in what you've
already written, so your feed stays cohesive and doesn't repeat itself.

- **Monitor:** Firecrawl searches your topics; a fast LLM scores each item for how
  strong a post you could write from it.
- **Write:** a stronger LLM drafts posts imitating your real writing (portfolio
  blog + case studies + past posts), checked against what you've posted before.
- **Runs free:** Next.js on Vercel Hobby + Supabase + GitHub Actions cron. No
  always-on server.

## Quick start

```
npm install
# fill SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local, run the SQL,
# then load your voice:
node --env-file=.env.local scripts/import-voice.mjs
npm run dev
```

Full walkthrough — Supabase, deploy, scheduling — in **[docs/setup.md](docs/setup.md)**.
Architecture and design decisions in **[docs/](docs/README.md)**.
