"use server";

import { revalidatePath } from "next/cache";

import { attempt, type ActionResult } from "@/lib/action-result";
import { embed } from "@/lib/llm/embeddings";
import { embedMissing, importAccount, importPost, importShares, type ImportResult } from "@/lib/plan/import";
import type { AccountExport, PostExport, Share } from "@/lib/plan/parse";
import { supabaseAdmin } from "@/lib/supabase/server";

// Files are parsed in the browser (src/lib/plan/parse.ts); these take the rows.

const SHARE_BATCH = 150;

export async function importAnalytics(data: AccountExport | PostExport): Promise<ActionResult<ImportResult>> {
  return attempt(async () => {
    const result = data.kind === "account" ? await importAccount(data) : await importPost(data);
    revalidatePath("/plan");
    return result;
  });
}

export async function importShareBatch(shares: Share[]): Promise<ActionResult<ImportResult>> {
  return attempt(async () => {
    if (shares.length > SHARE_BATCH) throw new Error(`Send at most ${SHARE_BATCH} posts at a time.`);
    const result = await importShares(
      shares.map((s) => ({ ...s, text: String(s.text ?? "").slice(0, 6000) })),
    );
    revalidatePath("/plan");
    return result;
  });
}

/** Embeds imported posts left over when an upload ran out of time. */
export async function embedImported(): Promise<ActionResult<{ embedded: number }>> {
  return attempt(async () => {
    const embedded = await embedMissing(Date.now() + 50_000);
    revalidatePath("/plan");
    return { embedded };
  });
}

export interface PillarInput {
  id: string;
  name: string;
  description: string;
  target_share: number;
}

/**
 * Saves edited pillars. A changed description gets a new vector, and every
 * post is re-assigned, since the nearest pillar may have moved.
 */
export async function savePillars(input: PillarInput[]): Promise<ActionResult<{ reassigned: number }>> {
  return attempt(async () => {
    const db = supabaseAdmin();
    const { data: current, error } = await db.from("pillars").select("id,name,description");
    if (error) throw new Error(error.message);
    const total = input.reduce((t, p) => t + p.target_share, 0);
    if (Math.abs(total - 1) > 0.02) throw new Error(`Target shares add up to ${Math.round(total * 100)}%. Make them 100%.`);

    let changed = false;
    for (const p of input) {
      const before = current?.find((c) => c.id === p.id);
      if (!before) throw new Error("A pillar was removed elsewhere. Reload the page.");
      const name = p.name.trim().slice(0, 80);
      const description = p.description.trim().slice(0, 600);
      if (!name || description.length < 20) throw new Error("Each pillar needs a name and a description of a sentence or two.");
      const patch: Record<string, unknown> = { name, description, target_share: p.target_share };
      if (before.name !== name || before.description !== description) {
        const vector = await embed(`${name}. ${description}`);
        if (!vector) throw new Error("Couldn't embed the new description. Try again in a minute.");
        patch.embedding = vector;
        changed = true;
      }
      const { error: uError } = await db.from("pillars").update(patch).eq("id", p.id);
      if (uError) throw new Error(uError.message);
    }

    let reassigned = 0;
    if (changed) {
      await db.from("posts").update({ pillar_id: null }).not("embedding", "is", null);
      await db.from("linkedin_posts").update({ pillar_id: null }).not("embedding", "is", null);
      const { data } = await db.rpc("assign_pillars");
      reassigned = (data as number | null) ?? 0;
    }
    revalidatePath("/plan");
    return { reassigned };
  });
}
