import OpenAI from "openai";

import { env } from "@/lib/env";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const { apiKey, baseUrl } = env.embeddings();
    client = new OpenAI({ apiKey, baseURL: baseUrl, maxRetries: 2 });
  }
  return client;
}

/**
 * Embed text into a vector (Gemini gemini-embedding-001). We request 1024 dims
 * via Matryoshka truncation — pgvector's HNSW index caps at 2000 dims, so the
 * model's 3072 default can't be indexed.
 */
export async function embed(text: string): Promise<number[]> {
  const { model, dimensions } = env.embeddings();
  const response = await getClient().embeddings.create(
    { model, input: truncate(text), dimensions },
    { timeout: 60_000 },
  );
  return response.data[0].embedding as number[];
}

// The embed model has a token cap; ~8k chars is a safe ceiling for a single doc.
function truncate(text: string): string {
  return text.length > 8000 ? text.slice(0, 8000) : text;
}
