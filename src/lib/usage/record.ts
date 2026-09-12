import "server-only";

import { supabaseConfigured, supabaseAdmin } from "@/lib/supabase/server";

interface Usage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

/**
 * Log one LLM call's token usage. Best-effort: usage accounting must never break
 * a generation or a monitor pass, so any failure is swallowed.
 */
export async function recordUsage(operation: string, model: string, usage: Usage | undefined | null): Promise<void> {
  if (!usage || !supabaseConfigured()) return;
  try {
    await supabaseAdmin().from("usage_events").insert({
      provider: "deepseek",
      model,
      operation,
      prompt_tokens: usage.prompt_tokens ?? 0,
      completion_tokens: usage.completion_tokens ?? 0,
      total_tokens: usage.total_tokens ?? 0,
    });
  } catch {
    // ignore — see note above
  }
}
