"use server";

import { revalidatePath } from "next/cache";

import { runMonitor, type MonitorResult } from "@/lib/monitor/run";

/** Trigger a monitoring pass on demand from the UI (same work the cron does). */
export async function runMonitorNow(): Promise<MonitorResult> {
  const result = await runMonitor();
  revalidatePath("/");
  return result;
}
