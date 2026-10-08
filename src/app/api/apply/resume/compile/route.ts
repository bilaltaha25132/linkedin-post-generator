import { compilePdf } from "@/lib/apply/pdf";

// A cold instance fetches the TeX engine and its packages before compiling.
export const maxDuration = 300;

const MAX_LATEX = 200_000;

// The editor's Download: compiles the .tex he's looking at, saved or not.
// Behind the same signed-in proxy as the other resume routes.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { latex?: unknown; name?: unknown } | null;
  const latex = typeof body?.latex === "string" ? body.latex : "";
  if (!/\\begin\{document\}/.test(latex) || latex.length > MAX_LATEX) {
    return new Response("Send the whole .tex file, from \\documentclass to \\end{document}.", { status: 400 });
  }

  let pdf: Uint8Array;
  try {
    pdf = await compilePdf(latex);
  } catch (err) {
    return new Response(err instanceof Error ? err.message : "The PDF build failed.", {
      status: 422,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "private, no-store" },
    });
  }

  const slug = String(body?.name ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "resume";
  return new Response(pdf as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slug}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
