# Conventions

- **Language:** TypeScript, strict. Import alias `@/*` → `src/*`.
- **Data access:** reads in `src/lib/<domain>/queries.ts` (marked `server-only`);
  mutations in `src/lib/<domain>/actions.ts` (`"use server"`, call
  `revalidatePath`). Never import a `queries.ts` into a client component.
- **Secrets:** only ever read via `src/lib/env.ts` getters (they throw with a
  clear message when missing). The Supabase service-role client
  (`src/lib/supabase/server.ts`) is server-only — never ship it to the browser.
- **Styling:** one design system in `src/app/globals.css` using CSS variables
  (light + dark). Prefer the semantic classes (`.btn`, `.panel`, `.wire-row`,
  `.field`, `.chip`) over ad-hoc utilities; keep the cobalt accent for signal and
  active states only.
- **LLM calls:** go through `src/lib/llm/client.ts`. Use `role: "writer"` for
  drafting, `"utility"` for high-volume filtering. `chatJSON` validates against a
  zod schema and rerolls once on bad JSON — always give it a schema.
- **Embeddings:** 1024 dims (pgvector HNSW caps at 2000). Similarity search goes
  through the `match_*` SQL functions, never raw vector SQL from the client.
- **Comments:** explain *why*, not *what*. Match the surrounding density.
- **Adding a monitored source type:** extend `hitsForSource` in
  `src/lib/monitor/run.ts` and the `kind` check in `0001_init.sql`.
