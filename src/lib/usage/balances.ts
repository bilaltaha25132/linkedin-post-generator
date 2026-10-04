import "server-only";

import { env } from "@/lib/env";

export interface DeepseekBalance {
  currency: string;
  total: number;
  /** Free credit DeepSeek granted, spent before the topped-up balance. */
  granted: number;
  toppedUp: number;
}

export interface FirecrawlAccount {
  remaining: number;
  plan: number;
  resetsAt: string;
}

/** What's left on the DeepSeek account, or null when it can't be read. */
export async function getDeepseekBalance(): Promise<DeepseekBalance | null> {
  try {
    const { apiKey, baseUrl } = env.llm();
    const res = await fetch(new URL("/user/balance", baseUrl), {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      balance_infos?: { currency: string; total_balance: string; granted_balance: string; topped_up_balance: string }[];
    };
    const info = body.balance_infos?.find((b) => b.currency === "USD") ?? body.balance_infos?.[0];
    if (!info) return null;
    return {
      currency: info.currency,
      total: Number(info.total_balance),
      granted: Number(info.granted_balance),
      toppedUp: Number(info.topped_up_balance),
    };
  } catch {
    return null;
  }
}

/** Credits left on each Firecrawl key, in key order; null for a key that can't be read. */
export async function getFirecrawlCredits(): Promise<(FirecrawlAccount | null)[]> {
  let keys: string[];
  try {
    keys = env.firecrawlKeys();
  } catch {
    return [];
  }
  return Promise.all(
    keys.map(async (key) => {
      try {
        const res = await fetch("https://api.firecrawl.dev/v2/team/credit-usage", {
          headers: { Authorization: `Bearer ${key}` },
          cache: "no-store",
        });
        if (!res.ok) return null;
        const { data } = (await res.json()) as {
          data?: { remainingCredits: number; planCredits: number; billingPeriodEnd: string };
        };
        return data ? { remaining: data.remainingCredits, plan: data.planCredits, resetsAt: data.billingPeriodEnd } : null;
      } catch {
        return null;
      }
    }),
  );
}
