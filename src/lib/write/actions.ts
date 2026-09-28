"use server";

import { attempt, type ActionResult } from "@/lib/action-result";
import { enhanceDraft } from "@/lib/write/run";

export async function enhanceDraftAction(draft: string, guidance?: string): Promise<ActionResult<string[]>> {
  return attempt(() => enhanceDraft(draft, guidance));
}
