"use server";

import { revalidatePath } from "next/cache";

import { attempt, type ActionResult } from "@/lib/action-result";
import { FITS, INTAKES, STAGES, programById } from "@/lib/study/catalog";
import { DOCUMENTS } from "@/lib/study/documents";
import type { StudyFit, StudyIntake, StudyStage } from "@/lib/study/types";
import { supabaseAdmin } from "@/lib/supabase/server";

export type TrackChange = {
  stage?: StudyStage;
  intake?: StudyIntake;
  fit?: StudyFit | null;
  notes?: string;
};

/** Start following a program, or change where it stands. */
export async function trackProgram(programId: string, change: TrackChange): Promise<ActionResult<null>> {
  return attempt(async () => {
    if (!programById(programId)) throw new Error("That program isn't in the catalog.");
    if (change.stage && !STAGES.some((s) => s.stage === change.stage)) throw new Error(`Unknown stage: ${change.stage}`);
    if (change.intake && !INTAKES.some((i) => i.intake === change.intake)) throw new Error(`Unknown intake: ${change.intake}`);
    if (change.fit && !FITS.some((f) => f.fit === change.fit)) throw new Error(`Unknown fit: ${change.fit}`);
    const row = {
      program_id: programId,
      ...change,
      ...(change.notes !== undefined && { notes: change.notes.slice(0, 4000) }),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabaseAdmin().from("study_tracked").upsert(row, { onConflict: "program_id" });
    if (error) throw new Error(error.message);
    revalidatePath("/study");
    return null;
  });
}

export async function untrackProgram(programId: string): Promise<ActionResult<null>> {
  return attempt(async () => {
    const { error } = await supabaseAdmin().from("study_tracked").delete().eq("program_id", programId);
    if (error) throw new Error(error.message);
    revalidatePath("/study");
    return null;
  });
}

export async function setDocumentDone(key: string, done: boolean): Promise<ActionResult<null>> {
  return attempt(async () => {
    if (!DOCUMENTS.some((d) => d.key === key)) throw new Error(`Unknown document: ${key}`);
    const { error } = await supabaseAdmin()
      .from("study_documents")
      .upsert({ key, done, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    revalidatePath("/study");
    return null;
  });
}
