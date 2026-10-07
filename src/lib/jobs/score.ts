import { z } from "zod";

import { clip } from "@/lib/feeds/text";
import { chatJSON } from "@/lib/llm/client";
import type { JobProfile, JobRegion, RemoteScope, ScoreDetail, VisaFlag } from "@/lib/jobs/types";

const judgementSchema = z.object({
  stack: z.number().min(0).max(100),
  eligibility: z.number().min(0).max(100),
  seniority: z.number().min(0).max(100),
  product: z.number().min(0).max(100),
  pay: z.number().min(0).max(100),
  remote_from_pk: z.enum(["yes", "no", "unclear"]),
  seniority_fit: z.enum(["under", "fit", "over"]),
  visa: z.enum(["likely", "possible", "unlikely", "unknown"]),
  // Long lists are trimmed rather than rejected: a reroll costs more than it's worth.
  stack_overlap: z.array(z.string()).transform((a) => a.slice(0, 8)),
  gaps: z.array(z.string()).transform((a) => a.slice(0, 6)),
  red_flags: z.array(z.string()).transform((a) => a.slice(0, 5)),
  why: z.string(),
});

export interface ScoreInput {
  company: string;
  title: string;
  location: string;
  remoteScope: RemoteScope;
  region: JobRegion;
  visaFlag: VisaFlag;
  employmentType: string | null;
  pay: string | null;
  postedAt: string | null;
  description: string;
}

// The weights from docs/growth/jobs.md: what he can do, whether he can get it
// from Pakistan, then seniority, real product work and pay.
const WEIGHTS = { stack: 0.35, eligibility: 0.25, seniority: 0.15, product: 0.15, pay: 0.1 };
// Added for the regions he targets, in his order.
const REGION_BONUS = [8, 6, 4, 3, 2];
const CAP = 30;

export async function scoreJob(
  job: ScoreInput,
  profile: JobProfile,
): Promise<{ score: number; detail: ScoreDetail; visa: VisaFlag }> {
  const judgement = await chatJSON({
    system: SYSTEM,
    user: userPrompt(job, profile),
    schema: judgementSchema,
    role: "utility",
    temperature: 0,
    maxTokens: 700,
    op: "job-score",
  });

  // Keyword evidence beats the model's guess; the model fills in the unknowns.
  const visa = job.visaFlag === "unknown" ? judgement.visa : job.visaFlag;
  const regionIndex = profile.regions.indexOf(job.region);
  const regionBonus = regionIndex >= 0 ? (REGION_BONUS[regionIndex] ?? 0) : 0;

  let score =
    judgement.stack * WEIGHTS.stack +
    judgement.eligibility * WEIGHTS.eligibility +
    judgement.seniority * WEIGHTS.seniority +
    judgement.product * WEIGHTS.product +
    judgement.pay * WEIGHTS.pay +
    regionBonus;

  let capped: string | undefined;
  const remote = job.remoteScope === "worldwide" || job.remoteScope === "region";
  if (!remote && regionIndex < 0) capped = "On-site somewhere you don't target";
  else if (!remote && visa === "unlikely") capped = "No visa sponsorship";
  else if (remote && judgement.remote_from_pk === "no" && regionIndex < 0) capped = "Remote, but not open to Pakistan";
  if (capped) score = Math.min(score, CAP);

  // Old reqs on a company board are often evergreen and rarely hiring now.
  if (job.postedAt && Date.now() - Date.parse(job.postedAt) > 45 * 86_400_000) score -= 15;

  const detail: ScoreDetail = {
    stack: judgement.stack,
    eligibility: judgement.eligibility,
    seniority: judgement.seniority,
    product: judgement.product,
    pay: judgement.pay,
    region_bonus: regionBonus,
    remote_from_pk: judgement.remote_from_pk,
    seniority_fit: judgement.seniority_fit,
    stack_overlap: judgement.stack_overlap,
    gaps: judgement.gaps,
    red_flags: judgement.red_flags,
    why: judgement.why,
    ...(capped ? { capped } : {}),
  };
  return { score: Math.round(Math.max(0, Math.min(100, score))), detail, visa };
}

const SYSTEM = `You judge how well one job posting fits one candidate. Be strict and literal: judge only from the posting text, and don't assume what it doesn't say.

Return ONLY a JSON object:
{
  "stack": 0-100,        // overlap between the skills the job needs and the candidate's skills. 90+ = his core stack is the job.
  "eligibility": 0-100,  // can he realistically get this job from Pakistan? 100 = remote open to Pakistan or worldwide, or on-site in a region he targets with visa sponsorship. 0 = needs US citizenship, clearance, or a work permit he can't get.
  "seniority": 0-100,    // 100 = matches his level; lower when far above (staff/principal/director) or below (intern).
  "product": 0-100,      // 100 = building real AI products or systems. Low for data labelling, AI training tasks, sales engineering, support, or teaching.
  "pay": 0-100,          // 50 when pay isn't stated. Higher when stated pay is good for the location; lower when it's clearly low.
  "remote_from_pk": "yes" | "no" | "unclear",
  "seniority_fit": "under" | "fit" | "over",
  "visa": "likely" | "possible" | "unlikely" | "unknown",  // visa sponsorship for on-site roles. "unlikely" only when the posting says it can't sponsor, needs existing right to work, or needs a clearance; "unknown" when it says nothing
  "stack_overlap": ["skills he has that the job asks for"],
  "gaps": ["skills the job asks for that he lacks"],
  "red_flags": ["e.g. staffing agency, data labelling, unpaid trial, US only, commission only"],
  "why": "one plain sentence on the fit, naming the deciding factor"
}`;

function userPrompt(job: ScoreInput, profile: JobProfile): string {
  return `CANDIDATE
${profile.summary}
Target titles: ${profile.titles.join(", ")}
Must-have skills: ${profile.must_have.join(", ")}
Nice to have: ${profile.nice_to_have.join(", ")}
Level: ${profile.seniority ?? "mid"}
Regions, in order: ${profile.regions.join(" > ")}
Dealbreakers: ${profile.dealbreakers.join(", ")}

JOB
${job.title} at ${job.company}
Location: ${job.location || "not stated"} (work mode: ${job.remoteScope})
Type: ${job.employmentType ?? "not stated"}
Pay: ${job.pay ?? "not stated"}
Posted: ${job.postedAt?.slice(0, 10) ?? "unknown"}

${clip(job.description || "(no description; judge from the title and location)", 5000)}`;
}
