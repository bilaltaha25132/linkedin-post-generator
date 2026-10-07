"use server";

import { revalidatePath } from "next/cache";

import { attempt, type ActionResult } from "@/lib/action-result";
import { reparseEmail } from "@/lib/email/ingest";

/** Parses a stored email again, after a parser fix. */
export async function rereadEmail(id: string): Promise<ActionResult<{ items: number }>> {
  return attempt(async () => {
    const items = await reparseEmail(id);
    revalidatePath("/settings");
    return { items };
  });
}
