import { NextResponse, type NextRequest } from "next/server";

import { cronAuthorized } from "@/lib/auth/cron";
import { ingestRelayed, relayPlan } from "@/lib/jobs/run";

// Boards that hang requests from Vercel are fetched by the jobs workflow's
// runner (scripts/relay-jobs.mjs): GET lists what to fetch, then one POST per
// source hands back the bodies, which keeps each request under Vercel's 4.5 MB cap.
export const maxDuration = 120;
export const dynamic = "force-dynamic";

interface RelayPost {
  id: string;
  responses: { url: string; body: string }[];
}

export async function GET(req: NextRequest) {
  if (!(await cronAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const sources = await relayPlan(req.nextUrl.searchParams.get("force") === "1");
    return NextResponse.json({ ok: true, sources });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await cronAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id, responses } = (await req.json()) as RelayPost;
    const counts = await ingestRelayed(id, new Map(responses.map((r) => [r.url, r.body])));
    return NextResponse.json({ ok: true, ...counts });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
