import "server-only";

import type { DocumentState, TrackedProgram } from "@/lib/study/types";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function listTrackedPrograms(): Promise<TrackedProgram[]> {
  const { data, error } = await supabaseAdmin()
    .from("study_tracked")
    .select("program_id,stage,intake,fit,fit_note,notes,updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as TrackedProgram[];
}

export async function listDocumentStates(): Promise<DocumentState[]> {
  const { data, error } = await supabaseAdmin().from("study_documents").select("key,done,note");
  if (error) throw new Error(error.message);
  return data as DocumentState[];
}
