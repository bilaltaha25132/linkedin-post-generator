import "server-only";

import { env } from "@/lib/env";

/** Send one WhatsApp message to the configured number via CallMeBot. */
export async function sendWhatsApp(text: string): Promise<void> {
  const { phone, apiKey } = env.whatsapp();
  if (!phone || !apiKey) return; // notifications not configured

  const url = new URL("https://api.callmebot.com/whatsapp.php");
  url.searchParams.set("phone", phone);
  url.searchParams.set("text", text);
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) {
    throw new Error(`CallMeBot returned HTTP ${res.status}`);
  }
}

export function whatsappConfigured(): boolean {
  const { phone, apiKey } = env.whatsapp();
  return Boolean(phone && apiKey);
}
