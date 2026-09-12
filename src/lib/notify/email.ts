import "server-only";

import { env } from "@/lib/env";

/** Send one email via Resend. No-op when unconfigured. */
export async function sendEmail(subject: string, html: string, text: string): Promise<void> {
  const { apiKey, to, from } = env.email();
  if (!apiKey || !to) return;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html, text }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`Resend returned HTTP ${res.status}`);
  }
}

export function emailConfigured(): boolean {
  const { apiKey, to } = env.email();
  return Boolean(apiKey && to);
}
