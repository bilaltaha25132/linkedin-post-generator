import "server-only";

import { unseal } from "@/lib/publish/seal";
import { supabaseAdmin } from "@/lib/supabase/server";

export interface LinkedInAccount {
  name: string | null;
  personUrn: string;
  expiresAt: string;
  connectedAt: string;
}

/** Days before expiry when the app starts asking for a reconnect. */
export const RECONNECT_WINDOW_DAYS = 5;

/** The connected member, without the token. Null when not connected. */
export async function getLinkedInAccount(): Promise<LinkedInAccount | null> {
  const { data, error } = await supabaseAdmin()
    .from("linkedin_auth")
    .select("name,person_urn,expires_at,connected_at")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    name: data.name as string | null,
    personUrn: data.person_urn as string,
    expiresAt: data.expires_at as string,
    connectedAt: data.connected_at as string,
  };
}

export function daysLeft(account: LinkedInAccount): number {
  return Math.floor((new Date(account.expiresAt).getTime() - Date.now()) / 86_400_000);
}

/** The decrypted token and author URN, for a call about to go out. */
export async function linkedInCredentials(): Promise<{ token: string; author: string }> {
  const { data, error } = await supabaseAdmin()
    .from("linkedin_auth")
    .select("token,person_urn,expires_at")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("LinkedIn isn't connected yet. Connect it in Settings first.");
  if (new Date(data.expires_at as string).getTime() <= Date.now()) {
    throw new Error("The LinkedIn connection has expired. Reconnect it in Settings.");
  }
  return { token: unseal(data.token as string), author: data.person_urn as string };
}
