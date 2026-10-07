# Signal Desk — docs

A serverless, zero-cost personal tool: monitor the web for post-worthy tech news,
then draft LinkedIn posts in Bilal's own voice, grounded in what he's already written.

- **[architecture.md](architecture.md)** — how it fits together, the stack, the data model, the monitor → generate flow.
- **[setup.md](setup.md)** — install, Supabase, voice import, run, deploy, schedule. Start here.
- **[conventions.md](conventions.md)** — code patterns to follow.
- **[decisions/](decisions/)** — why the stack is what it is, and why Gemini.
- **[growth/](growth/README.md)** — the growth-partner plan: Jobs, Leads, Engage, Strategist, profile and network, with the research behind it. Planned, not built.

Quick map: app routes in `src/app/`, domain logic in `src/lib/<domain>/`, ported
engine in `src/lib/firecrawl` + `src/lib/llm`, voice in `src/lib/voice/profile.ts`,
schema in `supabase/migrations/`, scheduler in `.github/workflows/monitor.yml`.
