import { clip } from "@/lib/feeds/text";

// Hugging Face's trending models: where an open-weight release shows up the day
// it lands, often before anyone writes about it. Public and keyless.
const API = "https://huggingface.co/api/models";
const MAX_AGE_DAYS = 7;
// Re-uploads (quantisations, LoRAs, "uncensored" fine-tunes) trend too, but
// the release they're built on is the story.
const DERIVATIVE = /gguf|awq|gptq|exl2|mlx|lora|uncensored|abliterated|quant|merge/i;

export interface TrendingModel {
  id: string;
  url: string;
  /** Now: a model is news while it's trending, which runs days past its upload. */
  date: string;
  likes: number;
  summary: string;
  text: string;
}

interface ApiModel {
  id: string;
  likes?: number;
  downloads?: number;
  createdAt?: string;
  pipeline_tag?: string;
  library_name?: string;
  tags?: string[];
}

/** README of the model card, which carries the benchmarks and the licence. */
async function modelCard(id: string): Promise<string> {
  try {
    const response = await fetch(`https://huggingface.co/${id}/raw/main/README.md`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return "";
    return (await response.text()).replace(/^---[\s\S]*?---\s*/, "").slice(0, 12_000);
  } catch {
    return "";
  }
}

/** New models (under a week old) trending with at least `minLikes`. */
export async function trendingModels(minLikes: number, now = new Date()): Promise<TrendingModel[]> {
  const response = await fetch(`${API}?sort=trendingScore&limit=40`, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Hugging Face models returned HTTP ${response.status}`);
  const models = (await response.json()) as ApiModel[];

  const fresh = models.filter(
    (m) =>
      (m.likes ?? 0) >= minLikes &&
      !DERIVATIVE.test(m.id) &&
      m.createdAt &&
      now.getTime() - Date.parse(m.createdAt) < MAX_AGE_DAYS * 86_400_000,
  );

  return Promise.all(
    fresh.map(async (m) => {
      const card = await modelCard(m.id);
      const facts = [
        `Model: ${m.id} on Hugging Face`,
        m.pipeline_tag && `Task: ${m.pipeline_tag}`,
        `${m.likes ?? 0} likes, ${m.downloads ?? 0} downloads since ${m.createdAt?.slice(0, 10)}`,
      ].filter(Boolean);
      return {
        id: m.id,
        url: `https://huggingface.co/${m.id}`,
        date: now.toISOString(),
        likes: m.likes ?? 0,
        summary: clip(card.replace(/[#*`>|]/g, " ").replace(/\s+/g, " ").trim(), 400),
        text: `${facts.join("\n")}\n\nModel card:\n${card}`,
      };
    }),
  );
}
