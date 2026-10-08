import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { markSubmitted } from "@/lib/apply/actions";
import { bearerAuthorized } from "@/lib/auth/cron";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/** He approved the agent's submit and the employer's page confirmed it: record it like his own "I submitted". */
export async function POST(req: NextRequest) {
  if (!(await bearerAuthorized(req, env.extensionToken()))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = z.object({ jobId: z.string().uuid() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Send the job id." }, { status: 400 });
  const result = await markSubmitted(parsed.data.jobId);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
