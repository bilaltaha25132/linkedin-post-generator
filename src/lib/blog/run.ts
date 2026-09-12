import "server-only";

import { getDiscovery } from "@/lib/discoveries/queries";
import { chat } from "@/lib/llm/client";
import { buildBlogPrompt, parseBlog } from "@/lib/llm/prompts";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Draft a website blog article from a discovery, in Bilal's blog voice. */
export async function generateBlog(discoveryId: string, postBody?: string): Promise<string> {
  const discovery = await getDiscovery(discoveryId);
  if (!discovery) throw new Error("Discovery not found");

  const content = discovery.content_md ?? discovery.snippet ?? discovery.title ?? "";

  // Ground the tone in his actual long-form writing, not the LinkedIn samples.
  const { data } = await supabaseAdmin()
    .from("voice_corpus")
    .select("title,content")
    .eq("kind", "blog")
    .order("created_at", { ascending: false })
    .limit(2);
  const samples = ((data ?? []) as { title: string | null; content: string }[])
    .map((s, i) => `--- SAMPLE ${i + 1}${s.title ? ` (${s.title})` : ""} ---\n${s.content.slice(0, 2200)}`)
    .join("\n\n");

  const blog = parseBlog(
    await chat(
      buildBlogPrompt({
        title: discovery.title ?? "",
        url: discovery.url,
        content,
        angle: discovery.suggested_angle,
        postBody,
        samples: samples || undefined,
      }),
    ),
  );
  if (!blog.trim()) throw new Error("The writer returned no usable article. Try again.");
  return blog;
}
