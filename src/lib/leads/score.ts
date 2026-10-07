import "server-only";

import { z } from "zod";

import { clip } from "@/lib/feeds/text";
import { chatJSON } from "@/lib/llm/client";
import type { LeadDetail, LeadKind } from "@/lib/leads/types";
import { AUTHOR_BIO } from "@/lib/voice/profile";

const judgementSchema = z.object({
  kind: z.enum(["hiring_post", "client_post", "gig", "contract_role", "recruiter_message", "noise"]),
  who: z.string(),
  who_type: z.enum(["founder", "hiring manager", "recruiter", "agency", "bot", "unknown"]),
  wants: z.string(),
  stack: z.array(z.string()).transform((a) => a.slice(0, 8)),
  remote: z.enum(["yes", "no", "unclear"]),
  region: z.string(),
  budget: z.string(),
  score: z.number().min(0).max(100),
  why: z.string(),
  opener: z.string(),
});

export interface LeadInput {
  kindHint: LeadKind | null;
  source: string;
  title: string | null;
  text: string;
  who: string | null;
  budget: string | null;
  postedAt: string | null;
}

export interface LeadJudgement {
  kind: LeadKind | "noise";
  who: string | null;
  wants: string;
  stack: string[];
  remote: string;
  region: string | null;
  budget: string | null;
  score: number;
  detail: LeadDetail;
  opener: string;
}

// Unpaid or not-really-engineering work the model tends to rate on keywords alone.
const LOW_VALUE = /\b(equity[- ]only|unpaid|for exposure|data annotation|annotators?|data labell?ing|rlhf|ai training data|ai trainers?)\b/i;
const CAP = 30;

export async function judgeLead(lead: LeadInput): Promise<LeadJudgement> {
  const j = await chatJSON({
    system: SYSTEM,
    user: `SOURCE: ${lead.source}${lead.kindHint ? ` (looks like: ${lead.kindHint})` : ""}
${lead.postedAt ? `POSTED: ${lead.postedAt.slice(0, 10)}\n` : ""}${lead.who ? `FROM: ${lead.who}\n` : ""}${lead.budget ? `BUDGET: ${lead.budget}\n` : ""}${lead.title ? `TITLE: ${lead.title}\n` : ""}
${clip(lead.text, 3500)}`,
    schema: judgementSchema,
    role: "utility",
    temperature: 0,
    maxTokens: 700,
    op: "lead-score",
  });

  let score = Math.round(j.score);
  let capped: string | undefined;
  if (j.who_type === "bot") [score, capped] = [Math.min(score, CAP), "posted by a bot"];
  else if (LOW_VALUE.test(lead.text)) [score, capped] = [Math.min(score, CAP), "unpaid, equity-only or annotation work"];

  const unknown = (s: string) => (!s.trim() || /^(unknown|unclear|n\/a|none)$/i.test(s.trim()) ? null : s.trim());
  return {
    kind: j.kind,
    who: unknown(j.who) ?? lead.who,
    wants: j.wants.trim(),
    stack: j.stack,
    remote: j.remote,
    region: unknown(j.region),
    budget: lead.budget ?? unknown(j.budget),
    score,
    detail: { who_type: j.who_type, why: j.why.trim(), ...(capped ? { capped } : {}) },
    opener: tidy(j.opener),
  };
}

const openerSchema = z.object({ opener: z.string() });

/** A fresh reply or DM for a lead, written by the writer model. */
export async function draftOpener(lead: { kind: string; who: string | null; wants: string | null; snippet: string | null }): Promise<string> {
  const { opener } = await chatJSON({
    system: `You write as Bilal Taha, an AI engineer in Karachi, replying to someone who wants AI work done.

WHAT HE HAS REALLY DONE (the only facts you may use; never invent others, never invent numbers):
${AUTHOR_BIO}

${OPENER_RULES}
Return ONLY {"opener":"..."}`,
    user: `KIND: ${lead.kind}\n${lead.who ? `FROM: ${lead.who}\n` : ""}${lead.wants ? `WANTS: ${lead.wants}\n` : ""}\n${clip(lead.snippet ?? "", 3000)}`,
    schema: openerSchema,
    role: "writer",
    temperature: 0.7,
    maxTokens: 300,
    op: "lead-opener",
  });
  return tidy(opener);
}

function tidy(text: string): string {
  return text
    .trim()
    .replace(/^["“]|["”]$/g, "")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/\s+,/g, ",");
}

const OPENER_RULES = `The opener: 2-3 sentences, 30-70 words, plain English with contractions. Name the one thing they want and the one piece of his real work closest to it. End with a concrete next step (a short call, or one question about their setup). Say only what the facts above say his work did; never claim it did "exactly" what they want. No "I hope this finds you well", no "I came across your post", no "I'd love to", no em or en dashes, no hashtags, no emojis, no list of skills.`;

const SYSTEM = `You sort leads for Bilal Taha, an AI engineer in Karachi, Pakistan, who takes remote freelance and contract work and is open to full-time roles.

WHAT HE HAS REALLY DONE:
${AUTHOR_BIO}

For the item below, return JSON:
- kind: "hiring_post" (a company hiring an employee), "client_post" (someone wants a freelancer, contractor or consultant to build something), "gig" (a freelance marketplace project), "contract_role" (a contract position), "recruiter_message" (a recruiter or client writing to him), or "noise" (people offering their own services, courses, ads, news, opinion posts, anything not asking for help).
- who: the person or company asking, as named in the text, or "unknown".
- who_type: founder, hiring manager, recruiter, agency, bot, or unknown.
- wants: one plain line, what they want built or who they want.
- stack: the tools and skills named, at most 8.
- remote: yes, no or unclear. region: where they are or where the work is, or "unknown".
- budget: as stated (e.g. "USD 3-5k", "USD 40/h"), or "unknown".
- score 0-100: how worth his time it is. Favour a real person (founder or hiring manager) over a recruiter over an agency; work that matches what he has shipped (RAG, agents, LLM products, full-stack AI apps); remote, UAE or UK; a stated budget over USD 1k or USD 40/h. Noise scores 0. Bots, unpaid trials, equity-only, data annotation and AI-training gigs stay under 30. US-only or onsite outside his regions stay under 40.
- why: one plain sentence a busy person reads in two seconds.
- opener: a reply or DM he could send. ${OPENER_RULES}`;
