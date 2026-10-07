import { decodeEntities, htmlToText } from "@/lib/feeds/text";

// Reads an application form's fields from the ATS's public endpoints, without
// logging in. Each reader returns the same shape; the classifier and drafter
// never see which ATS it came from.

export type Ats = "greenhouse" | "ashby" | "lever" | "workable" | "recruitee" | "smartrecruiters" | "manual";

export type FieldType = "text" | "textarea" | "select" | "multiselect" | "boolean" | "file" | "number" | "date";

export interface FormField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  maxLength?: number;
  description?: string;
}

export interface ApplicationForm {
  ats: Ats;
  fields: FormField[];
  /** Notices he should read, e.g. an employer's AI-use policy. */
  notices: string[];
  fetchedAt: string;
}

const USER_AGENT = "SignalDesk/1.0 (personal job search)";

async function get(url: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: { "User-Agent": USER_AGENT, Accept: "application/json, text/html;q=0.9", ...init.headers },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${new URL(url).host}`);
  return response;
}

export interface FormTarget {
  ats: Exclude<Ats, "manual">;
  board: string;
  id: string;
}

/** Which ATS hosts the form, from the apply link (and the board token for embedded Greenhouse). */
export function detectAts(job: { url_apply: string; source: string; source_id: string; source_token: string | null }): FormTarget | null {
  let url: URL;
  try {
    url = new URL(job.url_apply);
  } catch {
    return null;
  }
  const path = url.pathname.split("/").filter(Boolean);
  if (/(^|\.)greenhouse\.io$/.test(url.hostname)) {
    const at = path.indexOf("jobs");
    if (at > 0 && path[at + 1]) return { ats: "greenhouse", board: path[at - 1], id: path[at + 1] };
  }
  const ghJid = url.searchParams.get("gh_jid");
  if (ghJid && job.source === "greenhouse" && job.source_token) return { ats: "greenhouse", board: job.source_token, id: ghJid };
  if (url.hostname === "jobs.ashbyhq.com" && path.length >= 2) return { ats: "ashby", board: path[0], id: path[1] };
  if (/^jobs(\.eu)?\.lever\.co$/.test(url.hostname) && path.length >= 2) {
    return { ats: "lever", board: `${url.hostname.includes(".eu.") ? "eu:" : ""}${path[0]}`, id: path[1] };
  }
  if (url.hostname === "apply.workable.com") {
    const j = path.indexOf("j");
    if (j !== -1 && path[j + 1]) return { ats: "workable", board: path[0] === "j" ? "" : path[0], id: path[j + 1] };
  }
  // Recruitee boards often sit on the company's own domain (jobs.acme.com/o/slug).
  const o = path.indexOf("o");
  if (/\.recruitee\.com$/.test(url.hostname) && o !== -1 && path[o + 1]) {
    return { ats: "recruitee", board: url.hostname.split(".")[0], id: path[o + 1] };
  }
  if (job.source === "recruitee" && job.source_token && o !== -1 && path[o + 1]) return { ats: "recruitee", board: job.source_token, id: path[o + 1] };
  if (url.hostname === "jobs.smartrecruiters.com" && path.length >= 2) {
    const id = path[1].match(/^\d+/)?.[0];
    if (id) return { ats: "smartrecruiters", board: path[0], id };
  }
  return null;
}

export async function readForm(target: FormTarget): Promise<ApplicationForm> {
  const read = { greenhouse, ashby, lever, workable, recruitee, smartrecruiters }[target.ats];
  const { fields, notices } = await read(target);
  // Greenhouse's location autocomplete fills these hidden inputs; nobody types them.
  const shown = fields.filter((f) => !/^(longitude|latitude|location_?hidden)$/i.test(f.key) && !/^(longitude|latitude)$/i.test(f.label));
  return { ats: target.ats, fields: shown, notices, fetchedAt: new Date().toISOString() };
}

/** One question per line, pasted from a form the app can't read. */
export function formFromQuestions(text: string): ApplicationForm {
  const lines = text
    .split("\n")
    .map((l) => l.replace(/^[\s*•\-\d.)]+/, "").trim())
    .filter((l) => l.length > 2);
  return {
    ats: "manual",
    fields: [...new Set(lines)].slice(0, 40).map((label, i) => ({
      key: `q${i + 1}`,
      label,
      type: label.length > 60 || /\?$/.test(label) ? "textarea" : "text",
      required: false,
    })),
    notices: [],
    fetchedAt: new Date().toISOString(),
  };
}

type Reader = (t: FormTarget) => Promise<{ fields: FormField[]; notices: string[] }>;

const greenhouse: Reader = async ({ board, id }) => {
  type Q = {
    label: string;
    required: boolean;
    description?: string | null;
    fields: { name: string; type: string; values?: { label: string }[] }[];
  };
  type Job = { questions?: Q[]; location_questions?: Q[]; ai_disclaimer?: string | null; include_ai_disclaimer?: boolean };
  const job = (await (
    await get(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs/${encodeURIComponent(id)}?questions=true`)
  ).json()) as Job;
  const fields: FormField[] = [];
  for (const q of [...(job.questions ?? []), ...(job.location_questions ?? [])]) {
    // Resume and cover letter come as a file plus a paste box; keep the file.
    const f = q.fields.find((x) => x.type === "input_file") ?? q.fields[0];
    if (!f) continue;
    const type: FieldType =
      f.type === "input_file"
        ? "file"
        : f.type === "textarea"
          ? "textarea"
          : f.type === "multi_value_single_select"
            ? "select"
            : f.type === "multi_value_multi_select"
              ? "multiselect"
              : "text";
    fields.push({
      key: f.name,
      label: q.label,
      type,
      required: q.required,
      ...(f.values?.length ? { options: f.values.map((v) => v.label) } : {}),
      ...(q.description ? { description: htmlToText(q.description).slice(0, 400) } : {}),
    });
  }
  const notices = job.include_ai_disclaimer && job.ai_disclaimer ? [htmlToText(job.ai_disclaimer)] : [];
  return { fields, notices };
};

const ashby: Reader = async ({ board, id }) => {
  const query = `query ApiJobPosting($organizationHostedJobsPageName: String!, $jobPostingId: String!) {
    jobPosting(organizationHostedJobsPageName: $organizationHostedJobsPageName, jobPostingId: $jobPostingId) {
      applicationForm { sections { title fieldEntries { ... on FormFieldEntry { field isRequired descriptionHtml isHidden } } } }
    }
  }`;
  type Entry = {
    field: { path: string; title: string; type: string; selectableValues?: { label: string }[] };
    isRequired: boolean;
    descriptionHtml: string | null;
    isHidden?: boolean;
  };
  type Res = { data?: { jobPosting: { applicationForm: { sections: { fieldEntries: Entry[] }[] } } | null }; errors?: { message: string }[] };
  const res = (await (
    await get("https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobPosting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operationName: "ApiJobPosting", variables: { organizationHostedJobsPageName: board, jobPostingId: id }, query }),
    })
  ).json()) as Res;
  if (res.errors?.length) throw new Error(`Ashby: ${res.errors[0].message}`);
  const sections = res.data?.jobPosting?.applicationForm.sections;
  if (!sections) throw new Error("Ashby didn't return a form for this job. It may have closed.");
  const TYPES: Record<string, FieldType> = {
    String: "text",
    Email: "text",
    Phone: "text",
    Location: "text",
    LongText: "textarea",
    File: "file",
    Boolean: "boolean",
    ValueSelect: "select",
    MultiValueSelect: "multiselect",
    Number: "number",
    Date: "date",
  };
  const fields = sections
    .flatMap((s) => s.fieldEntries)
    .filter((e) => e.field && !e.isHidden)
    .map((e) => ({
      key: e.field.path,
      label: e.field.title,
      type: TYPES[e.field.type] ?? "text",
      required: e.isRequired,
      ...(e.field.selectableValues?.length ? { options: e.field.selectableValues.map((v) => v.label.trim()) } : {}),
      ...(e.descriptionHtml ? { description: htmlToText(e.descriptionHtml).slice(0, 400) } : {}),
    }));
  return { fields, notices: [] };
};

const lever: Reader = async ({ board, id }) => {
  const eu = board.startsWith("eu:");
  const site = eu ? board.slice(3) : board;
  const html = await (await get(`https://jobs${eu ? ".eu" : ""}.lever.co/${encodeURIComponent(site)}/${encodeURIComponent(id)}/apply`)).text();
  const fields: FormField[] = [];
  for (const block of html.matchAll(/<li class="application-question[^"]*">([\s\S]*?)<\/li>/g)) {
    const label = decodeEntities(htmlToText(/<div class="application-label[^"]*">([\s\S]*?)<\/div>/.exec(block[1])?.[1] ?? ""));
    const name = /name="([^"]+)"/.exec(block[1])?.[1];
    if (!label || !name || name.startsWith("cards[")) continue;
    const isFile = /type="file"/.test(block[1]);
    fields.push({
      key: name,
      label: label.replace(/\s*✱\s*$/, ""),
      type: isFile ? "file" : /<textarea/.test(block[1]) ? "textarea" : "text",
      required: /✱/.test(label),
    });
  }
  // Custom questions sit in JSON templates, one per card.
  for (const m of html.matchAll(/name="cards\[([^\]]+)\]\[baseTemplate\]"[^>]*value="([^"]*)"|value="([^"]*)"[^>]*name="cards\[([^\]]+)\]\[baseTemplate\]"/g)) {
    const card = m[1] ?? m[4];
    type Card = { fields: { type: string; text: string; description?: string; required: boolean; options?: { text: string }[] }[] };
    let parsed: Card;
    try {
      parsed = JSON.parse(decodeEntities(m[2] ?? m[3])) as Card;
    } catch {
      continue;
    }
    parsed.fields.forEach((f, i) =>
      fields.push({
        key: `cards[${card}][field${i}]`,
        label: f.text,
        type:
          f.type === "multiple-choice" || f.type === "dropdown"
            ? "select"
            : f.type === "multiple-select"
              ? "multiselect"
              : f.type === "textarea"
                ? "textarea"
                : "text",
        required: f.required,
        ...(f.options?.length ? { options: f.options.map((o) => o.text) } : {}),
        ...(f.description ? { description: f.description } : {}),
      }),
    );
  }
  if (!fields.length) throw new Error("Couldn't find the form on Lever's apply page.");
  return { fields, notices: [] };
};

const workable: Reader = async ({ id }) => {
  type F = { id: string; label: string; type: string; required: boolean; maxLength?: number; options?: { value: string }[] };
  const sections = (await (await get(`https://apply.workable.com/api/v1/jobs/${encodeURIComponent(id)}/form`)).json()) as { fields: F[] }[];
  const TYPES: Record<string, FieldType> = {
    text: "text",
    email: "text",
    phone: "text",
    paragraph: "textarea",
    file: "file",
    boolean: "boolean",
    dropdown: "select",
    multiple: "multiselect",
    date: "date",
    number: "number",
  };
  const fields = sections.flatMap((s) =>
    s.fields.map((f) => ({
      key: f.id,
      label: f.label,
      type: TYPES[f.type] ?? "text",
      required: f.required,
      ...(f.maxLength && f.maxLength < 10_000 ? { maxLength: f.maxLength } : {}),
      ...(f.options?.length ? { options: f.options.map((o) => o.value.trim()) } : {}),
    })),
  );
  return { fields, notices: [] };
};

const recruitee: Reader = async ({ board, id }) => {
  type Q = {
    id: number;
    body: string;
    kind: string;
    required: boolean;
    options: { length?: number };
    open_question_options: { body: string }[];
  };
  type Offer = { open_questions: Q[]; options_cv: string; options_cover_letter: string; options_phone: string; options_photo: string };
  const { offer } = (await (await get(`https://${board}.recruitee.com/api/offers/${encodeURIComponent(id)}`)).json()) as { offer: Offer };
  const TYPES: Record<string, FieldType> = {
    text: "textarea",
    string: "text",
    boolean: "boolean",
    single_choice: "select",
    multi_choice: "multiselect",
    file: "file",
    date: "date",
    number: "number",
  };
  const standard: FormField[] = [
    { key: "name", label: "Full name", type: "text", required: true },
    { key: "email", label: "Email", type: "text", required: true },
    ...(offer.options_phone !== "off" ? [{ key: "phone", label: "Phone", type: "text" as const, required: offer.options_phone === "required" }] : []),
    ...(offer.options_cv !== "off" ? [{ key: "cv", label: "Resume", type: "file" as const, required: offer.options_cv === "required" }] : []),
    ...(offer.options_cover_letter !== "off"
      ? [{ key: "cover_letter", label: "Cover letter", type: "file" as const, required: offer.options_cover_letter === "required" }]
      : []),
  ];
  const notices: string[] = [];
  const questions = offer.open_questions.flatMap((q): FormField[] => {
    // Infoboxes are text for the candidate to read, often the employer's visa rules.
    if (q.kind === "infobox") {
      const text = htmlToText(decodeEntities(q.body)).trim();
      if (text) notices.push(text);
      return [];
    }
    return [
      {
        key: String(q.id),
        label: htmlToText(q.body).trim(),
        type: TYPES[q.kind] ?? "text",
        required: q.required,
        ...(q.options.length && q.options.length < 10_000 ? { maxLength: q.options.length } : {}),
        ...(q.open_question_options.length ? { options: q.open_question_options.map((x) => x.body.trim()) } : {}),
      },
    ];
  });
  return { fields: [...standard, ...questions], notices };
};

// SmartRecruiters serves screening questions only to partners with an API key,
// so this returns the fields every posting has and asks him to paste the rest.
const smartrecruiters: Reader = async ({ board, id }) => {
  await get(`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(board)}/postings/${encodeURIComponent(id)}`);
  const fields: FormField[] = [
    { key: "firstName", label: "First name", type: "text", required: true },
    { key: "lastName", label: "Last name", type: "text", required: true },
    { key: "email", label: "Email", type: "text", required: true },
    { key: "phone", label: "Phone", type: "text", required: false },
    { key: "location", label: "Location (city)", type: "text", required: false },
    { key: "resume", label: "Resume", type: "file", required: true },
    { key: "linkedin", label: "LinkedIn", type: "text", required: false },
    { key: "message", label: "Message to the hiring team", type: "textarea", required: false },
  ];
  return {
    fields,
    notices: [
      "SmartRecruiters doesn't share its screening questions publicly. These are the fields every posting has. If the form asks more, use Paste questions instead.",
    ],
  };
};
