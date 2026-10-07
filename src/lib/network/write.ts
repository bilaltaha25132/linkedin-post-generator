import "server-only";

import { z } from "zod";

import { chat, chatJSON } from "@/lib/llm/client";
import { NOTE_MAX } from "@/lib/network/format";
import type { Connection, ProfileReview } from "@/lib/network/types";
import { AUTHOR_BIO } from "@/lib/voice/profile";

const NO_DASHES = (s: string) => s.replace(/\s*[—–]\s*/g, ", ").replace(/\s+,/g, ",").trim();

export async function draftNote(c: Pick<Connection, "name" | "reason" | "headline" | "source">): Promise<string> {
  const ask = async (extra = "") =>
    NO_DASHES(
      (
        await chat({
          role: "writer",
          temperature: 0.6,
          maxTokens: 200,
          op: "connection-note",
          system: `You write LinkedIn connection notes for Bilal Taha, an AI engineer in Karachi.

WHAT HE HAS REALLY DONE:
${AUTHOR_BIO}

"Why connect" describes them or what they posted, never something he did. If it's a project they want built, show interest in their problem; don't claim to have built it.

Rules: under ${NOTE_MAX} characters including spaces. Plain English with contractions. Mention the one specific thing that connects them (from the reason given). No pitch, no ask for a job or a call, no "I'd love to connect", no "I came across your profile", no flattery, no emojis, no hashtags, no em or en dashes. Claim nothing about his work beyond the facts above. Reply with the note only.`,
          user: `Name: ${c.name}\nTheir role: ${c.headline ?? "unknown"}\nWhy connect: ${c.reason ?? ""}${extra}`,
        })
      )
        .replace(/^["“]|["”]$/g, "")
        .trim(),
    );
  const first = await ask();
  if (first.length <= NOTE_MAX) return first;
  const second = await ask(`\n\nYour last draft was ${first.length} characters. Stay under ${NOTE_MAX}.`);
  return second.length <= NOTE_MAX ? second : second.slice(0, second.lastIndexOf(" ", NOTE_MAX - 1)).trim();
}

const reviewSchema = z.object({
  elements: z
    .array(
      z.object({
        key: z.string(),
        label: z.string(),
        status: z.enum(["pass", "improve"]),
        note: z.string(),
      }),
    )
    .max(12),
  headlines: z.array(z.string()).min(1).max(3),
  about: z.string(),
  skills: z.array(z.string()).max(12),
  queries: z
    .array(z.object({ query: z.string(), terms: z.array(z.string()).min(1).max(4), fix: z.string() }))
    .max(30),
});

/**
 * Reviews the profile text he pasted or uploaded against what recruiters
 * search for. Rewrites use only facts from his profile and bio.
 */
export async function reviewProfile(profile: string, demand: { skill: string; n: number }[]): Promise<ProfileReview> {
  const skills = demand.length
    ? demand.map((d) => `${d.skill} (${d.n} matches)`).join(", ")
    : "no job data yet; use AI engineering basics: RAG, LLM agents, Python, evals";
  const raw = await chatJSON({
    role: "writer",
    temperature: 0.4,
    maxTokens: 3500,
    op: "profile-review",
    schema: reviewSchema,
    system: `You review the LinkedIn profile of Bilal Taha, an AI engineer in Karachi who wants remote work and roles in the UAE, UK and US.

FACTS ABOUT HIS WORK (the only facts you may use besides the profile itself):
${AUTHOR_BIO}

Recruiters search LinkedIn in plain language and filter on skills. The feed's ranker also reads his headline to decide who sees his posts. Judge the profile on:
- headline: starts with his role ("AI Engineer" or "Full Stack AI Engineer"), then what he builds, stack, proof; carries his top keywords; first 70 characters work on mobile; at most 220 characters.
- about: the first 2-3 lines say who he helps and the outcome; names shipped systems with numbers; stack keywords in sentences; says how to work with him (full-time, projects, remote).
- experience: each role says what he built and a result, with the stack.
- skills: the top 5 match the skills employers ask for (below); at least 5 listed.
- location: Karachi kept, and "remote, open to UAE, UK and US" stated somewhere.
- featured, services, open_to_work: not visible in text; mark "improve" only if the profile text says nothing, and say what to check.

Return JSON:
- elements: one per item above (key, label, status "pass" or "improve", note: one or two plain sentences that cite why, e.g. a skill's share of his job matches).
- headlines: 3 options, each under 220 characters, built only from facts above and in the profile.
- about: a rewritten About of 120-220 words in his voice: first person, plain, contractions, no buzzwords, no em or en dashes, no emojis, no hashtags.
- skills: his skills in the order to list them, at most 10, only skills the profile or facts show.
- queries: 20 searches a recruiter or client might type to find someone like him (e.g. "remote LangGraph engineer Pakistan", "RAG contractor UAE"), each with terms: the 1-4 words a profile must contain to match, and fix: one sentence he could add to his profile to match it, true to the facts.`,
    user: `SKILLS IN HIS STRONG JOB MATCHES THIS MONTH: ${skills}\n\nHIS PROFILE:\n${profile.slice(0, 12000)}`,
  });

  const text = profile.toLowerCase();
  return {
    elements: raw.elements.map((e) => ({ ...e, note: NO_DASHES(e.note) })),
    headlines: raw.headlines.map(NO_DASHES),
    about: NO_DASHES(raw.about),
    skills: raw.skills,
    queries: raw.queries.map((q) => ({
      query: q.query,
      terms: q.terms,
      missing: q.terms.filter((t) => !text.includes(t.toLowerCase())),
      fix: NO_DASHES(q.fix),
    })),
  };
}
