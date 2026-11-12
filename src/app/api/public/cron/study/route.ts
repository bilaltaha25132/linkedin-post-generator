import { NextResponse, type NextRequest } from "next/server";

import { cronAuthorized } from "@/lib/auth/cron";
import { sendStudyChangeAlerts } from "@/lib/study/notify";
import { rescanPrograms } from "@/lib/study/rescan";

// The pass stops taking new pages at RESCAN_BUDGET_MS, under this Fluid compute limit.
export const maxDuration = 300;
export const dynamic = "force-dynamic";
const RESCAN_BUDGET_MS = 230_000;

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
    const result = await rescanPrograms({
      budgetMs: RESCAN_BUDGET_MS,
      force: params.get("force") === "1",
      only: params.get("only")?.split(",").filter(Boolean),
    });

    // Email is best-effort: a notification failure never fails the pass.
    let alerted = 0;
    try {
      ({ sent: alerted } = await sendStudyChangeAlerts(process.env.APP_URL ?? req.nextUrl.origin));
    } catch (err) {
      result.errors.push(`Email: ${(err as Error).message}`);
    }
    return NextResponse.json({ ok: true, alerted, ...result, errors: result.errors.slice(0, 20) });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
