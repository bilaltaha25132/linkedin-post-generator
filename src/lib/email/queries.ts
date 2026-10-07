import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";

export interface EmailRow {
  id: string;
  sender: string;
  subject: string;
  received_at: string;
  kind: string | null;
  items: number;
  error: string | null;
}

export async function listRecentEmails(limit = 12): Promise<EmailRow[]> {
  const { data, error } = await supabaseAdmin()
    .from("inbound_emails")
    .select("id,sender,subject,received_at,kind,items,error")
    .order("received_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data as EmailRow[];
}
