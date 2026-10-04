import OpenAI from "openai";
import type { z } from "zod";

import { env } from "@/lib/env";
import { recordUsage } from "@/lib/usage/record";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const { apiKey, baseUrl } = env.llm();
    // maxRetries here covers transient network/5xx; JSON-shape retries are
    // handled by chatJSON's own reroll loop below.
    client = new OpenAI({ apiKey, baseURL: baseUrl, maxRetries: 2 });
  }
  return client;
}

/** "writer" = high-quality drafting; "utility" = fast, high-volume filtering. */
export type ModelRole = "writer" | "utility";

function resolveModel(role: ModelRole): string {
  const { writerModel, utilityModel } = env.llm();
  return role === "writer" ? writerModel : utilityModel;
}

export interface ChatOptions {
  system: string;
  user: string;
  role?: ModelRole;
  temperature?: number;
  maxTokens?: number;
  /** Nucleus cutoff. Lets the writer run hot without sampling the junk tail. */
  topP?: number;
  /** Gemini 3 thinking budget. "low" roughly halves latency on the writer. */
  reasoningEffort?: "low" | "medium" | "high";
  /** Operation label for token-usage accounting (e.g. "relevance", "generate"). */
  op?: string;
}

/** Single completion, returns the assistant text. */
export async function chat(opts: ChatOptions): Promise<string> {
  const model = resolveModel(opts.role ?? "utility");
  const completion = await getClient().chat.completions.create(
    {
      model,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.maxTokens ?? 1024,
      ...(opts.topP ? { top_p: opts.topP } : {}),
      ...(opts.reasoningEffort ? { reasoning_effort: opts.reasoningEffort } : {}),
    },
    { timeout: 110_000 },
  );
  if (opts.op) await recordUsage(opts.op, model, completion.usage);
  return completion.choices[0]?.message?.content?.trim() ?? "";
}

/**
 * Chat that must return JSON matching `schema`. Open models don't reliably honour
 * a json response_format, so we extract the first JSON object from the text and
 * validate it; on a parse/validation miss we reroll once with a corrective nudge.
 */
export async function chatJSON<T>(
  opts: ChatOptions & { schema: z.ZodType<T> },
): Promise<T> {
  const attempt = async (extra?: string): Promise<T> => {
    const raw = await chat({
      ...opts,
      user: extra ? `${opts.user}\n\n${extra}` : opts.user,
      temperature: opts.temperature ?? 0.2,
    });
    return opts.schema.parse(extractJson(raw));
  };

  try {
    return await attempt();
  } catch {
    return attempt(
      "Your previous reply was not valid JSON matching the required shape. Reply with ONLY the JSON object, no prose, no markdown fences.",
    );
  }
}

/** Pull the first balanced JSON object out of a model reply. */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON object found in model reply");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}
