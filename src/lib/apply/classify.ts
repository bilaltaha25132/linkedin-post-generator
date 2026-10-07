import type { FormField } from "@/lib/apply/forms";
import type { Answer, CandidateProfile, LedgerRole } from "@/lib/apply/types";

// Sorts form fields into kinds and answers the standard ones from his profile
// and ledger, in code. Whatever is left (custom questions, selects it can't
// settle) goes to the drafter. Fields that are his alone are never answered.

export type Kind =
  | "first_name"
  | "last_name"
  | "full_name"
  | "email"
  | "phone"
  | "location"
  | "linkedin"
  | "github"
  | "portfolio"
  | "twitter"
  | "resume"
  | "cover_letter"
  | "current_company"
  | "current_title"
  | "years"
  | "work_auth"
  | "sponsorship"
  | "relocation"
  | "start_date"
  | "notice"
  | "salary"
  | "source"
  | "yours"
  | "question";

const RULES: [Kind, RegExp][] = [
  // His alone: demographics, consent, certification, AI-use policy, pronouns.
  [
    "yours",
    /\b(gender|sex\b|race|ethnic|hispanic|latin[oa]|veteran|disabilit|sexual orientation|transgender|pronoun|age range|date of birth|religio|consent|privacy|gdpr|data protection|terms (and|&) conditions|terms of (use|service)|i certify|(i |can you |please )?confirm (that )?(the|all|everything)|is true|true and (complete|accurate)|accurate and complete|acknowledge|ai[- ](use|policy|assist|tools)|artificial intelligence|longitude|latitude|marketing)\b/i,
  ],
  ["source", /how did you (hear|find|learn)|where did you (hear|find|see)|referr(al|ed) source|^source$/i],
  ["first_name", /^(first|given|preferred first) ?name\b/i],
  ["last_name", /^(last|family|sur) ?name\b|^surname/i],
  ["full_name", /^(full )?name$|^full name|^your name/i],
  ["email", /e-?mail/i],
  ["phone", /phone|mobile|telephone/i],
  ["linkedin", /linkedin/i],
  ["github", /github/i],
  ["twitter", /twitter|\bx\.com\b/i],
  ["portfolio", /portfolio|personal (web)?site|website|blog/i],
  ["resume", /resume|\bcv\b|curriculum/i],
  ["cover_letter", /cover letter|motivation(al)? letter/i],
  ["current_company", /(current|most recent|present) (company|employer|organi[sz]ation)|^company$|^org$/i],
  ["current_title", /(current|most recent|present) (job )?(title|role|position)/i],
  ["years", /years of (professional |relevant |work )?experience|how many years/i],
  ["sponsorship", /sponsor/i],
  ["work_auth", /(authori[sz]ed|eligible|right|permit(ted)?|legally able) to work|work (permit|authori[sz]ation)|visa status/i],
  ["relocation", /relocat|willing to (move|work from|work on-?site)|on-?site|in[- ]office|based in|located in|commut/i],
  ["notice", /notice period|availability/i],
  ["start_date", /start date|when can you start|earliest (start|date)|available to start/i],
  ["salary", /salary|compensation|pay expectation|expected (pay|rate)|desired (pay|rate)|rate expectation/i],
  ["location", /^(current )?(location|city)\b|where are you (based|located)|country of residence|city of residence/i],
];

const CONTACT = new Set<Kind>(["first_name", "last_name", "full_name", "email", "phone", "linkedin", "github", "twitter", "portfolio", "current_company", "current_title"]);

export function classify(field: Pick<FormField, "label" | "key" | "type">): Kind {
  const label = field.label.trim();
  // A long or free-text question that mentions GitHub is a question, not the GitHub field.
  const short = label.length <= 60 && field.type !== "textarea";
  for (const [kind, re] of RULES) {
    if (kind !== "yours" && CONTACT.has(kind) && !short) continue;
    if (re.test(label) || (kind === "yours" && /^(longitude|latitude)$/i.test(field.key))) return kind;
  }
  if (field.type === "file") return "resume";
  return "question";
}

// Countries a question can name, mapped to the keys of work_auth/relocate.
const PLACES: [string, RegExp][] = [
  ["SA", /saudi|riyadh|jeddah|dammam|ksa\b/i],
  ["AE", /\buae\b|emirates|dubai|abu dhabi|sharjah/i],
  ["QA", /qatar|doha/i],
  ["UK", /\buk\b|united kingdom|britain|england|london|scotland|manchester/i],
  ["US", /\bus\b|\busa\b|united states|america/i],
  ["PK", /pakistan|karachi|lahore|islamabad/i],
  [
    "EU",
    /\beu\b|europe|germany|berlin|munich|netherlands|amsterdam|france|paris|spain|madrid|barcelona|ireland|dublin|poland|warsaw|bulgaria|sofia|portugal|lisbon|italy|milan|sweden|stockholm|denmark|copenhagen|finland|helsinki|austria|vienna|belgium|brussels|czech|prague|romania|greece|switzerland|zurich/i,
  ],
];

/** The country a question is about: named in it, "where you live", or the job's own. */
export function placeOf(label: string, jobPlace: string | null): string | null {
  if (/(currently )?reside|where you live|current country|country you (are )?(currently )?(in|based)/i.test(label)) return "PK";
  for (const [code, re] of PLACES) if (re.test(label)) return code;
  return jobPlace;
}

/** The job's country, from its countries list, region or location text. */
export function jobPlace(job: { countries: string[]; region: string | null; location_raw: string | null }): string | null {
  const text = [...job.countries, job.location_raw ?? ""].join(" ");
  for (const [code, re] of PLACES) if (re.test(text)) return code;
  if (job.region === "saudi") return "SA";
  if (job.region === "europe") return "EU";
  return null;
}

/** The option that says yes or no, whatever the form calls it. */
export function pickYesNo(yes: boolean, options?: string[]): string {
  if (!options?.length) return yes ? "Yes" : "No";
  const want = yes ? /^\s*(yes|true|y)\b/i : /^\s*(no|false|n)\b/i;
  return options.find((o) => want.test(o)) ?? (yes ? "Yes" : "No");
}

/** The option nearest to a number, for "years of experience" and "notice" dropdowns. */
export function pickNumber(n: number, options: string[], unitDays = 1): string | null {
  let best: { option: string; diff: number } | null = null;
  for (const option of options) {
    const lower = option.toLowerCase();
    let value: number | null = null;
    if (/immediate|right away|asap/.test(lower)) value = 0;
    else if (/less than|under|<\s*1/.test(lower)) value = 0.5;
    else {
      const m = lower.match(/(\d+(?:\.\d+)?)/);
      if (m) {
        value = Number(m[1]);
        if (unitDays !== 1) value *= /month/.test(lower) ? 30 : /week/.test(lower) ? 7 : /day/.test(lower) ? 1 : 1;
      }
    }
    if (value === null) continue;
    // "3+ years" covers anything at or above 3.
    const diff = /\+|or more|above/.test(lower) && n >= value ? 0 : Math.abs(value - n);
    if (!best || diff < best.diff) best = { option, diff };
  }
  return best?.option ?? null;
}

const REGION_OF: Record<string, string> = { SA: "saudi", AE: "gulf", QA: "gulf", EU: "europe", UK: "uk", US: "us" };

export interface ClassifyContext {
  profile: CandidateProfile;
  latestRole: LedgerRole | null;
  job: {
    countries: string[];
    region: string | null;
    location_raw: string | null;
    pay_min: number | null;
    pay_max: number | null;
    remote_scope: string;
    source_credit: string | null;
  };
  coverLetter: string | null;
  now: number;
}

/** Answers what code can answer; returns null when the drafter should take it. */
export function answerStandard(field: FormField, ctx: ClassifyContext): Answer | null {
  const kind = classify(field);
  const base = {
    key: field.key,
    label: field.label,
    kind,
    type: field.type,
    required: field.required,
    ...(field.options ? { options: field.options } : {}),
    ...(field.maxLength ? { maxLength: field.maxLength } : {}),
  };
  const { profile: p, job } = ctx;
  const fromProfile = (value: string | undefined | null, missing: string): Answer =>
    value ? { ...base, value, source: "profile" } : { ...base, value: null, source: "profile", flag: missing };
  const place = placeOf(field.label, jobPlace(job));

  switch (kind) {
    case "yours":
      return { ...base, value: null, source: "you", flag: "Yours to answer. Signal Desk never fills or stores this." };
    case "first_name":
      return fromProfile(p.contact.first_name, "Add your first name in Resume → Form facts.");
    case "last_name":
      return fromProfile(p.contact.last_name, "Add your last name in Resume → Form facts.");
    case "full_name":
      return fromProfile([p.contact.first_name, p.contact.last_name].filter(Boolean).join(" "), "Add your name in Resume → Form facts.");
    case "email":
      return fromProfile(p.contact.email, "Add your email in Resume → Form facts.");
    case "phone":
      return fromProfile(p.contact.phone, "Add your phone number in Resume → Form facts.");
    case "location":
      return fromProfile([p.contact.city, p.contact.country].filter(Boolean).join(", "), "Add your city in Resume → Form facts.");
    case "linkedin":
      return fromProfile(p.links.linkedin, "Add your LinkedIn link in Resume → Form facts.");
    case "github":
      return fromProfile(p.links.github, "Add your GitHub link in Resume → Form facts.");
    case "portfolio":
      return fromProfile(p.links.portfolio ?? p.links.website, "Add your portfolio link in Resume → Form facts.");
    case "twitter":
      return { ...base, value: null, source: "profile" };
    case "resume":
      return { ...base, value: "Attach the tailored resume PDF from step 1.", source: "resume" };
    case "cover_letter":
      return ctx.coverLetter
        ? { ...base, value: ctx.coverLetter, source: "drafted" }
        : { ...base, value: null, source: "drafted", flag: field.required ? "Draft the cover letter in step 3." : "Optional. Draft one in step 3 if you like." };
    case "current_company":
      return fromProfile(ctx.latestRole?.employer, "Add your resume so the ledger knows your current role.");
    case "current_title":
      return fromProfile(ctx.latestRole?.title, "Add your resume so the ledger knows your current role.");
    case "years": {
      const n = p.years_experience;
      if (n === null) return fromProfile(null, "Add your years of experience in Resume → Form facts.");
      return { ...base, value: field.options ? (pickNumber(n, field.options) ?? String(n)) : String(n), source: "profile" };
    }
    case "work_auth": {
      const auth = place ? p.work_auth[place] : undefined;
      if (!auth) return fromProfile(null, `Set your work authorisation${place ? ` for ${place}` : ""} in Resume → Form facts.`);
      return {
        ...base,
        value: field.type === "boolean" || field.options ? pickYesNo(auth === "yes", field.options) : auth === "yes" ? "Yes" : "No, I would need sponsorship",
        source: "profile",
        flag: "Knockout question. Check it matches this country.",
      };
    }
    case "sponsorship": {
      const auth = place ? p.work_auth[place] : undefined;
      if (!auth) return fromProfile(null, `Set your work authorisation${place ? ` for ${place}` : ""} in Resume → Form facts.`);
      return {
        ...base,
        value: pickYesNo(auth === "sponsorship", field.options),
        source: "profile",
        flag: "Knockout question. Answer truthfully; many Gulf and EU roles sponsor anyway.",
      };
    }
    case "relocation": {
      if (/based in|located in/i.test(field.label)) {
        const here = place === "PK";
        return { ...base, value: field.options || field.type === "boolean" ? pickYesNo(here, field.options) : null, source: "profile", flag: "Check: this asks where you live now." };
      }
      const yes = place ? p.relocate[place] : undefined;
      if (yes === undefined) return null;
      return { ...base, value: field.options || field.type === "boolean" ? pickYesNo(yes, field.options) : yes ? "Yes" : "No", source: "profile", flag: "Confirm before you send." };
    }
    case "notice": {
      const w = p.notice_weeks;
      if (w === null) return fromProfile(null, "Add your notice period in Resume → Form facts.");
      const text = w === 0 ? "Available immediately" : `${w} week${w === 1 ? "" : "s"}`;
      return { ...base, value: field.options ? (pickNumber(w * 7, field.options, 7) ?? text) : text, source: "profile" };
    }
    case "start_date": {
      const w = p.notice_weeks;
      if (w === null) return fromProfile(null, "Add your notice period in Resume → Form facts.");
      const d = new Date(ctx.now + w * 7 * 86_400_000).toISOString().slice(0, 10);
      return { ...base, value: field.type === "date" ? d : `${d} (${w ? `${w} weeks' notice` : "available now"})`, source: "profile" };
    }
    case "salary": {
      if (job.pay_min || job.pay_max) return { ...base, value: "Open within the posted range.", source: "profile", flag: "Or give your own figure." };
      const region = (place && REGION_OF[place]) ?? (job.remote_scope === "worldwide" || job.remote_scope === "region" ? "remote" : null);
      const range = region ? p.salary[region] : undefined;
      if (!range || (range.min === null && range.max === null)) {
        return fromProfile(null, `Add your salary range${region ? ` for ${region}` : ""} in Resume → Form facts. Never guessed.`);
      }
      const fmt = (n: number) => n.toLocaleString("en");
      const amount = [range.min, range.max].filter((n): n is number => n !== null).map(fmt).join(" to ");
      return { ...base, value: `${range.currency} ${amount} per ${range.period}`, source: "profile" };
    }
    case "source": {
      const credit = ctx.job.source_credit;
      if (field.options) {
        const pick =
          field.options.find((o) => /career|company (web)?site|website/i.test(o)) ??
          field.options.find((o) => /job board|online|internet|google/i.test(o)) ??
          field.options.find((o) => /other/i.test(o));
        return pick ? { ...base, value: pick, source: "profile" } : null;
      }
      return { ...base, value: credit ? `${credit} job board` : "Your careers site", source: "profile" };
    }
    default:
      return null;
  }
}
