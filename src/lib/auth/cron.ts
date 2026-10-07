import type { NextRequest } from "next/server";

import { env } from "@/lib/env";

/** The cron endpoints authenticate with `Authorization: Bearer <CRON_SECRET>`. */
export async function cronAuthorized(req: NextRequest): Promise<boolean> {
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
