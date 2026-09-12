# 0003 — DeepSeek for chat, Gemini for embeddings

**Status:** accepted (2026-09-12), supersedes the chat half of [0002](0002-llm-provider-gemini.md)

## Context

The owner wants a popular, inexpensive, high-quality model for the writing and
scoring. DeepSeek's `deepseek-chat` (V3) fits: cheap, strong prose, OpenAI-compatible.

DeepSeek's API only serves chat models (`deepseek-chat`, `deepseek-reasoner`) —
**there is no embeddings endpoint**. The cohesion features need embeddings, so a
single provider can't cover both.

## Decision

- **Chat (writer + utility) → DeepSeek** `deepseek-chat` at `https://api.deepseek.com`.
  Non-thinking, so no `reasoning_effort` and fast by default. Temperature 1.3 for
  the writer (DeepSeek's scale runs hotter; ~1.3 is its creative sweet spot).
- **Embeddings → Gemini** `gemini-embedding-001` @ 1024 dims, on its own
  `EMBEDDING_API_KEY` / `EMBEDDING_BASE_URL` (the free key from mizan), fully
  decoupled from the chat provider in `src/lib/env.ts`.

## Consequences

- Two LLM-side providers now: a DeepSeek key (`LLM_API_KEY`) and a Gemini key
  (`EMBEDDING_API_KEY`). Both go in `.env.local` and, on deploy, Vercel env vars.
- Swapping the chat provider later is a base-URL + model + key change only, since
  everything goes through the OpenAI-compatible `src/lib/llm/client.ts`.
- `deepseek-chat` max output is 8192 tokens; generation is capped at 8000.
