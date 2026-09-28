"use server";

import { enhanceDraft } from "@/lib/write/run";

export async function enhanceDraftAction(draft: string, guidance?: string): Promise<string[]> {
  return enhanceDraft(draft, guidance);
}
