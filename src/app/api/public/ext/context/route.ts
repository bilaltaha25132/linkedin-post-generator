import { NextResponse, type NextRequest } from "next/server";

import { findJobForPage, getCandidateProfile, listApplyingJobs } from "@/lib/apply/queries";
import { bearerAuthorized } from "@/lib/auth/cron";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/** The agent's side panel asks which job the open page belongs to, and which jobs he's applying to. */
export async function GET(req: NextRequest) {
  if (!(await bearerAuthorized(req, env.extensionToken()))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const page = req.nextUrl.searchParams.get("url") ?? "";
  let job = null;
  try {
    if (/^https?:/.test(page)) job = await findJobForPage(page);
  } catch {
    // An unreadable URL just means no match.
  }
  const [jobs, profile] = await Promise.all([listApplyingJobs(), getCandidateProfile()]);
  const name = [profile.contact.first_name, profile.contact.last_name].filter(Boolean).join(" ");
  return NextResponse.json({ job, jobs, name }, { headers: { "Cache-Control": "no-store" } });
}
