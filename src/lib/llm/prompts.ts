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
