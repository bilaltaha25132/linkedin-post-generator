import { createHash } from "node:crypto";

/**
 * Stable hash of a URL for cross-run dedup. Normalises scheme/host casing and
 * strips tracking query params and fragments so the same article discovered via
 * different links collapses to one row.
 */
export function hashUrl(rawUrl: string): string {
  return createHash("sha256").update(normalizeUrl(rawUrl)).digest("hex");
}

const TRACKING_PARAMS = /^(utm_|fbclid$|gclid$|mc_|ref$|ref_src$|igshid$)/i;

export function normalizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl.trim());
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_PARAMS.test(key)) url.searchParams.delete(key);
    }
    // Drop a trailing slash on the path so "/a" and "/a/" match.
    if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.toString();
  } catch {
    return rawUrl.trim();
  }
}
