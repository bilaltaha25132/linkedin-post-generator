import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

let admin: SupabaseClient | null = null;

/** Whether the DB creds are present — lets pages show setup guidance instead of crashing. */
export function supabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Service-role client. Bypasses RLS, so it must only ever run server-side
 * (route handlers, server actions, cron) — never shipped to the browser.
 */
export function supabaseAdmin(): SupabaseClient {
  if (!admin) {
    const { url, serviceKey } = env.supabase();
    admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}
