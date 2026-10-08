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

const PLACES: [string, RegExp][] = [
  ["SA", /saudi|riyadh|jeddah|makkah|mecca|dammam|khobar|ksa\b/],
  ["AE", /\buae\b|emirates|dubai|abu dhabi|sharjah/],
  ["QA", /qatar|doha/],
  ["PK", /pakistan|karachi|lahore|islamabad/],
];

/**
 * Where this job is and what that means for him, worked out here so the model
 * never has to guess the country (it once put a Riyadh job's visa line in the UAE).
 */
export function jobPlace(job: { countries?: string[]; location_raw?: string | null }, p: CandidateProfile): string {
  const where = [job.location_raw, ...(job.countries ?? [])].filter(Boolean).join(", ");
  if (!where) return "THIS JOB'S LOCATION: not stated. Don't mention visa, sponsorship or relocation.";
  const code = PLACES.find(([, re]) => re.test(where.toLowerCase()))?.[0];
  const auth = code ? p.work_auth[code] : undefined;
  const lines = [`THIS JOB'S LOCATION: ${where}`];
  if (auth) lines.push(auth === "yes" ? "He is authorised to work there." : "He would need visa sponsorship there.");
  if (code && code !== "PK") lines.push(p.relocate[code] ? "He would relocate there." : "Relocation there isn't settled; don't mention it.");
  lines.push("When you mention visa, sponsorship or relocation, use only these lines and name only this country. Never mention his authorisation for other countries.");
  return lines.join("\n");
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

${jobPlace(ctx.job, ctx.profile)}

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
- Write like a person, not a template: no "not X, but Y" or "X, not Y" contrasts, no "exactly the work I do", no opening that restates the question, no closing one-liner or moral.
- Across one form, don't tell the same project in every answer. Use the fact that fits each question best.
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
  const opts = {
    role: "writer" as const,
    temperature: 0.6,
    maxTokens: 1200,
    op: "cover-letter",
    system: `You write a cover letter for ${name}, an AI engineer in Karachi, for one job. He edits and sends it himself.

HIS FACTS (the only facts you may use):
${facts.text}

FORM FACTS:
${profileFacts(profile)}

${jobPlace(job, profile)}

${style}
- Open with the specific thing about this role or company that fits his work, not with "I am writing to apply".
- Two concrete examples from the facts, with their real numbers, each tied to something the ad asks for.
- Mention a gap only when the ad makes it a hard requirement he lacks: one sentence, paired with the nearest real experience. Never a paragraph of weaknesses.
- Write like a person: no "What caught my eye", "I'm excited", "lines up with", "I keep coming back to", "I'll be straight", "the hard part wasn't X, it was Y", "not X, it's Y" or "X, not Y" contrasts, no closing one-liner or moral. Vary sentence length.
- Tie an example to the ad inside the sentence that tells it. Never tack on "which matches your X" or "That is X, which fits your Y".
- Notice period: "My notice period is N weeks." Don't turn it into a start date.
- First person, plain words, contractions where natural, no buzzwords, no em or en dashes, no emojis.
- Never invent a number, employer, tool, date or credential.
- Never state relocation, visa, notice period, start date or salary unless FORM FACTS give it.
- Start with "Dear hiring team," (or the hiring manager's name if the ad gives one) and end with his name. No address block, no date. Reply with the letter only.`,
    user: `JOB: ${job.title} at ${job.company}\n\nAD:\n${(job.description ?? "(no description stored)").slice(0, 7000)}`,
  };
  let text = stripDashes((await chat(opts)).trim());
  // The prompt alone doesn't hold these; one targeted rewrite does.
  const tics = letterTics(text);
  const unsupported = await unsupportedClaims(text, `${facts.text}\n\n${profileFacts(profile)}\n\n${jobPlace(job, profile)}`);
  if (tics.length || unsupported.length) {
    const asks = [
      unsupported.length && `Remove or reword these claims, which his facts don't support: ${unsupported.map((t) => `"${t}"`).join("; ")}.`,
      tics.length && `Change only the sentences holding these phrasings: ${tics.map((t) => `"${t}"`).join("; ")}.`,
    ].filter(Boolean);
    const fixed = await chat({
      ...opts,
      user: `${opts.user}\n\nYOUR DRAFT:\n${text}\n\nRewrite the draft, keeping everything else as it is. ${asks.join(" ")} Reply with the letter only.`,
    });
    text = stripDashes(fixed.trim());
  }
  return text;
}

/** Claims in a draft that go past his facts: an outcome, a responsibility, a tool used in production. */
async function unsupportedClaims(text: string, facts: string): Promise<string[]> {
  try {
    const { unsupported } = await chatJSON({
      role: "utility",
      temperature: 0,
      maxTokens: 600,
      op: "cover-letter-check",
      schema: z.object({ unsupported: z.array(z.string()).transform((a) => a.slice(0, 8)) }),
      system: `You check a cover letter against the only facts it may use. List each claim the FACTS don't support: an outcome or result, a number, a responsibility or activity, a tool said to be used in production when the facts give it only for a project. Quote the letter's exact words. Ignore statements about the company or the ad, and ignore style. Reply with ONLY {"unsupported":["..."]}, an empty list when every claim is supported.`,
      user: `FACTS:\n${facts}\n\nLETTER:\n${text}`,
    });
    return unsupported;
  } catch (err) {
    // The check is a second opinion; a failed one shouldn't cost him the letter.
    console.error("[cover-letter-check] skipped:", err instanceof Error ? err.message : err);
    return [];
  }
}

const TICS = [
  /\blines? up (closely )?with\b/i,
  /\bkeep coming back\b/i,
  /\b(caught my eye|pulled me in|excited)\b/i,
  /\b(I'll|I will|I should|let me|to) be (straight|upfront|honest|candid)\b[^.]*/i,
  /\b(wasn't|isn't|was not|is not) [^.,;]{1,40}, (it was|it's|it is)\b/i,
  /, not (a |an |just )?[\w-]+( \w+)?\./i,
  /\brather than (the )?\d[^.,]*/i,
  /\bnot \d+\+?\b/i,
  /\bwhich (matches|fits|maps onto|lines up)\b[^.]*/i,
  /\bmaps? directly onto\b/i,
  /\bexactly (where|what|the kind)\b/i,
  /\bstart (four|\w+|\d+) weeks? (from|after)\b[^.]*/i,
  /(^|\.\s+)(That|This)('s| is) [^.]*\byour\b[^.]*\./,
];

/** Template phrasings in a drafted letter, as found, for a targeted rewrite. */
export function letterTics(text: string): string[] {
  return TICS.flatMap((re) => {
    const m = text.match(re);
    return m ? [m[0].replace(/^\.\s+/, "").trim()] : [];
  });
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
