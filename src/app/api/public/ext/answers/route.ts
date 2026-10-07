import { NextResponse, type NextRequest } from "next/server";

import { detectAts } from "@/lib/apply/forms";
import { findJobForForm, getApplication } from "@/lib/apply/queries";
import { bearerAuthorized } from "@/lib/auth/cron";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * The personal Chrome extension (extension/) asks here for the answers he
 * already drafted and reviewed on /jobs/[id]/apply, by the form's page URL.
 * Read-only: nothing here drafts, saves or submits.
 */
export async function GET(req: NextRequest) {
  if (!(await bearerAuthorized(req, env.extensionToken()))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const page = req.nextUrl.searchParams.get("url") ?? "";
  let host = "";
  try {
    host = new URL(page).hostname;
  } catch {
    return NextResponse.json({ error: "Send the form's URL." }, { status: 400 });
  }
  if (/(^|\.)linkedin\.com$/.test(host)) return NextResponse.json({ error: "Not on LinkedIn." }, { status: 400 });

  // A custom-domain Recruitee page carries no board name, so it can only match by job.
  const target = detectAts({ url_apply: page, source: "", source_id: "", source_token: null });
  const recruitee = target ?? (/\/o\/[^/]+/.test(new URL(page).pathname) ? { ats: "recruitee" as const, board: "", id: new URL(page).pathname.split("/")[2] } : null);
  if (!recruitee) return NextResponse.json({ error: "This isn't a form Signal Desk reads." }, { status: 404 });

  const job = await findJobForForm(recruitee);
  if (!job) return NextResponse.json({ error: "No job in Signal Desk matches this form." }, { status: 404 });
  const app = await getApplication(job.id);
  if (!app?.answers.length) {
    return NextResponse.json({ error: `Draft the answers for ${job.title} on its Apply kit page first.`, jobId: job.id }, { status: 404 });
  }

  return NextResponse.json(
    {
      job,
      answers: app.answers.map((a) => ({
        label: a.label,
        type: a.type,
        value: a.source === "you" || a.type === "file" ? null : a.value,
        yours: a.source === "you",
        flag: a.flag ?? null,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
