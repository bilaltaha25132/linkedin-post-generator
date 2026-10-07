import { NextResponse, type NextRequest } from "next/server";

import { cronAuthorized } from "@/lib/auth/cron";
import { sendLeadAlerts } from "@/lib/leads/notify";
import { runLeads } from "@/lib/leads/run";

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
  try {
    const result = await runLeads();

    // Email is best-effort: a notification failure never fails the pass.
    let alerts = { sent: 0, nudged: 0 };
    try {
      alerts = await sendLeadAlerts(process.env.APP_URL ?? req.nextUrl.origin);
    } catch (err) {
      result.errors.push(`Email: ${(err as Error).message}`);
    }
    return NextResponse.json({ ok: true, ...alerts, ...result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
