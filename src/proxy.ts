import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

// Everything is private except the sign-in page, the login endpoint, and the
// cron endpoint (which authenticates itself with a bearer token, not a cookie).
const PUBLIC_PATHS = ["/sign-in", "/api/auth/login", "/api/public"];

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const signIn = new URL("/sign-in", req.url);
  signIn.searchParams.set("next", pathname);
  return NextResponse.redirect(signIn);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|webmanifest)).*)",
    "/(api)(.*)",
  ],
};
