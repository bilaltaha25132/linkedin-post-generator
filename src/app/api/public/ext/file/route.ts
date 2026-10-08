import type { NextRequest } from "next/server";

import { compilePdf } from "@/lib/apply/pdf";
import { getLedger, getVersionLatex, latestVersion } from "@/lib/apply/queries";
import { bearerAuthorized } from "@/lib/auth/cron";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
// A cold instance fetches the TeX engine and its packages before compiling.
export const maxDuration = 300;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The resume PDF the agent attaches to a form: the accepted tailored version
 * for this job, else the master. The panel fetches it when a run starts, so a
 * cold build is done by the time the form reaches its upload field.
 */
export async function GET(req: NextRequest) {
  if (!(await bearerAuthorized(req, env.extensionToken()))) return new Response("Unauthorized", { status: 401 });
  const jobId = req.nextUrl.searchParams.get("job");

  let latex: string | null = null;
  if (jobId && UUID.test(jobId)) {
    const version = await latestVersion(jobId);
    if (version?.accepted_at) latex = await getVersionLatex(version.id);
  }
  latex ??= (await getLedger()).master?.latex ?? null;
  if (!latex) return new Response("No resume saved in Signal Desk yet.", { status: 404 });

  try {
    const pdf = await compilePdf(latex);
    return new Response(pdf as BodyInit, {
      headers: { "Content-Type": "application/pdf", "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : "The PDF build failed.", { status: 422 });
  }
}
