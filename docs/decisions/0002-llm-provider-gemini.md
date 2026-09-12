# 0002 — LLM provider: Gemini, not the ANTELUS NVIDIA key

**Status:** partly superseded by [0003](0003-deepseek-for-chat.md) — chat moved to
DeepSeek; the Gemini **embeddings** decision here still stands. (2026-09-11)

## Context

The plan was to reuse ANTELUS's NVIDIA-hosted LLM key (OpenAI-compatible,
`meta/llama-3.x`). Live testing during the build showed the key can list the
model catalogue but returns **403 "Authorization failed"** on every currently
served chat and embedding model, and **410 Gone** on the retired model it was
configured for. The key no longer has working model access (entitlement/credits
lapsed). Firecrawl's key, tested the same way, works fine.

## Decision

Use **Google Gemini** via its OpenAI-compatible endpoint
(`https://generativelanguage.googleapis.com/v1beta/openai`), reusing the working
key from the `mizan` project. It's on Google's free tier and a stronger writer
than the Llama option — directly serving the "non-slop posts" goal.

- Writer: `gemini-3.6-flash` (free; ~40s/generation with thinking — the app
  generates all variants in one call and shows a loading state).
- Utility / relevance gate: `gemini-flash-lite-latest` (sub-second).
- Embeddings: `gemini-embedding-001` at 1024 dims (Matryoshka truncation, since
  pgvector's HNSW index caps at 2000 dims; the model's 3072 default can't be
  indexed).

Because it's the OpenAI-compatible endpoint, the ANTELUS-ported client only
needed a base URL + model swap; `input_type` (an NVIDIA extension) was dropped in
favour of the standard `dimensions` param.

## Consequences

- `gemini-3.1-pro-preview` returns 429 on the free tier (pro isn't free); flash
  is the ceiling for free writing. Good enough — quality is strong.
- Model IDs drift and get retired (that's what broke NVIDIA). If calls start
  404/410-ing, list models via the API and update `LLM_*_MODEL` in the env.
