"use server";

import { generateForDiscovery, type GenerationResult } from "@/lib/generate/run";

export async function generatePosts(
  discoveryId: string,
  opts: { count?: number; guidance?: string } = {},
): Promise<GenerationResult> {
  return generateForDiscovery(discoveryId, opts);
}
