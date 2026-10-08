import "server-only";

import { z } from "zod";

import { answerStandard, type ClassifyContext } from "@/lib/apply/classify";
import type { ApplicationForm } from "@/lib/apply/forms";
import { ledgerText, type JobAd } from "@/lib/apply/tailor";
import type { Answer, CandidateProfile, Ledger } from "@/lib/apply/types";
import { chat, chatJSON } from "@/lib/llm/client";
import { embed } from "@/lib/llm/embeddings";
import { stripDashes } from "@/lib/llm/prompts";
import { supabaseAdmin } from "@/lib/supabase/server";
import { AUTHOR_BIO } from "@/lib/voice/profile";

/** His facts for the drafter: the ledger, or his bio until a resume is in. */
function factsFor(ledger: Ledger): { text: string; fromBio: boolean } {
  if (ledger.roles.length) return { text: ledgerText(ledger).text, fromBio: false };
  return { text: AUTHOR_BIO, fromBio: true };
}

export function profileFacts(p: CandidateProfile): string {
  const lines = [
    p.contact.city && `Lives in ${[p.contact.city, p.contact.country].filter(Boolean).join(", ")}`,
    p.years_experience !== null && `${p.years_experience} years of professional experience`,
    p.notice_weeks !== null && `Notice period: ${p.notice_weeks} weeks`,
    p.languages.length && `Languages: ${p.languages.map((l) => `${l.name} (${l.level})`).join(", ")}`,
    Object.keys(p.work_auth).length &&
      `Work authorisation: ${Object.entries(p.work_auth)
        .map(([k, v]) => `${k} ${v === "yes" ? "authorised" : "needs sponsorship"}`)
        .join(", ")}`,
    Object.keys(p.relocate).length &&
      `Would relocate to: ${Object.entries(p.relocate)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(", ") || "nowhere listed"}`,
  ];
  return lines.filter(Boolean).join("\n") || "(no form facts saved yet)";
}

async function pastAnswers(questions: string[]): Promise<string> {
  const seen = new Map<string, string>();
  for (const q of questions.slice(0, 6)) {
    const vector = await embed(q);
    if (!vector) break;
    const { data } = await supabaseAdmin().rpc("match_answers", { query_embedding: vector, match_count: 2 });
    for (const row of (data ?? []) as { question: string; answer: string; similarity: number }[]) {
      if (row.similarity >= 0.75) seen.set(row.question, row.answer);
    }
  }
  return [...seen].map(([q, a]) => `Q: ${q}\nA: ${a}`).join("\n\n");
}

const draftSchema = z.object({
  answers: z.array(
    z.object({
      key: z.string(),
      // Models sometimes answer a yes/no or number question with a bare JSON value.
      answer: z
        .union([z.string(), z.boolean(), z.number()])
        .nullish()
        .transform((v) => (typeof v === "boolean" ? (v ? "Yes" : "No") : v == null ? null : String(v))),
      flag: z.string().nullable().optional(),
    }),
  ),
});

/**
 * Every field of the form with an answer, a source and a flag where he needs
 * to look. Standard fields come from code; the rest from one writer call.
 */
export async function draftAnswers(input: {
  form: ApplicationForm;
  job: JobAd;
  ledger: Ledger;
  ctx: ClassifyContext;
}): Promise<Answer[]> {
  const { form, job, ledger, ctx } = input;
  const answers = new Map<string, Answer>();
  const open: Answer[] = [];
  for (const field of form.fields) {
    const standard = answerStandard(field, ctx);
    if (standard) answers.set(field.key, standard);
    else
      open.push({
        key: field.key,
        label: field.label,
        kind: "question",
        type: field.type,
        required: field.required,
        ...(field.options ? { options: field.options } : {}),
        ...(field.maxLength ? { maxLength: field.maxLength } : {}),
        value: null,
        source: "drafted",
      });
  }

  if (open.length) {
    const facts = factsFor(ledger);
    const past = await pastAnswers(open.filter((a) => a.type === "textarea" || a.type === "text").map((a) => a.label));
    const questions = open
      .map((a) => {
        const desc = form.fields.find((f) => f.key === a.key)?.description;
        return [
          `key: ${a.key}`,
          `question: ${a.label}`,
          `type: ${a.type}${a.required ? ", required" : ""}`,
          a.options && `options (answer with one exactly${a.type === "multiselect" ? ", or several joined by ' | '" : ""}): ${a.options.join(" | ")}`,
          a.maxLength && `limit: ${a.maxLength} characters`,
          desc && `note: ${desc}`,
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n\n");

    const raw = await chatJSON({
      role: "writer",
      temperature: 0.5,
      maxTokens: 5000,
      op: "apply-answers",
      schema: draftSchema,
      system: `You draft answers to a job application form for Bilal Taha, an AI engineer in Karachi, Pakistan. He reads every answer and submits the form himself.

HIS FACTS (the only facts you may use):
${facts.text}

FORM FACTS:
${profileFacts(ctx.profile)}

Rules:
- Read the whole job ad first. If the ad or a question sets a test ("start your answer with the phrase ..."), follow it exactly.
- Choice questions: answer only from the facts. If the facts don't settle it, answer null and say in flag what he must decide.
- Select-all questions: pick only the options the facts show; name in flag any he may want to add himself.
- Questions about him that the facts don't cover (nationality, people he knows there, working style, habits): give your best guess and always flag "Confirm".
- A question that asks for a specific event (a bug, a failure, a conflict, "a time when"): tell only an event the facts describe, with only the details they give. If the facts hold no such event, answer null and flag "Needs your real story", naming the project it could come from. Never make up what happened, a cause, or a lesson.
- "What would you do differently" may suggest changes, but anything stated as having happened must be in the facts.
- Yes/no about a skill or experience: yes only if the facts show it; otherwise "No" with flag "honest gap".
- Free text: answer the question in the first sentence; one concrete story with a real number from the facts, tied to one specific thing in the ad; 80 to 150 words unless a limit is given (stay under it). If he lacks what's asked, answer honestly with the nearest real experience and flag "adjacent experience".
- Short text fields: a short plain answer.
- His voice: first person, plain words, contractions, no buzzwords ("passionate", "leverage", "cutting-edge", "thrilled"), no em or en dashes, no emojis.
- Never invent a number, employer, tool, date or credential.
- Never state relocation, visa, notice period, start date or salary unless FORM FACTS give it.

Return JSON: {"answers": [{"key": "...", "answer": "..." or null, "flag": "..." or null}]} with one entry per question.`,
      user: `JOB: ${job.title} at ${job.company}

AD:
${(job.description ?? "(no description stored)").slice(0, 7000)}
${past ? `\nANSWERS HE APPROVED BEFORE (match their facts and tone):\n${past}\n` : ""}
QUESTIONS:
${questions}`,
    });

    for (const a of open) {
      const got = raw.answers.find((x) => x.key === a.key);
      let value = got?.answer ? stripDashes(got.answer.trim()) : null;
      let flag = got?.flag?.trim() || undefined;
      if (value && a.options) {
        const parts = a.type === "multiselect" ? value.split(/\s*\|\s*/) : [value];
        const matched = parts.map((v) => a.options!.find((o) => o.trim().toLowerCase() === v.trim().toLowerCase())).filter((o): o is string => Boolean(o));
        if (matched.length) value = matched.join(" | ");
        else {
          flag = `Pick yourself; the draft "${value}" isn't one of the options.`;
          value = null;
        }
      }
      if (value && a.maxLength && value.length > a.maxLength) flag = `Over the ${a.maxLength}-character limit; trim it.`;
      if (facts.fromBio && a.type === "textarea") flag = flag ?? "Drafted from your bio. Add your resume for answers built on it.";
      answers.set(a.key, { ...a, value, ...(flag ? { flag } : {}) });
    }
  }

  return form.fields.map((f) => answers.get(f.key)!).filter(Boolean);
}

const LETTER_STYLE: Record<string, string> = {
  gulf: "A short cover email: 120 to 170 words, warm and direct. Say when he can start and that he's open to relocating if the facts say so.",
  germany: "An English Anschreiben: 250 to 330 words, formal but plain, three or four paragraphs: why this role, what he has built that fits, how he works, availability.",
  netherlands: "A motivation letter: 220 to 300 words. Dutch readers value directness: say why this company and this role specifically, with evidence, no flattery.",
  default: "A cover letter of 180 to 250 words. Plain and specific.",
};

export function letterStyle(job: { countries: string[]; region: string | null; location_raw: string | null }): string {
  const text = `${job.countries.join(" ")} ${job.location_raw ?? ""}`.toLowerCase();
  if (job.region === "saudi" || job.region === "gulf" || /saudi|uae|emirates|dubai|qatar|riyadh|abu dhabi/.test(text)) return "gulf";
  if (/germany|deutschland|berlin|munich|münchen|hamburg|frankfurt|\bde\b/.test(text)) return "germany";
  if (/netherlands|amsterdam|rotterdam|utrecht|\bnl\b/.test(text)) return "netherlands";
  return "default";
}

export async function draftCoverLetter(input: {
  job: JobAd & { countries: string[]; region: string | null; location_raw: string | null };
  ledger: Ledger;
  profile: CandidateProfile;
}): Promise<string> {
  const { job, ledger, profile } = input;
  const facts = factsFor(ledger);
  const style = LETTER_STYLE[letterStyle(job)];
  const name = [profile.contact.first_name, profile.contact.last_name].filter(Boolean).join(" ") || "Bilal Taha";
  const text = await chat({
    role: "writer",
    temperature: 0.6,
    maxTokens: 1200,
    op: "cover-letter",
    system: `You write a cover letter for ${name}, an AI engineer in Karachi, for one job. He edits and sends it himself.

HIS FACTS (the only facts you may use):
${facts.text}

FORM FACTS:
${profileFacts(profile)}

${style}
- Open with the specific thing about this role or company that fits his work, not with "I am writing to apply".
- Two concrete examples from the facts, with their real numbers, each tied to something the ad asks for.
- Say plainly where he's light against the ad if it matters, and what's adjacent.
- First person, plain words, contractions where natural, no buzzwords, no em or en dashes, no emojis.
- Never invent a number, employer, tool, date or credential.
- Never state relocation, visa, notice period, start date or salary unless FORM FACTS give it.
- Start with "Dear hiring team," (or the hiring manager's name if the ad gives one) and end with his name. No address block, no date. Reply with the letter only.`,
    user: `JOB: ${job.title} at ${job.company}\n\nAD:\n${(job.description ?? "(no description stored)").slice(0, 7000)}`,
  });
  return stripDashes(text.trim());
}

/** Keeps the free-text answers he approved, so later drafts stay consistent. */
export async function rememberAnswers(jobId: string, answers: Answer[]): Promise<number> {
  const keep = answers.filter((a) => a.type === "textarea" && a.source === "drafted" && a.value && a.value.length > 60);
  const db = supabaseAdmin();
  await db.from("answer_bank").delete().eq("job_id", jobId);
  for (const a of keep) {
    await db.from("answer_bank").insert({ job_id: jobId, question: a.label, answer: a.value, embedding: await embed(a.label) });
  }
  return keep.length;
}
