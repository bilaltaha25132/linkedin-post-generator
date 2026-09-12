import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, createSessionToken, passwordMatches } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const password = String(form.get("password") ?? "");
  const next = safeNext(String(form.get("next") ?? "/"));

  if (!(await passwordMatches(password))) {
    const url = new URL("/sign-in", req.url);
    url.searchParams.set("error", "1");
    if (next !== "/") url.searchParams.set("next", next);
    return NextResponse.redirect(url, { status: 303 });
  }

  const res = NextResponse.redirect(new URL(next, req.url), { status: 303 });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  return res;
}

// Only allow same-origin relative redirects, never an attacker-supplied URL.
function safeNext(next: string): string {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
