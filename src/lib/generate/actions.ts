"use server";

import { attempt, type ActionResult } from "@/lib/action-result";
import { generateForDiscovery, reviseForDiscovery, type GenerationResult } from "@/lib/generate/run";

export async function generatePosts(
  discoveryId: string,
  opts: { count?: number; guidance?: string } = {},
): Promise<ActionResult<GenerationResult>> {
  return attempt(() => generateForDiscovery(discoveryId, opts));
}

export async function revisePost(discoveryId: string, post: string, instruction: string): Promise<ActionResult<string>> {
  return attempt(() => reviseForDiscovery(discoveryId, post, instruction));
}
