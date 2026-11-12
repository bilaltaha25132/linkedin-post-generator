import "server-only";

import type { DocumentState, ProgramChange, ProgramCheck, TrackedProgram } from "@/lib/study/types";
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

export async function listProgramChecks(): Promise<ProgramCheck[]> {
  const { data, error } = await supabaseAdmin()
    .from("study_checks")
    .select("program_id,url,checked_at,status,verdict,signals,snippets,last_ok_at,last_changed_at,error");
  if (error) throw new Error(error.message);
  return data as ProgramCheck[];
}

export async function listProgramChanges(limit = 200): Promise<ProgramChange[]> {
  const { data, error } = await supabaseAdmin()
    .from("study_changes")
    .select("id,program_id,url,detected_at,added,removed,before_snippets,after_snippets")
    .order("detected_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data as ProgramChange[];
}
