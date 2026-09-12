import { z } from "zod";

import { AUTHOR_BIO, INTEREST_PROFILE, VOICE_RULES } from "@/lib/voice/profile";
import type { ChatOptions } from "@/lib/llm/client";

// --- Relevance gate (utility model) --------------------------------------------

export const relevanceSchema = z.object({
  score: z.number().min(0).max(100),
  reason: z.string(),
  topics: z.array(z.string()).max(6).default([]),
  angle: z.string(),
});
export type Relevance = z.infer<typeof relevanceSchema>;

export interface RelevanceInput {
  title: string;
  snippet: string;
  content: string;
}

export function buildRelevancePrompt(item: RelevanceInput): ChatOptions {
  const system = `You score how worth-posting-about a news/article item is for one specific person's LinkedIn.

${AUTHOR_BIO}

${INTEREST_PROFILE}

Score 0-100: how strong a LinkedIn post could Bilal write from this, given his audience and angle. Reserve 80+ for items he can add a genuine from-the-trenches or contrarian take to. Score generic hype, pure funding/consumer news, and things he could only restate (not reframe) below 40.

Return ONLY this JSON, no prose:
{"score": <int 0-100>, "reason": "<one sentence>", "topics": ["<tag>", ...], "angle": "<one-line suggested angle for his post>"}`;

  const user = `TITLE: ${item.title}
SNIPPET: ${item.snippet}
CONTENT (may be truncated):
${item.content.slice(0, 6000)}`;

  return { system, user, role: "utility", temperature: 0.1, maxTokens: 700, op: "relevance" };
}

// --- Post generation (writer model) --------------------------------------------

// Posts are multi-paragraph, so we separate variants with a delimiter rather
// than JSON — unescaped newlines inside JSON strings parse unreliably.
export const VARIANT_DELIMITER = "===|POST|===";

/** Split a delimiter-separated generation into clean post strings. */
export function parseVariants(text: string): string[] {
  return text
    .split(VARIANT_DELIMITER)
    .map((v) => v.replace(/^```+\w*|```+$/g, "").trim())
    .filter((v) => v.length > 0);
}

export interface GenerationInput {
  discovery: { title: string; url: string; content: string; angle?: string | null };
  /** Retrieved samples of Bilal's real writing, closest to this topic. */
  voiceSamples: { title: string | null; content: string }[];
  /** Recent posts, so the draft builds on them and doesn't repeat. */
  recentPosts: string[];
  count: number;
  /** Optional extra steer from the user (a specific take/tone for this post). */
  guidance?: string;
}

export function buildGenerationPrompt(input: GenerationInput): ChatOptions {
  const samples = input.voiceSamples
    .map((s, i) => `--- SAMPLE ${i + 1}${s.title ? ` (${s.title})` : ""} ---\n${s.content.slice(0, 1800)}`)
    .join("\n\n");

  const recent = input.recentPosts.length
    ? input.recentPosts.map((p, i) => `- Post ${i + 1}: ${p.slice(0, 400)}`).join("\n")
    : "(none yet)";

  const system = `You are a ghostwriter who writes indistinguishably as Bilal. You never produce generic "Linkedin AI" slop.

${AUTHOR_BIO}

${VOICE_RULES}

You will be given samples of Bilal's ACTUAL writing — imitate their rhythm, diction, and structure, not any other style. You will also be given his recent posts: do not repeat their topic or their opening move; build a distinct post.

Generate ${input.count} DISTINCT post variants, each a complete standalone LinkedIn post grounded in the source item below. Vary the angle/hook across variants.

Output the posts separated by a line containing exactly ${VARIANT_DELIMITER} and nothing else. No numbering, no preamble, no markdown fences — just the posts and the delimiters between them.`;

  const user = `SOURCE ITEM
Title: ${input.discovery.title}
URL: ${input.discovery.url}
${input.discovery.angle ? `Suggested angle: ${input.discovery.angle}\n` : ""}Content (may be truncated):
${input.discovery.content.slice(0, 5000)}

${input.guidance ? `EXTRA STEER FROM BILAL: ${input.guidance}\n\n` : ""}BILAL'S REAL WRITING (imitate this voice):
${samples || "(no samples available — rely on the voice rules above)"}

HIS RECENT POSTS (do not repeat these topics or openings):
${recent}`;

  // DeepSeek's temperature scale runs hotter than most; ~1.3 is its sweet spot
  // for engaging prose without drifting incoherent.
  return { system, user, role: "writer", temperature: 1.3, maxTokens: 8000, op: "generate" };
}

// --- Carousel generation (writer model) ----------------------------------------

export const SLIDE_DELIMITER = "===|SLIDE|===";

export interface Slide {
  heading: string;
  body: string;
}

/** Parse a delimiter-separated carousel into slides (first line = heading). */
export function parseCarousel(text: string): Slide[] {
  return text
    .split(SLIDE_DELIMITER)
    .map((chunk) => chunk.replace(/^```+\w*|```+$/g, "").trim())
    .filter(Boolean)
    .map((chunk) => {
      const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
      return { heading: lines[0] ?? "", body: lines.slice(1).join("\n") };
    })
    .filter((s) => s.heading.length > 0);
}

export function buildCarouselPrompt(input: {
  title: string;
  content: string;
  angle?: string | null;
  postBody?: string;
}): ChatOptions {
  const system = `You turn a topic into a LinkedIn carousel (a swipeable PDF deck) written as Bilal.

${AUTHOR_BIO}

Carousel rules (2025-26 best practice):
- 7 to 9 slides total. One idea per slide. No slide crammed with two concepts.
- SLIDE 1 is the cover: a scroll-stopping hook (≤ 8 words heading, one short line of body). Mirror the tone of his posts — concrete, understated, no hype.
- SLIDES 2..n-1 are the body: each a single self-contained takeaway — a failure mode, a fix, a metric, a decision. Heading = the point in ≤ 8 words; body = 1-3 short lines, ≤ 40 words, plain language, concrete and first-party (real tools, real numbers, real tradeoffs; never invented).
- LAST SLIDE is the CTA: a one-line recap + a single genuine ask (e.g. "What breaks your RAG in prod? Tell me below.").
- No emojis. No hashtags on slides. Short words — this is read on a phone.

Output format: each slide separated by a line containing exactly ${SLIDE_DELIMITER} and nothing else. Within a slide, the FIRST line is the heading, the remaining lines are the body. No numbering, no markdown, no preamble.`;

  const user = `TOPIC
Title: ${input.title}
${input.angle ? `Angle: ${input.angle}\n` : ""}Source (may be truncated):
${input.content.slice(0, 4000)}
${input.postBody ? `\nThe companion post (align the carousel with it):\n${input.postBody.slice(0, 1500)}` : ""}`;

  return { system, user, role: "writer", temperature: 1.0, maxTokens: 3000, op: "carousel" };
}
