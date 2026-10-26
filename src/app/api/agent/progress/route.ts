import { NextResponse, type NextRequest } from "next/server";

import { runsSince } from "@/lib/agent/runs";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The live view behind the Agentic Apply button: the latest run of each job in a batch. Behind the session check in proxy.ts. */
export async function GET(req: NextRequest) {
  const jobs = (req.nextUrl.searchParams.get("jobs") ?? "").split(",").filter((id) => UUID.test(id)).slice(0, 60);
  const since = req.nextUrl.searchParams.get("since") ?? "";
  if (!jobs.length || Number.isNaN(Date.parse(since))) return NextResponse.json({ error: "Name the jobs and when the batch started." }, { status: 400 });
  try {
    const runs = await runsSince(jobs, new Date(since).toISOString());
    return NextResponse.json({ runs }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't read the runs." }, { status: 500 });
  }
}
