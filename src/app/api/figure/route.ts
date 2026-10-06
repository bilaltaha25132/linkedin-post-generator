import type { NextRequest } from "next/server";

// Relays a source's figure (a lab's benchmark chart, a model card image) to
// the carousel. Slides are drawn on a canvas, and the canvas refuses to export
// a cross-origin image unless the site sends CORS headers, which most don't;
// served from here it's same-origin. Only signed-in sessions reach /api/*
// (src/proxy.ts), and only public https images are fetched.

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_REDIRECTS = 3;
// Never reach into a private network, whatever a page's HTML pointed at.
const PRIVATE_HOST =
  /^(localhost|.*\.local|.*\.internal|.*\.localhost|\[.*\]|0\.0\.0\.0|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d+\.\d+)$/i;

function allowed(raw: string): URL | null {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && !PRIVATE_HOST.test(url.hostname) ? url : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  let url = allowed(req.nextUrl.searchParams.get("src") ?? "");
  if (!url) return new Response("Not an allowed image URL", { status: 400 });

  // Redirects are followed by hand so each hop gets the same checks.
  let response: Response | null = null;
  for (let hop = 0; hop <= MAX_REDIRECTS && url; hop++) {
    response = await fetch(url, {
      redirect: "manual",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SignalDesk/1.0; personal news reader)" },
      signal: AbortSignal.timeout(15_000),
    }).catch(() => null);
    if (!response || response.status < 300 || response.status >= 400) break;
    url = allowed(new URL(response.headers.get("location") ?? "", url).toString());
    response = null;
  }

  const type = response?.headers.get("content-type") ?? "";
  if (!response?.ok || !type.startsWith("image/") || type.includes("svg")) {
    return new Response("Image unavailable", { status: 502 });
  }
  const body = await response.arrayBuffer();
  if (body.byteLength > MAX_BYTES) return new Response("Image too large", { status: 413 });

  return new Response(body, {
    headers: { "Content-Type": type, "Cache-Control": "private, max-age=86400" },
  });
}
