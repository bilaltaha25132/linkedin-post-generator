"use server";

import { revalidatePath } from "next/cache";

import { attempt, type ActionResult } from "@/lib/action-result";
import { runMonitor, type MonitorResult } from "@/lib/monitor/run";

// Someone is watching the button, so a manual pass is shorter than a scheduled
// one; whatever it doesn't reach is still in the feeds for the next pass. It's
// a light pass: free sources only, so pressing it never spends Firecrawl credits.
const MANUAL_BUDGET_MS = 90_000;

/** Trigger a monitoring pass on demand from the UI (same work the cron does). */
export async function runMonitorNow(): Promise<ActionResult<MonitorResult>> {
  return attempt(async () => {
    const result = await runMonitor({ budgetMs: MANUAL_BUDGET_MS, mode: "light" });
    revalidatePath("/");
    return result;
  });
}
