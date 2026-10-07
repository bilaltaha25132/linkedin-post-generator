import { decodeEntities, htmlToText } from "@/lib/feeds/text";
import type { JobSource, RawJob } from "@/lib/jobs/types";

const USER_AGENT = "SignalDesk/1.0 (personal job search)";

export interface Pull {
  jobs: RawJob[];
  /** The source listed every open role, so a role missing from it has closed. */
  complete: boolean;
}

type Puller = (source: JobSource) => Promise<Pull>;

/** How often each kind is read. ATS boards change slowly; HN posts one thread a month. */
export const INTERVAL_HOURS: Record<string, number> = {
  hn: 24,
  remotive: 6, // Remotive asks for at most 4 calls a day
  remoteok: 3,
  himalayas: 3,
  jobicy: 3,
  wwr: 3,
  arbeitnow: 6,
};
export const ATS_INTERVAL_HOURS = 6;

export const PULLERS: Record<string, Puller> = {
  greenhouse,
  lever,
  ashby,
  workable,
  smartrecruiters,
  recruitee,
  pinpoint,
  personio,
  teamtailor,
  remotive,
  remoteok,
  himalayas,
  jobicy,
  wwr,
  arbeitnow,
  hn,
};

/** Kinds that are one company's own board, as opposed to a job board. */
export const ATS_KINDS = new Set([
  "greenhouse",
  "lever",
  "ashby",
  "workable",
  "smartrecruiters",
  "recruitee",
  "pinpoint",
  "personio",
  "teamtailor",
]);

/** Public careers page for a company board, for the Sources list. */
export function boardUrl(source: Pick<JobSource, "kind" | "token">): string | null {
  const t = encodeURIComponent(source.token);
  switch (source.kind) {
    case "greenhouse":
      return `https://job-boards.greenhouse.io/${t}`;
    case "lever":
      return `https://jobs.lever.co/${t}`;
    case "ashby":
      return `https://jobs.ashbyhq.com/${t}`;
    case "workable":
      return `https://apply.workable.com/${t}/`;
    case "smartrecruiters":
      return `https://careers.smartrecruiters.com/${t}`;
    case "recruitee":
      return `https://${t}.recruitee.com/`;
    case "pinpoint":
      return `https://${t}.pinpointhq.com/`;
    case "personio":
      return `https://${t}.jobs.personio.de/`;
    case "teamtailor":
      return `https://${t}.teamtailor.com/jobs`;
    default:
      return null;
  }
}

/**
 * Boards whose list omits the description: read it from the posting itself, once,
 * just before the role is scored. `sourceId` is the stored "token:id".
 */
export async function fetchDescription(kind: string, sourceId: string): Promise<string | null> {
  const split = sourceId.indexOf(":");
  const token = encodeURIComponent(sourceId.slice(0, split));
  const id = encodeURIComponent(sourceId.slice(split + 1));
  if (kind === "workable") {
    type Detail = { description?: string; requirements?: string; benefits?: string };
    const j = await getJson<Detail>(`https://apply.workable.com/api/v1/accounts/${token}/jobs/${id}`);
    return [j.description, j.requirements, j.benefits].map(text).join("\n\n").trim() || null;
  }
  if (kind === "smartrecruiters") {
    type Detail = { jobAd?: { sections?: Record<string, { title?: string; text?: string }> } };
    const j = await getJson<Detail>(`https://api.smartrecruiters.com/v1/companies/${token}/postings/${id}`);
    const sections = Object.values(j.jobAd?.sections ?? {});
    return sections.map((sec) => `${sec.title ?? ""}\n${text(sec.text)}`).join("\n\n").trim() || null;
  }
  return null;
}

async function get(url: string, accept = "application/json", retry = true): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: accept },
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
  } catch (err) {
    // A dropped connection ("fetch failed") usually goes through on a second try.
    if (retry && (err as Error).name !== "TimeoutError") return get(url, accept, false);
    throw err;
  }
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${new URL(url).host}`);
  return response;
}

async function getJson<T>(url: string): Promise<T> {
  return (await get(url)).json() as Promise<T>;
}

async function getText(url: string): Promise<string> {
  return (await get(url, "application/xml, application/rss+xml, text/xml;q=0.9, */*;q=0.8")).text();
}

const text = (html: string | null | undefined) => (html ? htmlToText(html) : "");
const iso = (value: string | number | null | undefined): string | null => {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(typeof value === "number" && value < 1e12 ? value * 1000 : value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

function blank(partial: Partial<RawJob> & Pick<RawJob, "sourceId" | "company" | "title" | "urlApply">): RawJob {
  return {
    location: "",
    countries: [],
    remote: null,
    employmentType: null,
    payMin: null,
    payMax: null,
    currency: null,
    payPeriod: null,
    urlSource: null,
    postedAt: null,
    description: "",
    ...partial,
  };
}

// ---------------------------------------------------------------------------
// Company boards

async function greenhouse(source: JobSource): Promise<Pull> {
  type Gh = {
    jobs: {
      id: number;
      title: string;
      absolute_url: string;
      location: { name: string } | null;
      offices: { location: string | null }[];
      metadata: { name: string; value: unknown }[] | null;
      first_published: string | null;
      updated_at: string;
      content: string;
      company_name?: string;
    }[];
  };
  const data = await getJson<Gh>(
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(source.token)}/jobs?content=true`,
  );
  const jobs = data.jobs.map((j) => {
    const meta = (j.metadata ?? []).map((m) => `${m.value ?? ""}`).join(" ");
    const location = j.location?.name ?? "";
    return blank({
      sourceId: String(j.id),
      company: j.company_name || source.name,
      title: j.title.trim(),
      location,
      countries: j.offices.map((o) => o.location ?? "").filter(Boolean),
      remote: /remote/i.test(`${location} ${meta}`),
      hybrid: /hybrid/i.test(meta),
      urlApply: j.absolute_url,
      postedAt: iso(j.first_published ?? j.updated_at),
      // Greenhouse escapes the HTML once more inside the JSON.
      description: text(decodeEntities(j.content)),
    });
  });
  return { jobs, complete: true };
}

async function lever(source: JobSource): Promise<Pull> {
  type Lever = {
    id: string;
    text: string;
    hostedUrl: string;
    applyUrl: string;
    createdAt: number;
    country: string | null;
    workplaceType: string;
    categories: { commitment?: string; location?: string; allLocations?: string[] };
    descriptionPlain: string;
    lists: { text: string; content: string }[];
    additionalPlain: string;
    salaryRange?: { min: number; max: number; currency: string; interval: string };
  };
  // Tokens prefixed "eu:" live on Lever's EU host.
  const eu = source.token.startsWith("eu:");
  const site = encodeURIComponent(eu ? source.token.slice(3) : source.token);
  const data = await getJson<Lever[]>(`https://api${eu ? ".eu" : ""}.lever.co/v0/postings/${site}?mode=json`);
  const jobs = data.map((j) =>
    blank({
      sourceId: j.id,
      company: source.name,
      title: j.text.trim(),
      location: (j.categories.allLocations?.length ? j.categories.allLocations : [j.categories.location ?? ""]).join(
        "; ",
      ),
      countries: j.country ? [j.country] : [],
      remote: j.workplaceType === "remote" ? true : j.workplaceType === "unspecified" ? null : false,
      hybrid: j.workplaceType === "hybrid",
      employmentType: j.categories.commitment ?? null,
      payMin: j.salaryRange?.min ?? null,
      payMax: j.salaryRange?.max ?? null,
      currency: j.salaryRange?.currency ?? null,
      payPeriod: j.salaryRange?.interval ?? null,
      urlApply: j.applyUrl || j.hostedUrl,
      urlSource: j.hostedUrl,
      postedAt: iso(j.createdAt),
      description: [j.descriptionPlain, ...j.lists.map((l) => `${l.text}\n${text(l.content)}`), j.additionalPlain]
        .filter(Boolean)
        .join("\n\n"),
    }),
  );
  return { jobs, complete: true };
}

async function ashby(source: JobSource): Promise<Pull> {
  type Ashby = {
    jobs: {
      id: string;
      title: string;
      location: string;
      secondaryLocations?: { location: string }[];
      address?: { postalAddress?: { addressCountry?: string } };
      isRemote: boolean;
      isListed: boolean;
      workplaceType?: string;
      employmentType?: string;
      publishedAt: string;
      jobUrl: string;
      applyUrl: string;
      descriptionPlain: string;
      compensation?: {
        summaryComponents?: {
          compensationType: string;
          interval: string;
          currencyCode: string | null;
          minValue: number | null;
          maxValue: number | null;
        }[];
      };
    }[];
  };
  const data = await getJson<Ashby>(
    `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(source.token)}?includeCompensation=true`,
  );
  const jobs = data.jobs
    .filter((j) => j.isListed !== false)
    .map((j) => {
      const salary = j.compensation?.summaryComponents?.find((c) => c.compensationType === "Salary");
      const country = j.address?.postalAddress?.addressCountry;
      return blank({
        sourceId: j.id,
        company: source.name,
        title: j.title.trim(),
        location: [j.location, ...(j.secondaryLocations ?? []).map((l) => l.location)].join("; "),
        countries: country ? [country] : [],
        remote: j.isRemote || j.workplaceType === "Remote",
        hybrid: j.workplaceType === "Hybrid",
        employmentType: j.employmentType ?? null,
        payMin: salary?.minValue ?? null,
        payMax: salary?.maxValue ?? null,
        currency: salary?.currencyCode ?? null,
        payPeriod: salary?.interval ?? null,
        urlApply: j.applyUrl || j.jobUrl,
        urlSource: j.jobUrl,
        postedAt: iso(j.publishedAt),
        description: j.descriptionPlain ?? "",
      });
    });
  return { jobs, complete: true };
}

async function workable(source: JobSource): Promise<Pull> {
  type Workable = {
    name: string;
    jobs: {
      shortcode: string;
      title: string;
      employment_type: string;
      telecommuting: boolean;
      url: string;
      application_url: string;
      published_on: string;
      country: string;
      city: string;
      locations?: { country: string; city: string }[];
    }[];
  };
  const data = await getJson<Workable>(
    `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(source.token)}`,
  );
  const jobs = data.jobs.map((j) => {
    const locations = j.locations?.length ? j.locations : [{ city: j.city, country: j.country }];
    return blank({
      sourceId: j.shortcode,
      company: data.name || source.name,
      title: j.title.trim(),
      location: locations.map((l) => [l.city, l.country].filter(Boolean).join(", ")).join("; "),
      countries: locations.map((l) => l.country).filter(Boolean),
      remote: j.telecommuting,
      employmentType: j.employment_type || null,
      urlApply: j.application_url || j.url,
      urlSource: j.url,
      postedAt: iso(j.published_on),
    });
  });
  return { jobs, complete: true };
}

async function smartrecruiters(source: JobSource): Promise<Pull> {
  type Sr = {
    content: {
      id: string;
      name: string;
      company: { name: string };
      releasedDate: string;
      location: { fullLocation?: string; city?: string; country?: string; remote?: boolean; hybrid?: boolean };
      typeOfEmployment?: { label?: string };
    }[];
  };
  const id = encodeURIComponent(source.token);
  const data = await getJson<Sr>(`https://api.smartrecruiters.com/v1/companies/${id}/postings?limit=100`);
  const jobs = data.content.map((j) =>
    blank({
      sourceId: j.id,
      company: j.company?.name || source.name,
      title: j.name.trim(),
      location: j.location.fullLocation ?? [j.location.city, j.location.country].filter(Boolean).join(", "),
      countries: j.location.country ? [j.location.country] : [],
      remote: j.location.remote ?? null,
      hybrid: j.location.hybrid,
      employmentType: j.typeOfEmployment?.label ?? null,
      urlApply: `https://jobs.smartrecruiters.com/${id}/${j.id}`,
      postedAt: iso(j.releasedDate),
    }),
  );
  return { jobs, complete: data.content.length < 100 };
}

async function recruitee(source: JobSource): Promise<Pull> {
  type Recruitee = {
    offers: {
      id: number;
      title: string;
      company_name: string;
      location: string;
      city: string | null;
      country: string | null;
      remote: boolean;
      hybrid: boolean;
      published_at: string;
      employment_type_code: string | null;
      salary?: { min: string | number | null; max: string | number | null; currency: string | null; period: string | null };
      careers_url: string;
      careers_apply_url?: string;
      description: string;
      requirements: string;
    }[];
  };
  const data = await getJson<Recruitee>(`https://${encodeURIComponent(source.token)}.recruitee.com/api/offers/`);
  const jobs = data.offers.map((j) =>
    blank({
      sourceId: String(j.id),
      company: j.company_name || source.name,
      title: j.title.trim(),
      // "Remote job" says nothing about where, so the city and country stand in.
      location: /^remote job$/i.test(j.location) ? [j.city, j.country, "Remote"].filter(Boolean).join(", ") : j.location,
      countries: j.country ? [j.country] : [],
      remote: j.remote,
      hybrid: j.hybrid,
      employmentType: j.employment_type_code,
      payMin: j.salary?.min ? Number(j.salary.min) : null,
      payMax: j.salary?.max ? Number(j.salary.max) : null,
      currency: j.salary?.currency ?? null,
      payPeriod: j.salary?.period ?? null,
      urlApply: j.careers_apply_url || j.careers_url,
      urlSource: j.careers_url,
      postedAt: iso(j.published_at?.replace(" UTC", "Z").replace(" ", "T")),
      description: `${text(j.description)}\n\n${text(j.requirements)}`.trim(),
    }),
  );
  return { jobs, complete: true };
}

async function pinpoint(source: JobSource): Promise<Pull> {
  type Pinpoint = {
    data: {
      id: string;
      title: string;
      url: string;
      workplace_type: string;
      employment_type_text: string | null;
      compensation_minimum: number | null;
      compensation_maximum: number | null;
      compensation_currency: string | null;
      compensation_frequency: string | null;
      description: string;
      key_responsibilities: string | null;
      skills_knowledge_expertise: string | null;
      location: { city: string | null; name: string | null } | null;
    }[];
  };
  const data = await getJson<Pinpoint>(`https://${encodeURIComponent(source.token)}.pinpointhq.com/postings.json`);
  const jobs = data.data.map((j) =>
    blank({
      sourceId: j.id,
      company: source.name,
      title: j.title.trim(),
      location: [j.location?.city, j.location?.name].filter(Boolean).join(", "),
      countries: j.location?.name ? [j.location.name] : [],
      remote: j.workplace_type === "remote",
      hybrid: j.workplace_type === "hybrid",
      employmentType: j.employment_type_text,
      payMin: j.compensation_minimum,
      payMax: j.compensation_maximum,
      currency: j.compensation_currency,
      payPeriod: j.compensation_frequency,
      urlApply: j.url,
      description: [j.description, j.key_responsibilities, j.skills_knowledge_expertise].map(text).join("\n\n").trim(),
    }),
  );
  return { jobs, complete: true };
}

async function personio(source: JobSource): Promise<Pull> {
  const slug = encodeURIComponent(source.token);
  const xml = await getText(`https://${slug}.jobs.personio.de/xml`);
  const jobs = blocks(xml, "position").map((p) => {
    const offices = [tag(p, "office"), ...blocks(tag(p, "additionalOffices", true), "office").map(stripTags)];
    const descriptions = blocks(p, "jobDescription").map((d) => `${tag(d, "name")}\n${text(tag(d, "value", true))}`);
    return blank({
      sourceId: tag(p, "id"),
      company: tag(p, "subcompany") || source.name,
      title: tag(p, "name"),
      location: offices.filter(Boolean).join("; "),
      remote: offices.some((o) => /remote/i.test(o)),
      hybrid: offices.some((o) => /hybrid/i.test(o)),
      employmentType: [tag(p, "employmentType"), tag(p, "schedule")].filter(Boolean).join(", ") || null,
      urlApply: `https://${slug}.jobs.personio.de/job/${tag(p, "id")}`,
      postedAt: iso(tag(p, "createdAt")),
      description: [...descriptions, tag(p, "keywords")].filter(Boolean).join("\n\n"),
    });
  });
  return { jobs, complete: true };
}

async function teamtailor(source: JobSource): Promise<Pull> {
  const xml = await getText(`https://${encodeURIComponent(source.token)}.teamtailor.com/jobs.rss`);
  const jobs = blocks(xml, "item").map((item) => {
    const locations = blocks(item, "tt:location");
    const status = tag(item, "remoteStatus");
    return blank({
      sourceId: tag(item, "guid") || tag(item, "link"),
      company: source.name,
      title: tag(item, "title"),
      location: locations.map((l) => [tag(l, "tt:city"), tag(l, "tt:country")].filter(Boolean).join(", ")).join("; "),
      countries: locations.map((l) => tag(l, "tt:country")).filter(Boolean),
      remote: status === "fully" || status === "remote",
      hybrid: status === "hybrid",
      urlApply: tag(item, "link"),
      postedAt: iso(tag(item, "pubDate")),
      description: text(tag(item, "description", true)),
    });
  });
  return { jobs, complete: true };
}

// ---------------------------------------------------------------------------
// Job boards. Each returns a recent slice, so their jobs close by age instead.

async function remotive(): Promise<Pull> {
  type Remotive = {
    jobs: {
      id: number;
      url: string;
      title: string;
      company_name: string;
      job_type: string;
      publication_date: string;
      candidate_required_location: string;
      salary: string;
      description: string;
    }[];
  };
  const data = await getJson<Remotive>("https://remotive.com/api/remote-jobs?category=software-dev&limit=200");
  const jobs = data.jobs.map((j) =>
    blank({
      sourceId: String(j.id),
      company: j.company_name,
      title: j.title.trim(),
      location: j.candidate_required_location || "Worldwide",
      remote: true,
      employmentType: j.job_type || null,
      urlApply: j.url,
      urlSource: j.url,
      postedAt: iso(`${j.publication_date}Z`),
      description: `${j.salary ? `Salary: ${j.salary}\n\n` : ""}${text(j.description)}`,
    }),
  );
  return { jobs, complete: false };
}

async function remoteok(): Promise<Pull> {
  type RemoteOk = {
    id?: string;
    date: string;
    company: string;
    position: string;
    tags: string[];
    description: string;
    location: string;
    apply_url: string;
    url: string;
    salary_min: number;
    salary_max: number;
  }[];
  // The first element is RemoteOK's legal notice, not a job.
  const data = (await getJson<RemoteOk>("https://remoteok.com/api")).filter((j) => j.id && j.position);
  const jobs = data.map((j) =>
    blank({
      sourceId: String(j.id),
      company: j.company,
      title: j.position.trim(),
      location: j.location || "Worldwide",
      remote: true,
      payMin: j.salary_min || null,
      payMax: j.salary_max || null,
      currency: j.salary_min ? "USD" : null,
      payPeriod: j.salary_min ? "year" : null,
      urlApply: j.apply_url || j.url,
      urlSource: j.url,
      postedAt: iso(j.date),
      description: `${text(j.description)}\n\nTags: ${j.tags.join(", ")}`,
    }),
  );
  return { jobs, complete: false };
}

async function himalayas(): Promise<Pull> {
  type Himalayas = {
    jobs: {
      guid: string;
      title: string;
      companyName: string;
      employmentType: string | null;
      minSalary: number | null;
      maxSalary: number | null;
      currency: string | null;
      salaryPeriod: string | null;
      locationRestrictions: string[];
      pubDate: number;
      applicationLink: string;
      description: string;
    }[];
  };
  const queries = ["ai engineer", "llm", "machine learning engineer"];
  const seen = new Map<string, RawJob>();
  for (const q of queries) {
    const data = await getJson<Himalayas>(`https://himalayas.app/jobs/api/search?q=${encodeURIComponent(q)}&sort=recent`);
    for (const j of data.jobs) {
      seen.set(
        j.guid,
        blank({
          sourceId: j.guid,
          company: j.companyName,
          title: j.title.trim(),
          location: j.locationRestrictions.length ? j.locationRestrictions.join(", ") : "Worldwide",
          countries: j.locationRestrictions,
          remote: true,
          employmentType: j.employmentType,
          payMin: j.minSalary,
          payMax: j.maxSalary,
          currency: j.currency,
          payPeriod: j.salaryPeriod,
          urlApply: j.applicationLink,
          urlSource: j.guid,
          postedAt: iso(j.pubDate),
          description: text(j.description),
        }),
      );
    }
  }
  return { jobs: [...seen.values()], complete: false };
}

async function jobicy(): Promise<Pull> {
  type Jobicy = {
    jobs?: {
      id: number;
      url: string;
      jobTitle: string;
      companyName: string;
      jobType: string[];
      jobGeo: string;
      pubDate: string;
      salaryMin?: number;
      salaryMax?: number;
      salaryCurrency?: string;
      salaryPeriod?: string;
      jobDescription: string;
    }[];
  };
  const data = await getJson<Jobicy>("https://jobicy.com/api/v2/remote-jobs?count=50&industry=engineering");
  const jobs = (data.jobs ?? []).map((j) =>
    blank({
      sourceId: String(j.id),
      company: j.companyName,
      title: decodeEntities(j.jobTitle).trim(),
      location: j.jobGeo || "Anywhere",
      remote: true,
      employmentType: j.jobType.join(", ") || null,
      payMin: j.salaryMin ?? null,
      payMax: j.salaryMax ?? null,
      currency: j.salaryCurrency ?? null,
      payPeriod: j.salaryPeriod ?? null,
      urlApply: j.url,
      urlSource: j.url,
      postedAt: iso(j.pubDate),
      description: text(j.jobDescription),
    }),
  );
  return { jobs, complete: false };
}

async function wwr(): Promise<Pull> {
  const xml = await getText("https://weworkremotely.com/remote-jobs.rss");
  const jobs = blocks(xml, "item").map((item) => {
    // Titles read "Company: Role".
    const full = tag(item, "title");
    const colon = full.indexOf(": ");
    const link = tag(item, "link");
    return blank({
      sourceId: tag(item, "guid") || link,
      company: colon > 0 ? full.slice(0, colon) : "Unknown",
      title: colon > 0 ? full.slice(colon + 2) : full,
      location: tag(item, "region") || "Anywhere",
      remote: true,
      employmentType: tag(item, "type") || null,
      urlApply: link,
      urlSource: link,
      postedAt: iso(tag(item, "pubDate")),
      description: text(tag(item, "description", true)),
    });
  });
  return { jobs, complete: false };
}

async function arbeitnow(): Promise<Pull> {
  type Arbeitnow = {
    data: {
      slug: string;
      company_name: string;
      title: string;
      description: string;
      remote: boolean;
      url: string;
      job_types: string[];
      location: string;
      created_at: number;
    }[];
  };
  const data = await getJson<Arbeitnow>("https://www.arbeitnow.com/api/job-board-api?visa_sponsorship=true");
  const jobs = data.data.map((j) =>
    blank({
      sourceId: j.slug,
      company: j.company_name,
      title: j.title.trim(),
      location: j.location,
      // A Germany-only board: a bare city name still means Germany.
      countries: ["Germany"],
      remote: j.remote,
      employmentType: j.job_types.join(", ") || null,
      urlApply: j.url,
      urlSource: j.url,
      postedAt: iso(j.created_at),
      // The board lists only roles that offer visa sponsorship.
      description: `Visa sponsorship available.\n\n${text(j.description)}`,
    }),
  );
  return { jobs, complete: false };
}

/** Top-level comments of this month's "Ask HN: Who is hiring?" thread. */
async function hn(): Promise<Pull> {
  type Search = { hits: { objectID: string; title?: string; created_at: string }[] };
  const stories = await getJson<Search>(
    "https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&hitsPerPage=5",
  );
  const thread = stories.hits.find((h) => /who is hiring/i.test(h.title ?? ""));
  if (!thread || Date.now() - Date.parse(thread.created_at) > 35 * 86_400_000) return { jobs: [], complete: false };

  type Comments = {
    hits: { objectID: string; comment_text: string | null; created_at: string; parent_id: number; story_id: number }[];
  };
  const comments = await getJson<Comments>(
    `https://hn.algolia.com/api/v1/search?tags=comment,story_${thread.objectID}&hitsPerPage=1000`,
  );
  const jobs = comments.hits
    .filter((c) => c.parent_id === c.story_id && c.comment_text)
    .map((c) => {
      const html = c.comment_text ?? "";
      const body = text(html);
      // By convention the first paragraph reads "Company | Role | Location | Remote | …".
      const head = text(html.split(/<p>/i)[0]).slice(0, 300);
      const parts = head.split("|").map((p) => p.trim()).filter(Boolean);
      const url = `https://news.ycombinator.com/item?id=${c.objectID}`;
      return blank({
        sourceId: c.objectID,
        company: (parts[0] ?? "HN company").slice(0, 80),
        title: (parts.slice(1).find((p) => /engineer|developer|scientist|\b(ml|ai|llms?)\b/i.test(p)) ?? head).slice(0, 160),
        location: parts.slice(2).join(" | ").slice(0, 200),
        remote: /\bremote\b/i.test(head),
        urlApply: url,
        urlSource: url,
        postedAt: iso(c.created_at),
        description: body,
      });
    });
  return { jobs, complete: false };
}

// ---------------------------------------------------------------------------
// A tolerant tag reader for the XML feeds above, as in feeds/rss.ts.

function blocks(xml: string, name: string): string[] {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...xml.matchAll(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)</${escaped}>`, "gi"))].map((m) => m[1]);
}

/** The first `<name>` inside `xml`, CDATA unwrapped; entities decoded unless `raw`. */
function tag(xml: string, name: string, raw = false): string {
  const inner = blocks(xml, name)[0] ?? "";
  const unwrapped = inner.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1").trim();
  return raw ? decodeEntities(unwrapped) : stripTags(unwrapped);
}

function stripTags(value: string): string {
  return decodeEntities(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}
