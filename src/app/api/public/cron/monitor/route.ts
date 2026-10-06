import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";
import { isDeepSeekPeak, peakEndsAt } from "@/lib/llm/peak";
import { runMonitor } from "@/lib/monitor/run";
import { sendBreakingAlerts, sendDigest } from "@/lib/notify/digest";

// A pass reads every feed and scores what's new; MONITOR_BUDGET_MS keeps it
// under this Fluid compute limit.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ?mode=light is the frequent free pass; the daily one leaves it off.
  const mode = req.nextUrl.searchParams.get("mode") === "light" ? "light" : "full";

  // Peak DeepSeek costs double. The full pass sits off-peak and this catches a
  // run GitHub started late. Light passes run anyway: being first on a story is
  // worth more than the few cents of scoring.
  if (mode === "full" && isDeepSeekPeak() && req.nextUrl.searchParams.get("force") !== "1") {
    return NextResponse.json({ ok: true, skipped: "DeepSeek peak hours", resumesAt: peakEndsAt()?.toISOString() });
  }

  try {
    const result = await runMonitor({ mode });

    // Email is best-effort: a notification failure never fails the scan.
    // Breaking stories go out every pass; the digest of the rest once a day.
    const baseUrl = process.env.APP_URL ?? req.nextUrl.origin;
    let alerted = 0;
    let notified = 0;
    try {
      ({ sent: alerted } = await sendBreakingAlerts(baseUrl));
      if (mode === "full") ({ sent: notified } = await sendDigest(baseUrl));
    } catch {
      // ignore
    }

    return NextResponse.json({ ok: true, alerted, notified, ...result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

async function authorized(req: NextRequest): Promise<boolean> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return constantTimeEqual(token, env.cronSecret());
}

async function constantTimeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [da, db] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const x = new Uint8Array(da);
  const y = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
