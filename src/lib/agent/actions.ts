"use server";

import { revalidatePath } from "next/cache";

import { attempt, unwrap, type ActionResult } from "@/lib/action-result";
import { answerRun, updateRun, type RunReply } from "@/lib/agent/runs";
import { saveCandidateProfile } from "@/lib/apply/actions";
import { getCandidateProfile } from "@/lib/apply/queries";
import type { CandidateProfile } from "@/lib/apply/types";
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

/** His answer to a run waiting on him: carry on once he's done his part, or skip the job. */
export async function answerAgentRun(runId: string, reply: RunReply): Promise<ActionResult<null>> {
  return attempt(async () => {
    if (reply !== "go" && reply !== "skip") throw new Error("Answer go or skip.");
    await answerRun(runId, reply);
    revalidatePath("/applications");
    return null;
  });
}

export type AgentDetails = Pick<CandidateProfile, "contact" | "links">;

/** What the agent will type for him, shown on the Agentic Apply button before a batch starts. */
export async function agentDetails(): Promise<ActionResult<AgentDetails>> {
  return attempt(async () => {
    const { contact, links } = await getCandidateProfile();
    return { contact, links };
  });
}

/** His corrections from the Agentic Apply button, saved to the same profile the Resume page edits. */
export async function saveAgentDetails(details: AgentDetails): Promise<ActionResult<null>> {
  return attempt(async () => {
    const email = details.contact.email?.trim() ?? "";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("That email doesn't look right.");
    const profile = await getCandidateProfile();
    unwrap(await saveCandidateProfile({ ...profile, contact: details.contact, links: details.links }));
    return null;
  });
}
