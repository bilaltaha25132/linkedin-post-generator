import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { STATE_COOKIE, authorizeUrl } from "@/lib/publish/linkedin-api";

// Sends the browser to LinkedIn's consent screen. The state value comes back on
// the callback and must match this cookie, so only a flow started here can
// attach a LinkedIn account. The proxy keeps both routes behind sign-in.
export async function GET(req: NextRequest) {
  const state = randomBytes(24).toString("base64url");
  const res = NextResponse.redirect(authorizeUrl(req.nextUrl.origin, state));
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: req.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/api/linkedin",
    maxAge: 15 * 60,
  });
  return res;
}
