import "server-only";

import { z } from "zod";

import type { Ledger, TailorPlan } from "@/lib/apply/types";
import { chatJSON } from "@/lib/llm/client";
import { stripDashes } from "@/lib/llm/prompts";

// The model proposes edits by short id (r1, b4); render.ts checks and applies them.

export interface JobAd {
  title: string;
  company: string;
  description: string | null;
}

/** The ledger as the model sees it, with short ids, plus the map back to row ids. */
export function ledgerText(ledger: Ledger): { text: string; ids: Map<string, string> } {
  const ids = new Map<string, string>();
  const lines: string[] = [];
  ledger.roles.forEach((r, i) => {
    const rid = `r${i + 1}`;
    ids.set(rid, r.id);
    const dates = [r.start_date, r.end_date].filter(Boolean).join(" to ");
    lines.push(`${rid} [${r.section}] ${[r.title, r.employer].filter(Boolean).join(", ")}${dates ? ` (${dates})` : ""}`);
    for (const b of ledger.bullets.filter((x) => x.role_id === r.id)) {
      const bid = `b${ids.size + 1}`;
      ids.set(bid, b.id);
      lines.push(`  ${bid}${b.origin === "added" ? " [added fact]" : ""}: ${b.plain}`);
    }
  });
  const loose = ledger.bullets.filter((b) => !b.role_id);
  if (loose.length) lines.push("Other facts:");
  for (const b of loose) {
    const bid = `b${ids.size + 1}`;
    ids.set(bid, b.id);
    lines.push(`  ${bid} [added fact]: ${b.plain}`);
  }
  const byCat = new Map<string, string[]>();
  for (const s of ledger.skills) byCat.set(s.category ?? "Skills", [...(byCat.get(s.category ?? "Skills") ?? []), s.name]);
  for (const [cat, names] of byCat) lines.push(`SKILLS ${cat}: ${names.join(", ")}`);
  return { text: lines.join("\n"), ids };
}

const planSchema = z.object({
  keywords: z.array(z.string()).max(20),
  summary: z.string().nullable().optional(),
  edits: z.array(z.object({ id: z.string(), text: z.string(), uses: z.array(z.string()).optional() })).max(30),
  reorder: z.array(z.object({ role: z.string(), order: z.array(z.string()) })).optional(),
  drop: z.array(z.string()).optional(),
  skills_order: z.array(z.object({ category: z.string(), items: z.array(z.string()) })).optional(),
  gaps: z.array(z.string()).max(12),
});

export async function planTailoring(ledger: Ledger, job: JobAd, summary: string | null): Promise<TailorPlan> {
  const { text, ids } = ledgerText(ledger);
  const raw = await chatJSON({
    role: "writer",
    temperature: 0.3,
    maxTokens: 4000,
    op: "resume-tailor",
    schema: planSchema,
    system: `You tailor a resume to one job. You return edits as JSON, never LaTeX.

THE ONLY FACTS YOU MAY USE are in the ledger below. Never add a number, tool, framework, client, title, degree or date that isn't there. A bullet may cite another ledger line it draws on (uses).

What you may do:
- reword bullets so the job's exact terms appear where they are true for him (if the ad says "LLM evaluation" and a bullet shows evals, say "LLM evaluation"). Spell an acronym out once if the ad does.
- lead each bullet with the result or the thing built; keep every number from the original.
- keep each bullet within 15% of its original length. Plain text; **double asterisks** for bold if the original bolds something.
- reorder bullets within a role so the most relevant come first; drop at most one weak bullet per role, only from roles with four or more.
- order skills within each SKILLS line, most relevant first (use the exact item names).
- write a one-line summary (under 200 characters) when one is asked for.
- only edit bullets that gain something; leave the rest alone.

No em or en dashes. No buzzwords ("leveraged", "spearheaded", "synergy", "cutting-edge", "passionate"). Past tense for past roles.

Return JSON:
{"keywords": the 8-15 exact skills and terms the ad asks for most,
 "summary": one line or null,
 "edits": [{"id": "b3", "text": "new bullet", "uses": ["b7"]}],
 "reorder": [{"role": "r2", "order": ["b5", "b3", "b4"]}],
 "drop": ["b9"],
 "skills_order": [{"category": "Languages", "items": ["Python", "SQL"]}],
 "gaps": ["requirements he doesn't meet, short, e.g. 'Kubernetes in production'"]}`,
    user: `JOB: ${job.title} at ${job.company}

AD:
${(job.description ?? "(no description stored; use the title)").slice(0, 7000)}

LEDGER:
${text}

${summary !== null ? `CURRENT SUMMARY: ${summary}\nWrite a new summary line.` : "The resume has no summary; return summary null."}`,
  });

  const id = (short: string) => ids.get(short.trim()) ?? null;
  return {
    keywords: [...new Set(raw.keywords.map((k) => k.trim()).filter(Boolean))],
    summary: raw.summary ? stripDashes(raw.summary.trim()) : null,
    edits: raw.edits.flatMap((e) => {
      const bulletId = id(e.id);
      return bulletId
        ? [{ bullet_id: bulletId, new_text: stripDashes(e.text.trim()), uses_facts: (e.uses ?? []).map(id).filter((x): x is string => Boolean(x)) }]
        : [];
    }),
    reorder: (raw.reorder ?? []).flatMap((r) => {
      const roleId = id(r.role);
      return roleId ? [{ role_id: roleId, bullet_ids: r.order.map(id).filter((x): x is string => Boolean(x)) }] : [];
    }),
    drop: (raw.drop ?? []).map(id).filter((x): x is string => Boolean(x)),
    skills_order: raw.skills_order ?? [],
    gaps: raw.gaps.map((g) => stripDashes(g.trim())).filter(Boolean),
  };
}
