"use server";

import { revalidatePath } from "next/cache";

import { attempt, type ActionResult } from "@/lib/action-result";
import { updateRun } from "@/lib/agent/runs";
import { env } from "@/lib/env";

/**
 * The extension token, handed to his own extension when he presses Connect on
 * a signed-in page, so he never copies it by hand. Server actions sit behind
 * the session check in proxy.ts, like every other private page.
 */
export async function agentConnection(): Promise<ActionResult<{ token: string }>> {
  return attempt(async () => {
    const token = env.extensionToken();
    if (!token) throw new Error("EXTENSION_TOKEN isn't set on the server, so the agent has nothing to connect with.");
    return { token };
  });
}

/** He sent a run the agent left for him (ready or needs you): record it as submitted. */
export async function markRunSubmitted(runId: string): Promise<ActionResult<null>> {
  return attempt(async () => {
    await updateRun(runId, { status: "submitted" });
    revalidatePath("/applications");
    return null;
  });
}
