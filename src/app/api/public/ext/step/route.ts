import { NextResponse, type NextRequest } from "next/server";

import { nextAction, stepInputSchema } from "@/lib/agent/step";
import { bearerAuthorized } from "@/lib/auth/cron";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const LINKEDIN = /(^|\.)linkedin\.com$/i;

/** One step of the browser agent: the page and the run so far in, the next action out. */
export async function POST(req: NextRequest) {
  if (!(await bearerAuthorized(req, env.extensionToken()))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = stepInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "That step didn't have the right shape." }, { status: 400 });
  if (onLinkedIn(parsed.data.url)) return NextResponse.json({ error: "The agent doesn't run on LinkedIn." }, { status: 400 });

  try {
    const reply = await nextAction(parsed.data);
    if (reply.action.type === "navigate" && (onLinkedIn(reply.action.url) || !/^https?:/.test(reply.action.url))) {
      return NextResponse.json({
        thought: reply.thought,
        action: { type: "ask", question: `I wanted to open ${reply.action.url}, which I'm not allowed to. What should I do instead?` },
      });
    }
    return NextResponse.json(reply, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "The model call failed." }, { status: 502 });
  }
}

function onLinkedIn(url: string): boolean {
  try {
    return LINKEDIN.test(new URL(url).hostname);
  } catch {
    return false;
  }
}
