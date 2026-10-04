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
  // Firecrawl keys, in preference order. Calls round-robin across them and fall
  // back on the next when one is out of credits, so a second free-tier account
  // doubles the monthly allowance. Add more with FIRECRAWL_API_KEY_2, _3, …
  firecrawlKeys: () => {
    const keys = [process.env.FIRECRAWL_API_KEY];
    for (let i = 2; i <= 5; i += 1) keys.push(process.env[`FIRECRAWL_API_KEY_${i}`]);
    const present = keys.filter((key): key is string => Boolean(key));
    if (present.length === 0) throw new Error("Missing required env var: FIRECRAWL_API_KEY");
    return present;
  },

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
    // Firecrawl's `limit` applies per source, so news+web returns twice this and
    // search costs 2 credits per 10 results returned.
    searchLimit: num("MONITOR_SEARCH_LIMIT", 5),
    timeRange: process.env.MONITOR_TIME_RANGE ?? "qdr:d",
    maxAgeDays: num("MONITOR_ARTICLE_MAX_AGE_DAYS", 2),
    // Cap scored new items per pass; the next pass picks up the rest.
    maxNewPerRun: num("MONITOR_MAX_NEW_PER_RUN", 40),
    // Unseen items taken from any one source per pass, so a busy feed can't fill
    // a pass on its own. Sized for an 8-hourly schedule: lower, and a busy day
    // on Hacker News outruns the passes before stories go stale.
    maxItemsPerSource: num("MONITOR_MAX_ITEMS_PER_SOURCE", 8),
    // Items processed side by side. Firecrawl's free plan allows two concurrent
    // scrapes, and a 429 would park a key that still has credits.
    concurrency: num("MONITOR_CONCURRENCY", 2),
    // Feeds run every pass; web search is the credit-heavy part, so it runs one
    // source at a time and no more often than this.
    // Under the 12h schedule, so every scheduled pass includes one search even
    // when GitHub starts it a little early, while a manual scan in between
    // reads the free feeds without spending a search.
    searchIntervalHours: num("MONITOR_SEARCH_INTERVAL_HOURS", 10),
    // Wall-clock budget for a scheduled pass (ms), under the 300s Fluid limit.
    budgetMs: num("MONITOR_BUDGET_MS", 240_000),
  }),
};
