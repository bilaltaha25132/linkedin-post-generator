import { supabaseAdmin } from "@/lib/supabase/server";

// Serves the licensed slide font from a private bucket (see
// scripts/upload-brand-font.mjs). The proxy only lets signed-in sessions reach
// /api/*, so the file is never publicly downloadable. 404 = not uploaded, and
// slides fall back to Inter Tight.
export async function GET() {
  const { data, error } = await supabaseAdmin().storage.from("brand").download("slide-font.woff2");
  if (error || !data) return new Response(null, { status: 404 });

  return new Response(data, {
    headers: { "Content-Type": "font/woff2", "Cache-Control": "private, max-age=86400" },
  });
}
