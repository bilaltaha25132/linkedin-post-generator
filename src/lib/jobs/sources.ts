import { decodeEntities, htmlToText } from "@/lib/feeds/text";
import { isCandidateTitle } from "@/lib/jobs/classify";
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
  naukrigulf: 12,
  workable_search: 12,
  successfactors: 24,
  sabbar: 24,
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
  eightfold,
  phenom,
  oracle,
  remotive,
  remoteok,
  himalayas,
  jobicy,
  wwr,
  arbeitnow,
  hn,
  naukrigulf,
  workable_search: workableSearch,
  successfactors,
  sabbar,
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
  "eightfold",
  "phenom",
  "oracle",
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
    case "eightfold":
      return `https://${source.token.split("|")[0]}/careers`;
    case "phenom":
      return `https://${source.token}/search-results`;
    case "oracle": {
      const [host, site] = source.token.split("|");
      return `https://${host}/hcmUI/CandidateExperience/en/sites/${site}/requisitions`;
    }
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
  if (kind === "phenom") {
    const html = await get(`https://${sourceId.slice(0, split)}/job/${id}`, "text/html").then((r) => r.text());
    for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
      try {
        const ld = JSON.parse(m[1]) as { "@type"?: string; description?: string };
        if (ld["@type"] === "JobPosting" && ld.description) return text(ld.description);
      } catch {}
    }
    return null;
  }
  if (kind === "oracle") {
    const [host, site] = sourceId.slice(0, split).split("|");
    type Detail = {
      items?: { ExternalDescriptionStr?: string; ExternalResponsibilitiesStr?: string; ExternalQualificationsStr?: string }[];
    };
    const j = await getJson<Detail>(
      `https://${host}/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails?expand=all&onlyData=true` +
        `&finder=ById;Id=%22${id}%22,siteNumber=${encodeURIComponent(site)}`,
    );
    const d = j.items?.[0];
    return [d?.ExternalDescriptionStr, d?.ExternalResponsibilitiesStr, d?.ExternalQualificationsStr].map(text).join("\n\n").trim() || null;
  }
  return null;
}

async function get(
  url: string,
  accept = "application/json",
  retry = true,
  headers: Record<string, string> = {},
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: accept, ...headers },
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
  } catch (err) {
    // A dropped connection ("fetch failed") usually goes through on a second try.
    if (retry && (err as Error).name !== "TimeoutError") return get(url, accept, false, headers);
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

/** Eightfold careers sites (NEOM). The token is "host|domain"; the API pages ten at a time. */
async function eightfold(source: JobSource): Promise<Pull> {
  type Page = {
    count: number;
    positions: {
      id: number;
      name: string;
      locations: string[];
      t_create: number;
      work_location_option?: string;
      canonicalPositionUrl: string;
      job_description?: string;
    }[];
  };
  const [host, domain] = source.token.split("|");
  const jobs: RawJob[] = [];
  let total = Infinity;
  for (let start = 0; start < total && start < 400; start += 10) {
    const page = await getJson<Page>(
      `https://${host}/api/apply/v2/jobs?domain=${encodeURIComponent(domain)}&query=&start=${start}&num=10`,
    );
    total = page.count;
    if (!page.positions.length) break;
    for (const j of page.positions) {
      jobs.push(
        blank({
          sourceId: String(j.id),
          company: source.name,
          title: j.name.trim(),
          location: j.locations.join("; "),
          remote: j.work_location_option === "remote",
          hybrid: j.work_location_option === "hybrid",
          urlApply: j.canonicalPositionUrl,
          postedAt: iso(j.t_create),
          description: j.job_description && j.job_description !== "Not Available" ? text(j.job_description) : "",
        }),
      );
    }
  }
  return { jobs, complete: jobs.length >= total };
}

/**
 * Phenom careers sites (G42, TII). The token is "host/locale"; the search page
 * embeds its results as JSON, ten at a time.
 */
async function phenom(source: JobSource): Promise<Pull> {
  type Hit = {
    jobId: string;
    title: string;
    brand?: string;
    cityStateCountry?: string;
    multi_location?: string[];
    country?: string;
    postedDate?: string;
    descriptionTeaser?: string;
  };
  type Search = { totalHits: number; data: { jobs: Hit[] } };
  const jobs: RawJob[] = [];
  let total = Infinity;
  for (let from = 0; from < total && from < 300; from += 10) {
    const html = await get(`https://${source.token}/search-results?from=${from}&s=1`, "text/html").then((r) => r.text());
    const search = embeddedJson<Search>(html, '"eagerLoadRefineSearch":');
    if (!search) throw new Error(`No search results in the page from ${source.token}`);
    total = search.totalHits;
    if (!search.data.jobs.length) break;
    for (const j of search.data.jobs) {
      const locations = j.multi_location?.length ? j.multi_location : [j.cityStateCountry ?? ""];
      jobs.push(
        blank({
          sourceId: j.jobId,
          company: j.brand || source.name,
          title: j.title.trim(),
          location: locations.filter(Boolean).join("; "),
          countries: j.country ? [j.country] : [],
          urlApply: `https://${source.token}/job/${encodeURIComponent(j.jobId)}`,
          postedAt: iso(j.postedDate?.replace(/\+0000$/, "Z")),
          description: j.descriptionTeaser ?? "",
        }),
      );
    }
  }
  return { jobs, complete: jobs.length >= total };
}

/** Oracle Recruiting Cloud sites (Aramco Digital, Presight). The token is "host|siteNumber". */
async function oracle(source: JobSource): Promise<Pull> {
  type Orc = {
    items: {
      TotalJobsCount: number;
      requisitionList: {
        Id: string;
        Title: string;
        PostedDate: string;
        PrimaryLocation?: string;
        PrimaryLocationCountry?: string;
        WorkplaceType?: string;
        ShortDescriptionStr?: string;
      }[];
    }[];
  };
  const [host, site] = source.token.split("|");
  const data = await getJson<Orc>(
    `https://${host}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList` +
      `&finder=findReqs;siteNumber=${encodeURIComponent(site)},limit=200,sortBy=POSTING_DATES_DESC`,
  );
  const result = data.items[0];
  const list = result?.requisitionList ?? [];
  const jobs = list.map((j) =>
    blank({
      sourceId: j.Id,
      company: source.name,
      title: j.Title.trim(),
      location: j.PrimaryLocation ?? j.PrimaryLocationCountry ?? "",
      countries: j.PrimaryLocationCountry ? [j.PrimaryLocationCountry] : [],
      remote: /remote/i.test(j.WorkplaceType ?? "") || null,
      urlApply: `https://${host}/hcmUI/CandidateExperience/en/sites/${site}/job/${encodeURIComponent(j.Id)}`,
      postedAt: iso(j.PostedDate),
      description: text(j.ShortDescriptionStr),
    }),
  );
  return { jobs, complete: list.length >= (result?.TotalJobsCount ?? 0) };
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
// Gulf boards. Each source is one country (or one employer's feed) searched for
// a fixed set of queries; the title filter and the score sort out what they find.

const GULF_QUERIES = [
  "ai engineer",
  "machine learning",
  "llm",
  "generative ai",
  "artificial intelligence",
  "data scientist",
  "full stack",
  "python developer",
  "backend developer",
  "software engineer",
];

/**
 * Naukrigulf search, through the JSON API its own pages call. The token is the
 * location as the site spells it ("uae", "saudi arabia"). The app and system IDs
 * are the site's public web client's, sent on every search from its pages.
 */
async function naukrigulf(source: JobSource): Promise<Pull> {
  type Search = {
    Jobs?: {
      Job: {
        JobId: string;
        Designation: string;
        Location: string;
        Company?: { Name?: string };
        JdURL: string;
        LatestPostedDate?: string;
        jobInfo?: string;
        jobHighlights?: string[];
        Experience?: { Min?: string; Max?: string };
        keywords?: string;
      };
    }[];
  };
  const headers = { appId: "205", systemId: "2323", clientId: "desktop", "Accept-Language": "ENGLISH" };
  const seen = new Map<string, RawJob>();
  for (const q of GULF_QUERIES) {
    const params = new URLSearchParams({ Keywords: q, Location: source.token, Limit: "50", Offset: "0", pageNo: "1", seo: "1" });
    const res = await get(`https://www.naukrigulf.com/spapi/jobapi/search?${params}`, "application/json", true, headers);
    const data = (await res.json()) as Search;
    for (const { Job: j } of data.Jobs ?? []) {
      const years = j.Experience?.Min ? `Experience: ${j.Experience.Min} to ${j.Experience.Max ?? "?"} years.` : "";
      seen.set(
        j.JobId,
        blank({
          sourceId: j.JobId,
          company: (j.Company?.Name ?? "").trim() || "Confidential",
          title: decodeEntities(j.Designation).trim(),
          // "Riyadh - Saudi Arabia", or several of those joined by commas.
          location: j.Location,
          urlApply: j.JdURL,
          urlSource: j.JdURL,
          postedAt: iso(j.LatestPostedDate ? Number(j.LatestPostedDate) : null),
          description: [j.jobInfo, ...(j.jobHighlights ?? []), years, j.keywords ? `Keywords: ${j.keywords}` : ""]
            .filter(Boolean)
            .join("\n"),
        }),
      );
    }
  }
  return { jobs: [...seen.values()], complete: false };
}

/** Workable's cross-company job search for one country (the token, e.g. "Saudi Arabia"). */
async function workableSearch(source: JobSource): Promise<Pull> {
  type Search = {
    nextPageToken?: string;
    jobs: {
      id: string;
      title: string;
      description?: string;
      requirementsSection?: string;
      benefitsSection?: string;
      employmentType?: string;
      url: string;
      locations?: string[];
      location?: { countryName?: string };
      created?: string;
      company?: { title?: string };
      workplace?: string;
    }[];
  };
  const seen = new Map<string, RawJob>();
  for (const q of GULF_QUERIES) {
    let token: string | undefined;
    for (let page = 0; page < 3; page += 1) {
      const params = new URLSearchParams({ query: q, location: source.token });
      if (token) params.set("pageToken", token);
      const data = await getJson<Search>(`https://jobs.workable.com/api/v1/jobs?${params}`);
      for (const j of data.jobs) {
        seen.set(
          j.id,
          blank({
            sourceId: j.id,
            company: j.company?.title || "Unknown",
            title: j.title.trim(),
            location: (j.locations ?? []).join("; "),
            countries: j.location?.countryName ? [j.location.countryName] : [],
            remote: j.workplace === "remote",
            hybrid: j.workplace === "hybrid",
            employmentType: j.employmentType ?? null,
            urlApply: j.url,
            urlSource: j.url,
            postedAt: iso(j.created),
            description: [j.description, j.requirementsSection, j.benefitsSection].map(text).join("\n\n").trim(),
          }),
        );
      }
      token = data.nextPageToken;
      if (!token || !data.jobs.length) break;
    }
  }
  return { jobs: [...seen.values()], complete: false };
}

/**
 * SAP SuccessFactors careers sites (Core42, stc, Aramco), through their RSS
 * search. The token is the careers host. An empty search returns only a sliver,
 * so the feed is read once per keyword.
 */
async function successfactors(source: JobSource): Promise<Pull> {
  const seen = new Map<string, RawJob>();
  for (const q of ["ai", "machine learning", "engineer", "developer", "data"]) {
    const xml = await getText(
      `https://${source.token}/services/rss/job/?locale=en_US&keywords=${encodeURIComponent(q)}`,
    );
    for (const item of blocks(xml, "item")) {
      const link = tag(item, "link");
      // Titles read "Role (City, CC)".
      const full = tag(item, "title");
      const place = full.match(/\(([^()]*)\)\s*$/);
      seen.set(
        link,
        blank({
          sourceId: link,
          company: source.name,
          title: place ? full.slice(0, place.index).trim() : full,
          location: place?.[1] ?? "",
          urlApply: link,
          urlSource: link,
          postedAt: iso(tag(item, "pubDate")),
          description: text(tag(item, "description", true)),
        }),
      );
    }
  }
  return { jobs: [...seen.values()], complete: false };
}

/**
 * Sabbar, the Saudi board. Its sitemap lists every posting with the role in the
 * URL, so only recent ones whose role reads like his are opened for their
 * JobPosting data. Expired postings answer 410 and are skipped.
 */
async function sabbar(): Promise<Pull> {
  const xml = await getText("https://sabbar.com/en/jobs/sitemaps/job-details.xml");
  const since = Date.now() - 14 * 86_400_000;
  const urls = blocks(xml, "url")
    .map((entry) => ({ url: tag(entry, "loc"), at: Date.parse(tag(entry, "lastmod")) }))
    .filter((e) => e.at >= since)
    .filter((e) => {
      const role = e.url.match(/\/(?:c-[^/]*?-)?r-([^/]+)\/id-/)?.[1];
      if (!role) return false;
      let words: string;
      try {
        words = decodeURIComponent(role).replace(/-/g, " ");
      } catch {
        return false;
      }
      return isCandidateTitle(words, "saudi");
    })
    .sort((a, b) => b.at - a.at)
    .slice(0, 60);

  type Posting = {
    "@type"?: string;
    title?: string;
    description?: string;
    datePosted?: string;
    employmentType?: string | string[];
    hiringOrganization?: { name?: string };
    jobLocation?: { address?: { addressLocality?: string; addressCountry?: string } } | { address?: { addressLocality?: string } }[];
    jobLocationType?: string;
  };
  const jobs: RawJob[] = [];
  for (let i = 0; i < urls.length; i += 6) {
    const batch = await Promise.all(
      urls.slice(i, i + 6).map(async ({ url }) => {
        const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(20_000) }).catch(() => null);
        if (!res?.ok) return null;
        const html = await res.text();
        for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
          let ld: Posting;
          try {
            ld = JSON.parse(m[1]) as Posting;
          } catch {
            continue;
          }
          if (ld["@type"] !== "JobPosting" || !ld.title) continue;
          const place = Array.isArray(ld.jobLocation) ? ld.jobLocation[0] : ld.jobLocation;
          const city = place?.address?.addressLocality ?? "";
          return blank({
            sourceId: url.match(/\/id-([^/?#]+)/)?.[1] ?? url,
            company: (ld.hiringOrganization?.name ?? "").trim() || "Unknown",
            title: decodeEntities(ld.title).trim(),
            location: [city, "Saudi Arabia"].filter(Boolean).join(", "),
            countries: ["Saudi Arabia"],
            remote: ld.jobLocationType === "TELECOMMUTE" || null,
            employmentType: [ld.employmentType].flat().filter(Boolean).join(", ") || null,
            urlApply: url,
            urlSource: url,
            postedAt: iso(ld.datePosted),
            description: text(ld.description),
          });
        }
        return null;
      }),
    );
    for (const job of batch) if (job) jobs.push(job);
  }
  return { jobs, complete: false };
}

/** The JSON object that follows `marker` in a page, read by matching braces. */
function embeddedJson<T>(html: string, marker: string): T | null {
  const at = html.indexOf(marker);
  if (at < 0) return null;
  const start = html.indexOf("{", at + marker.length);
  let depth = 0;
  let quoted = false;
  for (let i = start; i < html.length; i += 1) {
    const c = html[i];
    if (quoted) {
      if (c === "\\") i += 1;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === "{") depth += 1;
    else if (c === "}" && --depth === 0) {
      try {
        return JSON.parse(html.slice(start, i + 1)) as T;
      } catch {
        return null;
      }
    }
  }
  return null;
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
