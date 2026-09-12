"use server";

import { revalidatePath } from "next/cache";

import { supabaseAdmin } from "@/lib/supabase/server";
import type { SourceKind } from "@/lib/db/types";

export async function addSource(input: { kind: SourceKind; value: string; label?: string }): Promise<void> {
  const value = input.value.trim();
  if (!value) throw new Error("Source value is required");
  const { error } = await supabaseAdmin()
    .from("sources")
    .insert({ kind: input.kind, value, label: input.label?.trim() || null });
  if (error) throw new Error(error.message);
  revalidatePath("/sources");
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
