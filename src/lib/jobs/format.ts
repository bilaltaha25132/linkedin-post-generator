// Display helpers shared by the Jobs tab, its emails and the scorer.

export function payText(job: {
  pay_min: number | null;
  pay_max: number | null;
  currency: string | null;
  pay_period: string | null;
}): string | null {
  if (!job.pay_min && !job.pay_max) return null;
  const fmt = (n: number) => n.toLocaleString("en-US");
  const range =
    job.pay_min && job.pay_max && job.pay_min !== job.pay_max
      ? `${fmt(job.pay_min)}-${fmt(job.pay_max)}`
      : fmt((job.pay_min ?? job.pay_max)!);
  return [job.currency, range, job.pay_period ? `per ${job.pay_period.replace(/^1 /, "").toLowerCase()}` : ""]
    .filter(Boolean)
    .join(" ");
}

export const REGION_LABEL: Record<string, string> = {
  saudi: "Saudi Arabia",
  gulf: "Gulf",
  europe: "Europe",
  remote: "Remote, worldwide",
  pakistan: "Pakistan",
  other: "Elsewhere",
};

export const VISA_LABEL: Record<string, string> = {
  likely: "Sponsors visas",
  possible: "Visa possible",
  unlikely: "No sponsorship",
  unknown: "",
};

/** "Remote, worldwide", "Remote (Europe)", "Riyadh, on-site": where and how, in a few words. */
export function whereText(job: { location_raw: string | null; remote_scope: string }): string {
  const place = (job.location_raw ?? "").split(";")[0].trim();
  switch (job.remote_scope) {
    case "worldwide":
      return "Remote, worldwide";
    case "region":
    case "country":
      return place && !/^remote/i.test(place) ? `Remote (${place})` : "Remote";
    case "hybrid":
      return place ? `${place}, hybrid` : "Hybrid";
    case "onsite":
      return place ? `${place}, on-site` : "On-site";
    default:
      return place || "Location not stated";
  }
}
