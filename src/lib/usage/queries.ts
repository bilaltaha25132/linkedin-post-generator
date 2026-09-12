import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";

export interface UsageRow {
  operation: string;
  calls: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export async function getUsageSummary(): Promise<UsageRow[]> {
  const { data, error } = await supabaseAdmin().rpc("usage_summary");
  if (error) throw new Error(error.message);
  return (data ?? []) as UsageRow[];
}
