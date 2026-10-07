import { NextResponse, type NextRequest } from "next/server";

import { STATE_COOKIE, exchangeCode, fetchMember } from "@/lib/publish/linkedin-api";
import { seal } from "@/lib/publish/seal";
import { supabaseAdmin } from "@/lib/supabase/server";

// LinkedIn redirects here after the consent screen. Every outcome lands back on
// Settings with a short `linkedin` flag the page turns into a message. The
// reason carried on failure is LinkedIn's own error text, never a credential.
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const expected = req.cookies.get(STATE_COOKIE)?.value;

  const done = (outcome: string, reason?: string) => {
    const target = new URL("/settings", req.url);
    target.searchParams.set("linkedin", outcome);
    if (reason) target.searchParams.set("reason", reason.slice(0, 200));
    const res = NextResponse.redirect(target);
    res.cookies.delete({ name: STATE_COOKIE, path: "/api/linkedin" });
    return res;
  };

  if (params.get("error")) return done(params.get("error") === "user_cancelled_authorize" ? "cancelled" : "denied");
  const code = params.get("code");
  if (!code || !expected || params.get("state") !== expected) return done("expired");

  try {
    const { accessToken, expiresIn, scope } = await exchangeCode(code, req.nextUrl.origin);
    const member = await fetchMember(accessToken);
    const { error } = await supabaseAdmin()
      .from("linkedin_auth")
      .upsert({
        id: 1,
        person_urn: member.personUrn,
        name: member.name,
        token: seal(accessToken),
        scope,
        expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        connected_at: new Date().toISOString(),
      });
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error("LinkedIn connect failed", err);
    return done("failed", err instanceof Error ? err.message : undefined);
  }
  return done("connected");
}
