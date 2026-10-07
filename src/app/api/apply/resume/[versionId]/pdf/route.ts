import { compilePdf } from "@/lib/apply/pdf";
import { supabaseAdmin } from "@/lib/supabase/server";

// A cold instance fetches the TeX engine and its packages before compiling.
export const maxDuration = 300;

// Behind the same signed-in proxy as the .tex download.
export async function GET(_request: Request, { params }: { params: Promise<{ versionId: string }> }) {
  const { versionId } = await params;
  const { data } = await supabaseAdmin()
    .from("resume_versions")
    .select("latex, jobs(company)")
    .eq("id", versionId)
    .maybeSingle();
  if (!data) return new Response(null, { status: 404 });

  let pdf: Uint8Array;
  try {
    pdf = await compilePdf(data.latex);
  } catch (err) {
    return new Response(err instanceof Error ? err.message : "The PDF build failed.", {
      status: 422,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "private, no-store" },
    });
  }

  const company = (data.jobs as unknown as { company: string } | null)?.company ?? "job";
  const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "job";
  return new Response(pdf as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="resume-${slug}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
