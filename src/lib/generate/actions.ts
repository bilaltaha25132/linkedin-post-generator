"use server";

import { attempt, type ActionResult } from "@/lib/action-result";
import { generateForDiscovery, type GenerationResult } from "@/lib/generate/run";

export async function generatePosts(
  discoveryId: string,
  opts: { count?: number; guidance?: string } = {},
): Promise<ActionResult<GenerationResult>> {
  return attempt(() => generateForDiscovery(discoveryId, opts));
}
