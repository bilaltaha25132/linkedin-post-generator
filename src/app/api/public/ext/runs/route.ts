import { after, NextResponse, type NextRequest } from "next/server";

import { startRun, startRunSchema, summarizeRun } from "@/lib/agent/runs";
import { bearerAuthorized } from "@/lib/auth/cron";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** The agent starts work on a job. The company and role summary is written after the reply. */
export async function POST(req: NextRequest) {
  if (!(await bearerAuthorized(req, env.extensionToken()))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = startRunSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "That run didn't have the right shape." }, { status: 400 });
  try {
    const id = await startRun(parsed.data);
    const jobId = parsed.data.jobId;
    if (jobId) {
      after(() => summarizeRun(id, jobId).catch((err) => console.error("[agent] run summary failed", err)));
    }
    return NextResponse.json({ id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't record the run." }, { status: 500 });
  }
}
