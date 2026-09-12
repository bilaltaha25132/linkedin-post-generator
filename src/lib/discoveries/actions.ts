"use server";

import { revalidatePath } from "next/cache";

import { supabaseAdmin } from "@/lib/supabase/server";
import type { DiscoveryStatus } from "@/lib/db/types";

export async function setDiscoveryStatus(id: string, status: DiscoveryStatus): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("discoveries")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/saved");
}
