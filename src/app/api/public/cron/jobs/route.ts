import { NextResponse, type NextRequest } from "next/server";

import { cronAuthorized } from "@/lib/auth/cron";
import { sendJobAlerts, sendJobDigest } from "@/lib/jobs/notify";
import { runJobs } from "@/lib/jobs/run";

// JOBS_BUDGET_MS keeps a pass under this Fluid compute limit.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  if (!(await cronAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const params = req.nextUrl.searchParams;

  try {
    const result = await runJobs({ force: params.get("force") === "1" });

    // Email is best-effort: a notification failure never fails the pass.
    const baseUrl = process.env.APP_URL ?? req.nextUrl.origin;
    let alerted = 0;
    let digested = 0;
    try {
      ({ sent: alerted } = await sendJobAlerts(baseUrl));
      if (params.get("digest") === "1") ({ sent: digested } = await sendJobDigest(baseUrl));
    } catch (err) {
      result.errors.push(`Email: ${(err as Error).message}`);
    }

    return NextResponse.json({ ok: true, alerted, digested, ...result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
