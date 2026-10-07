import { supabaseAdmin } from "@/lib/supabase/server";

// The proxy only lets signed-in sessions reach /api/*, so a tailored resume is
// never publicly downloadable.
export async function GET(_request: Request, { params }: { params: Promise<{ versionId: string }> }) {
  const { versionId } = await params;
  const { data } = await supabaseAdmin()
    .from("resume_versions")
    .select("latex, jobs(company)")
    .eq("id", versionId)
    .maybeSingle();
  if (!data) return new Response(null, { status: 404 });

  const company = (data.jobs as unknown as { company: string } | null)?.company ?? "job";
  const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "job";
  return new Response(data.latex, {
    headers: {
      "Content-Type": "application/x-tex; charset=utf-8",
      "Content-Disposition": `attachment; filename="resume-${slug}.tex"`,
      "Cache-Control": "private, no-store",
    },
  });
}
