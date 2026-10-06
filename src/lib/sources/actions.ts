"use server";

import { revalidatePath } from "next/cache";

import { attempt, type ActionResult } from "@/lib/action-result";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { SourceKind } from "@/lib/db/types";

export async function addSource(input: {
  kind: SourceKind;
  value: string;
  label?: string;
}): Promise<ActionResult<void>> {
  return attempt(async () => {
    const value = input.value.trim();
    if (!value) throw new Error("Source value is required");
    if (input.kind === "hn" && !/^\d+$/.test(value)) throw new Error("Hacker News needs a minimum number of points");
    if (input.kind === "papers" && !/^\d+$/.test(value)) throw new Error("Papers need a minimum number of upvotes");
    if (input.kind === "models" && !/^\d+$/.test(value)) throw new Error("Models need a minimum number of likes");
    if ((input.kind === "rss" || input.kind === "url") && !/^https?:\/\/\S+$/i.test(value)) {
      throw new Error("Enter a full http(s) address");
    }
    const { error } = await supabaseAdmin()
      .from("sources")
      .insert({ kind: input.kind, value, label: input.label?.trim() || null });
    if (error) throw new Error(error.message);
    revalidatePath("/sources");
  });
}

export async function toggleSource(id: string, enabled: boolean): Promise<void> {
  const { error } = await supabaseAdmin().from("sources").update({ enabled }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/sources");
}

export async function deleteSource(id: string): Promise<void> {
  const { error } = await supabaseAdmin().from("sources").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/sources");
}
