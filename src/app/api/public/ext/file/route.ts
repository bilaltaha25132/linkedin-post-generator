import type { NextRequest } from "next/server";

import { compilePdf } from "@/lib/apply/pdf";
import { getLedger, getVersionLatex, latestVersion } from "@/lib/apply/queries";
import { createTailoredVersion } from "@/lib/apply/versions";
import { bearerAuthorized } from "@/lib/auth/cron";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
// A cold instance fetches the TeX engine and its packages before compiling.
export const maxDuration = 300;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The resume PDF the agent attaches to a form: the accepted tailored version
 * for this job, else the master. With tailor=1 (his choice on the Agentic Apply
 * button) a job with no accepted version gets one tailored now; if that fails
 * the master goes instead. The panel fetches it when a run starts, so the build
 * is done by the time the form reaches its upload field. X-Resume says which.
 */
export async function GET(req: NextRequest) {
  if (!(await bearerAuthorized(req, env.extensionToken()))) return new Response("Unauthorized", { status: 401 });
  const jobId = req.nextUrl.searchParams.get("job");
  const tailor = req.nextUrl.searchParams.get("tailor") === "1";

  let latex: string | null = null;
  if (jobId && UUID.test(jobId)) {
    const version = await latestVersion(jobId);
    if (version?.accepted_at) latex = await getVersionLatex(version.id);
    else if (tailor) {
      latex = await createTailoredVersion(jobId, { accept: true })
        .then((v) => v.latex)
        .catch((err) => {
          console.error(`[agent] tailoring ${jobId} failed, sending the master:`, err instanceof Error ? err.message : err);
          return null;
        });
    }
  }
  const kind = latex ? "tailored" : "master";
  latex ??= (await getLedger()).master?.latex ?? null;
  if (!latex) return new Response("No resume saved in Signal Desk yet.", { status: 404 });

  try {
    const pdf = await compilePdf(latex);
    return new Response(pdf as BodyInit, {
      headers: { "Content-Type": "application/pdf", "Cache-Control": "private, no-store", "X-Resume": kind },
    });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : "The PDF build failed.", { status: 422 });
  }
}
