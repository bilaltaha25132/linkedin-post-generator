import { NextResponse, type NextRequest } from "next/server";

import { cronAuthorized } from "@/lib/auth/cron";
import { ingestRelayedLeads, leadsRelayPlan } from "@/lib/leads/run";

// Marketplaces that refuse Vercel (Workana, Guru) are fetched by the leads workflow's
// runner (scripts/relay.mjs): GET lists what to fetch, then one POST per
// lane hands back the bodies, which keeps each request under Vercel's 4.5 MB cap.
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
    const sources = await leadsRelayPlan();
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
    const counts = await ingestRelayedLeads(id, new Map(responses.map((r) => [r.url, r.body])));
    return NextResponse.json({ ok: true, ...counts });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
