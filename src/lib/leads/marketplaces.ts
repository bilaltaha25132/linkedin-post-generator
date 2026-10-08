import "server-only";

import { decodeEntities, htmlToText } from "@/lib/feeds/text";
import type { RawLead } from "@/lib/leads/types";

// Freelance marketplaces for the Leads tab (docs/growth/leads.md). Each reads
// the public listing a visitor sees, one page per query, on paths robots.txt allows.

const UA = "SignalDesk/1.0 (personal lead finder)";

async function fetchText(url: string, init: RequestInit = {}): Promise<string> {
  const res = await fetch(url, {
    ...init,
    headers: { "user-agent": UA, ...init.headers },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${new URL(url).host} answered ${res.status}`);
  return res.text();
}

const fetchJSON = async <T>(url: string, init: RequestInit = {}): Promise<T> =>
  JSON.parse(await fetchText(url, { ...init, headers: { accept: "application/json", ...init.headers } })) as T;

/** The JSON object that starts right after `marker` in a page, found by matching braces. */
function embeddedJson<T>(html: string, marker: string): T | null {
  const start = html.indexOf(marker);
  if (start < 0) return null;
  let i = html.indexOf("{", start + marker.length);
  const from = i;
  let depth = 0;
  let inString = false;
  for (; i < html.length; i++) {
    const c = html[i];
    if (inString) {
      if (c === "\\") i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return JSON.parse(html.slice(from, i + 1)) as T;
  }
  return null;
}

function gig(fields: Omit<RawLead, "kindHint" | "who" | "stack"> & Partial<Pick<RawLead, "who" | "stack">>): RawLead {
  return { who: null, stack: [], ...fields, kindHint: "gig" };
}

// --- PeoplePerHour: AI and programming categories -----------------------------

export async function pullPeoplePerHour(): Promise<RawLead[]> {
  type State = {
    freelanceJobs: { main: { data: { id: string }[] } };
    entities: {
      projects: Record<
        string,
        {
          attributes: {
            title: string;
            budget: number | null;
            currency: string;
            project_type: string;
            posted_dt: string;
            url: string;
            proj_desc?: string;
            client?: { country?: string };
            sub_category?: { subcate_name?: string };
          };
        }
      >;
    };
  };
  const out: RawLead[] = [];
  for (const path of ["artificial-intelligence", "technology-programming"]) {
    const state = embeddedJson<State>(
      await fetchText(`https://www.peopleperhour.com/freelance-jobs/${path}`),
      "window.PPHReact.initialState=",
    );
    for (const { id } of state?.freelanceJobs.main.data ?? []) {
      const p = state!.entities.projects[id]?.attributes;
      if (!p) continue;
      const country = p.client?.country;
      out.push(
        gig({
          source: "peopleperhour",
          url: p.url,
          postedAt: new Date(`${p.posted_dt.replace(" ", "T")}Z`).toISOString(),
          title: p.title,
          text: `${p.title}\n${country ? `Client in ${country}.\n` : ""}${p.proj_desc ?? ""}`,
          budget: p.budget ? `${p.currency} ${p.budget}${p.project_type === "hourly" ? "/h" : " fixed"}` : null,
          stack: p.sub_category?.subcate_name ? [p.sub_category.subcate_name] : [],
        }),
      );
    }
  }
  return out;
}

// --- Mostaql (Arabic, Gulf clients): its own RSS ------------------------------

export async function pullMostaql(): Promise<RawLead[]> {
  const out: RawLead[] = [];
  for (const category of ["ai-machine-learning", "development"]) {
    const xml = await fetchText(`https://mostaql.com/rss?category=${category}`);
    for (const item of xml.match(/<item>[\s\S]*?<\/item>/g) ?? []) {
      const tag = (name: string) =>
        decodeEntities(item.match(new RegExp(`<${name}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${name}>`))?.[1] ?? "").trim();
      const id = tag("link").split("/").pop();
      if (!id) continue;
      out.push(
        gig({
          source: "mostaql",
          url: `https://mostaql.com/project/${id}`,
          postedAt: tag("pubDate") ? new Date(tag("pubDate")).toISOString() : null,
          title: tag("title"),
          text: `${tag("title")}\n${htmlToText(tag("description"))}`,
          budget: null,
        }),
      );
    }
  }
  return out;
}

// --- Arc.dev: contract roles on its skill pages -------------------------------

export async function pullArc(): Promise<RawLead[]> {
  type Job = {
    title: string;
    jobType: string;
    minHourlyRate?: number | null;
    maxHourlyRate?: number | null;
    requiredCountries?: string[];
    postedAt: number;
    randomKey: string;
    urlString: string;
    categories?: { name: string }[];
    company?: { name?: string };
  };
  const seen = new Map<string, RawLead>();
  for (const page of ["llm", "ai-engineer", "python", "full-stack"]) {
    const html = await fetchText(`https://arc.dev/remote-jobs/${page}`);
    const data = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
    if (!data) continue;
    const jobs = (JSON.parse(data).props.pageProps.arcJobs ?? []) as Job[];
    for (const j of jobs.filter((j) => j.jobType === "contract")) {
      const where = j.requiredCountries?.length ? `Open to: ${j.requiredCountries.join(", ")}.` : "Open worldwide.";
      const rate = j.minHourlyRate ? `USD ${j.minHourlyRate}${j.maxHourlyRate ? `-${j.maxHourlyRate}` : ""}/h` : null;
      seen.set(
        j.randomKey,
        gig({
          source: "arc",
          url: `https://arc.dev/remote-jobs/details/${j.urlString}-${j.randomKey}`,
          postedAt: new Date(j.postedAt * 1000).toISOString(),
          title: j.title,
          text: `${j.title}\nContract role. ${where}`,
          who: j.company?.name ?? null,
          budget: rate,
          stack: (j.categories ?? []).map((c) => c.name).slice(0, 8),
        }),
      );
    }
  }
  return [...seen.values()];
}

// --- Braintrust: the newest 100 (robots.txt disallows paging) -----------------

export async function pullBraintrust(): Promise<RawLead[]> {
  type Job = {
    id: number;
    title: string;
    employer?: { name?: string };
    budget_minimum_usd?: string | null;
    budget_maximum_usd?: string | null;
    payment_type?: string;
    job_type?: string;
    created: string;
    locations?: { location: string }[];
    main_skills?: { name: string }[];
  };
  const data = await fetchJSON<{ results: Job[] }>("https://app.usebraintrust.com/api/jobs/?page_size=100&ordering=-created");
  return data.results
    .filter((j) => j.job_type === "freelance")
    .map((j) => {
      const where = j.locations?.length ? `Locations: ${j.locations.map((l) => l.location).join(", ")}.` : "Any location.";
      const [lo, hi] = [j.budget_minimum_usd, j.budget_maximum_usd].map((n) => (n ? Math.round(Number(n)) : null));
      const skills = (j.main_skills ?? []).map((s) => s.name);
      return gig({
        source: "braintrust",
        url: `https://app.usebraintrust.com/jobs/${j.id}/`,
        postedAt: j.created,
        title: j.title,
        text: `${j.title}\n${where}\nSkills: ${skills.join(", ")}`,
        who: j.employer?.name ?? null,
        budget: lo ? `USD ${lo}${hi && hi !== lo ? `-${hi}` : ""}${j.payment_type === "hourly" ? "/h" : ""}` : null,
        stack: skills.slice(0, 8),
      });
    });
}

// --- freelancermap: EU IT contracts, fully remote only -------------------------

export async function pullFreelancermap(): Promise<RawLead[]> {
  type Project = {
    slug: string;
    title: string;
    description?: string;
    created: string;
    company?: string | null;
    country?: { nameEn?: string } | null;
    projectContractType?: { remoteInPercent?: number } | null;
    links?: { project?: string };
    skills?: { name?: string }[];
  };
  const seen = new Map<string, RawLead>();
  for (const query of ["llm", "ai agent", "chatbot", "machine learning"]) {
    const html = await fetchText(`https://www.freelancermap.com/projects?query=${encodeURIComponent(query)}`);
    const json = html.match(/data-component-name="ProjectSearch"[^>]*>([\s\S]*?)<\/script>/)?.[1];
    if (!json) continue;
    for (const p of (JSON.parse(json).initialResults ?? []) as Project[]) {
      if (p.projectContractType?.remoteInPercent !== 100) continue;
      const path = p.links?.project ?? `/project/${p.slug}`;
      seen.set(
        p.slug,
        gig({
          source: "freelancermap",
          url: `https://www.freelancermap.com${path}`,
          postedAt: new Date(p.created).toISOString(),
          title: p.title,
          text: `${p.title}\nFully remote${p.country?.nameEn ? `, client in ${p.country.nameEn}` : ""}.\n${htmlToText(p.description ?? "")}`,
          who: p.company ?? null,
          budget: null,
          stack: (p.skills ?? []).map((s) => s.name ?? "").filter(Boolean).slice(0, 8),
        }),
      );
    }
  }
  return [...seen.values()];
}

// --- Ureed (Gulf): its public GraphQL project list -----------------------------

export async function pullUreed(): Promise<RawLead[]> {
  type Project = { id: string; name: string; budget?: number | null; budgetType?: number; publishedOn: string; description?: string };
  const query = `query ($filters: AllProjectsFiltersInput) { allProjects(filters: $filters) { projects { id name budget budgetType publishedOn description } } }`;
  const data = await fetchJSON<{ data?: { allProjects: { projects: Project[] } } }>("https://graphql.ureed.com/graphql", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables: { filters: { page: 1, size: 50 } } }),
  });
  // Projects have no public page of their own, so the link carries the id to keep each lead unique.
  return (data.data?.allProjects.projects ?? []).map((p) =>
    gig({
      source: "ureed",
      url: `https://app.ureed.com/find-projects?project=${p.id}`,
      postedAt: p.publishedOn,
      title: p.name,
      text: `${p.name}\n${htmlToText(p.description ?? "")}`,
      budget: p.budget ? `USD ${p.budget}${p.budgetType === 2 ? "/h" : " fixed"}` : null,
    }),
  );
}

// --- Khamsat (Arabic): open buyer requests -------------------------------------

/** Khamsat writes "08/10/2026 02:16:35 GMT", day first. */
function khamsatDate(text: string): string | null {
  const m = text.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:\d{2}:\d{2})/);
  return m ? new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4]}Z`).toISOString() : null;
}

export async function pullKhamsat(): Promise<RawLead[]> {
  const html = await fetchText("https://khamsat.com/community/requests");
  return [
    ...html.matchAll(
      /<tr id="forum_post-(\d+)"[\s\S]*?<h3 class="details-head"><a class="ajaxbtn" href="([^"]+)">([^<]*)<\/a>[\s\S]*?title="([^"]+)"/g,
    ),
  ].map(([, , href, title, date]) =>
    gig({
      source: "khamsat",
      url: new URL(href, "https://khamsat.com").toString(),
      postedAt: khamsatDate(decodeEntities(date)),
      title: decodeEntities(title).trim(),
      text: decodeEntities(title).trim(),
      budget: null,
    }),
  );
}

