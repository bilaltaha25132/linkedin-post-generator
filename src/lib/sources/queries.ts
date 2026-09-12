import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import type { Source } from "@/lib/db/types";

export async function listSources(): Promise<Source[]> {
  const { data, error } = await supabaseAdmin()
    .from("sources")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Source[];
}
