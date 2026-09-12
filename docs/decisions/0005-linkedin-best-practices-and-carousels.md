# 0005 — LinkedIn best-practice tuning + carousels

**Status:** accepted (2026-09-12)

## Context

Researched 2025-26 LinkedIn best practices (Hootsuite, AuthoredUp, Oktopost, Neil
Patel, Buffer, et al.). Two findings materially change the product:

1. **LinkedIn now suppresses AI-slop** (May 2026). Detection is behavioural
   (near-zero dwell, no saves), but flagged writing patterns include the
   **"it's not X, it's Y"** construction — which was in our voice profile. The
   strongest defence is concrete, first-party specifics.
2. **Document/carousel posts win** because each swipe adds dwell time — the
   dominant ranking signal.

## Decision

**Voice/prompt tuning** (`src/lib/voice/profile.ts`, `src/lib/llm/prompts.ts`):
- Hook must pay off within ~140 chars (mobile "see more" cutoff).
- Every post must contain ≥1 concrete first-party specific; never fabricate one.
- Drop the "it's not X, it's Y" construction; vary sentence structure.
- Length 900-1,500 chars; end on one genuine question (no engagement-bait); no
  links in body; exactly 3 relevant hashtags on the last line.

**Carousels** (`src/lib/carousel/*`, `src/components/carousel-studio.tsx`):
- DeepSeek generates 7-9 slides (cover → one-idea body slides → CTA).
- Rendered client-side to a **PDF via jsPDF**, portrait **1080×1350**, vector
  text (crisp), on the Signal Desk palette. User edits slide text inline, then
  downloads and uploads the PDF to LinkedIn as a document post.

## Consequences

- Hashtags now appear (3, end-only) — a deliberate reach trade-off against
  Bilal's pure no-hashtag style; easy to drop by editing the prompt.
- Carousel PDF is generated in the browser (no server/render cost). jsPDF's
  built-in Helvetica keeps files tiny (~5-15KB) and text crisp.
- Best-practice percentages in the research are vendor claims — directional, not
  gospel; posting-time and exact-length guidance left to the user to test.
