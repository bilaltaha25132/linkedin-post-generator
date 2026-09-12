/**
 * Central, lazily-read env access. Getters are functions so importing this
 * module never throws — a missing var only errors when that feature runs.
 */

function req(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  firecrawlKey: () => req("FIRECRAWL_API_KEY"),

  // Chat provider (DeepSeek, OpenAI-compatible). `writerModel` drafts posts;
  // `utilityModel` runs the high-volume relevance gate.
  llm: () => ({
    apiKey: req("LLM_API_KEY"),
    baseUrl: req("LLM_BASE_URL"),
    writerModel: req("LLM_WRITER_MODEL"),
    utilityModel: req("LLM_UTILITY_MODEL"),
  }),

  // Embeddings live on their own provider — DeepSeek has no embeddings API, so
  // this stays on Gemini regardless of the chat provider above.
  embeddings: () => ({
    apiKey: req("EMBEDDING_API_KEY"),
    baseUrl: req("EMBEDDING_BASE_URL"),
    model: req("EMBEDDING_MODEL"),
    dimensions: num("EMBEDDING_DIMENSIONS", 1024),
  }),

  supabase: () => ({
    url: req("SUPABASE_URL"),
    serviceKey: req("SUPABASE_SERVICE_ROLE_KEY"),
  }),

  appPassword: () => req("APP_PASSWORD"),
  authSecret: () => req("AUTH_SECRET"),
  cronSecret: () => req("CRON_SECRET"),

  // Email digest via Resend. Unconfigured (no key/recipient) = notifications off.
  email: () => ({
    apiKey: process.env.RESEND_API_KEY ?? "",
    to: process.env.NOTIFY_EMAIL ?? "",
    from: process.env.NOTIFY_FROM ?? "Signal Desk <onboarding@resend.dev>",
    minScore: num("NOTIFY_MIN_SCORE", 65),
    maxItems: num("NOTIFY_MAX_ITEMS", 5),
  }),

  monitor: () => ({
    searchLimit: num("MONITOR_SEARCH_LIMIT", 15),
    timeRange: process.env.MONITOR_TIME_RANGE ?? "qdr:d",
    maxAgeDays: num("MONITOR_ARTICLE_MAX_AGE_DAYS", 2),
    // Cap LLM-scored new items per pass so a run stays within the 60s function
    // budget; the next pass picks up the rest.
    maxNewPerRun: num("MONITOR_MAX_NEW_PER_RUN", 24),
    // Wall-clock budget for a whole pass (ms). Kept under the ~60s serverless cap.
    budgetMs: num("MONITOR_BUDGET_MS", 50_000),
  }),
};
