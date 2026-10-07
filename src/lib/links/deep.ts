// LinkedIn URLs the app builds or reads, without ever fetching LinkedIn. Search
// links are opened by Bilal in his own browser; templates in docs/growth/unlocks.md.

export type PostDate = "past-24h" | "past-week" | "past-month";
export type PostSort = "date_posted" | "relevance";

/** LinkedIn's post search. Facets beyond keywords are best-effort, so keywords lead. */
export function postSearchUrl(query: string, opts: { date?: PostDate; sort?: PostSort; jobs?: boolean } = {}): string {
  const params = new URLSearchParams({ keywords: query });
  if (opts.date) params.set("datePosted", `"${opts.date}"`);
  if (opts.sort) params.set("sortBy", `"${opts.sort}"`);
  if (opts.jobs) params.set("contentType", '"jobs"');
  params.set("origin", "FACETED_SEARCH");
  return `https://www.linkedin.com/search/results/content/?${params}`;
}

// LinkedIn geoIds. Pakistan, UAE, UK and Worldwide were checked live on 2026-10-07;
// the others are LinkedIn's published country IDs. A wrong one shows as the wrong place.
export const JOB_GEOS = {
  "Saudi Arabia": "100459316",
  UAE: "104305776",
  Qatar: "104170880",
  Germany: "101282230",
  Netherlands: "102890719",
  UK: "101165590",
  Pakistan: "101022442",
  Worldwide: "92000000",
} as const;

export type JobGeo = keyof typeof JOB_GEOS;

/** LinkedIn's job search, newest first. `hours` is how far back to look. */
export function jobSearchUrl(query: string, geo: JobGeo, opts: { hours?: number; remote?: boolean } = {}): string {
  const params = new URLSearchParams({ keywords: query, geoId: JOB_GEOS[geo], sortBy: "DD" });
  params.set("f_TPR", `r${(opts.hours ?? 24) * 3600}`);
  if (opts.remote) params.set("f_WT", "2");
  return `https://www.linkedin.com/jobs/search/?${params}`;
}

export function canonicalJobUrl(jobId: string): string {
  return `https://www.linkedin.com/jobs/view/${jobId}/`;
}

/** Someone's recent posts and comments, for a round. */
export function activityUrl(profileUrl: string): string {
  return `${profileUrl.replace(/\/+$/, "")}/recent-activity/all/`;
}

// Some of these are per-recipient login tokens, so a link from an email is
// never stored with them.
const TRACKING_PARAMS = /^(trackingId|refId|otpToken|midToken|midSig|trk|trkEmail|lipi|eid|loid|lgCta|lgTemp|lgcta|lgtemp|utm_\w+)$/i;

/** A LinkedIn URL with tracking and login parameters removed, and the /comm/ email prefix dropped. */
export function cleanLinkedInUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (!/(^|\.)linkedin\.com$/i.test(url.hostname)) return null;
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.test(key)) url.searchParams.delete(key);
  }
  url.hostname = "www.linkedin.com";
  url.pathname = url.pathname.replace(/^\/comm\//, "/");
  url.hash = "";
  const jobId = url.pathname.match(/^\/jobs\/view\/(\d+)/)?.[1];
  if (jobId) return canonicalJobUrl(jobId);
  return url.toString();
}

/** The activity ID in a post URL ("…activity-7381234567890123456-…" or "urn:li:activity:…"). */
export function activityIdOf(url: string): string | null {
  return url.match(/(?:activity|share|ugcPost)[:-](\d{19})/)?.[1] ?? null;
}

/** When a post went up: the top 41 bits of its activity ID are a Unix time in ms. */
export function postedAtFromId(activityId: string): Date | null {
  try {
    // The low 22 bits are machine and sequence numbers.
    const ms = Number(BigInt(activityId) / BigInt(2 ** 22));
    // Sanity range: LinkedIn's snowflake IDs began well after 2015.
    return ms > Date.UTC(2015, 0, 1) && ms < Date.now() + 86_400_000 ? new Date(ms) : null;
  } catch {
    return null;
  }
}

/** LinkedIn's people search, for someone the app knows by name but has no profile link for. */
export function peopleSearchUrl(query: string): string {
  const params = new URLSearchParams({ keywords: query, origin: "GLOBAL_SEARCH_HEADER" });
  return `https://www.linkedin.com/search/results/people/?${params}`;
}
