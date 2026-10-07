import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { ingestEmails } from "@/lib/email/ingest";
import { env } from "@/lib/env";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  emails: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        from: z.string().max(500),
        subject: z.string().max(2000),
        date: z.string().max(100),
        body: z.string().max(200_000),
      }),
    )
    .max(50),
});

// A signed request older than this is refused, so a captured one can't be replayed later.
const MAX_SKEW_MS = 10 * 60_000;

/**
 * The Gmail bridge (scripts/gmail-bridge.gs) posts LinkedIn emails here, signed
 * with HMAC-SHA256 over "<timestamp>.<body>" using EMAIL_INGEST_SECRET.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const timestamp = req.headers.get("x-bridge-timestamp") ?? "";
  const signature = req.headers.get("x-bridge-signature") ?? "";
  if (!verify(raw, timestamp, signature)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Bad payload" }, { status: 400 });

  try {
    const result = await ingestEmails(parsed.data.emails, process.env.APP_URL ?? req.nextUrl.origin);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

function verify(raw: string, timestamp: string, signature: string): boolean {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > MAX_SKEW_MS) return false;
  const expected = createHmac("sha256", env.emailIngestSecret()).update(`${timestamp}.${raw}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature.toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}
