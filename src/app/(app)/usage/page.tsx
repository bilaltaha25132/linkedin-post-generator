import { Coins } from "lucide-react";

import { EmptyState, PageHeader } from "@/components/page-header";
import { SetupNotice } from "@/components/setup-notice";
import { getDeepseekBalance, getFirecrawlCredits } from "@/lib/usage/balances";
import { getUsageSummary, type UsageRow } from "@/lib/usage/queries";
import { supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Rough DeepSeek deepseek-chat rates (USD per 1M tokens), cache-miss = upper
// bound. Prices change; the DeepSeek dashboard is the billing source of truth.
const RATE_INPUT_PER_M = 0.28;
const RATE_OUTPUT_PER_M = 0.42;

const OP_LABELS: Record<string, string> = {
  relevance: "Scoring news (monitor)",
  generate: "Writing posts",
  humanize: "Cleanup edit",
  revise: "Rewrites from your notes",
  enhance: "Polishing your own posts",
  "fact-check": "Fact-checking your posts",
  carousel: "Carousels",
  blog: "Blog posts",
  translate: "Translating (dropped Urdu test)",
};

const resetDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export default async function UsagePage() {
  if (!supabaseConfigured()) return <SetupNotice />;
  const [rows, balance, firecrawl] = await Promise.all([getUsageSummary(), getDeepseekBalance(), getFirecrawlCredits()]);

  const totals = rows.reduce(
    (acc, r) => ({
      calls: acc.calls + Number(r.calls),
      input: acc.input + Number(r.prompt_tokens),
      output: acc.output + Number(r.completion_tokens),
    }),
    { calls: 0, input: 0, output: 0 },
  );
  const estCost = (totals.input / 1e6) * RATE_INPUT_PER_M + (totals.output / 1e6) * RATE_OUTPUT_PER_M;

  const stats = [
    {
      label: "Balance left",
      value: balance ? `$${balance.total.toFixed(2)}` : "Unavailable",
      hint: balance ? "Live from DeepSeek" : "DeepSeek didn't answer",
    },
    { label: "Total tokens", value: (totals.input + totals.output).toLocaleString() },
    { label: "LLM calls", value: totals.calls.toLocaleString() },
    { label: "Spent so far", value: `$${estCost.toFixed(estCost < 1 ? 4 : 2)}`, hint: "Estimate, at cache-miss rates" },
  ];

  const live = firecrawl.filter((a) => a !== null);
  const creditsLeft = live.reduce((n, a) => n + a.remaining, 0);
  const creditsPlan = live.reduce((n, a) => n + a.plan, 0);

  return (
    <>
      <PageHeader title="Usage" eyebrow="Desk">
        What&rsquo;s left on DeepSeek and Firecrawl, read live from each service, and where the DeepSeek tokens went.
      </PageHeader>

      <section className="usage-section reveal">
        <div className="panel-head" style={{ marginBottom: 12 }}>
          <h2>DeepSeek usage</h2>
          <p>Writing and scoring. Billed per token from your balance.</p>
        </div>
        <div className="stats">
          {stats.map((s) => (
            <div key={s.label} className="stat">
              <span className="stat-label">{s.label}</span>
              <span className="stat-value">{s.value}</span>
              {s.hint && <span className="stat-hint">{s.hint}</span>}
            </div>
          ))}
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={Coins} title="No usage yet">
            Run a scan or write a post and it&rsquo;ll show up here.
          </EmptyState>
        ) : (
          <div className="table-wrap scroll-slim">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Operation</th>
                  <th scope="col" className="num">Calls</th>
                  <th scope="col" className="num">Input</th>
                  <th scope="col" className="num">Output</th>
                  <th scope="col" className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: UsageRow) => (
                  <tr key={r.operation}>
                    <td style={{ fontWeight: 500, whiteSpace: "nowrap" }}>{OP_LABELS[r.operation] ?? r.operation}</td>
                    <td className="num">{Number(r.calls).toLocaleString()}</td>
                    <td className="num">{Number(r.prompt_tokens).toLocaleString()}</td>
                    <td className="num">{Number(r.completion_tokens).toLocaleString()}</td>
                    <td className="num">{Number(r.total_tokens).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="usage-section reveal" style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
        <div className="panel-head" style={{ marginBottom: 12 }}>
          <h2>Firecrawl usage</h2>
          <p>Searching and scraping the web. Free credits, refilled every month per account.</p>
        </div>
        <div className="stats">
          <div className="stat">
            <span className="stat-label">Credits left</span>
            <span className="stat-value">{live.length ? creditsLeft.toLocaleString() : "Unavailable"}</span>
            <span className="stat-hint">
              {live.length ? `of ${creditsPlan.toLocaleString()} across ${live.length} account${live.length === 1 ? "" : "s"}` : "Firecrawl didn't answer"}
            </span>
          </div>
          {firecrawl.map((a, i) => (
            <div key={i} className="stat">
              <span className="stat-label">Account {i + 1}</span>
              {a ? (
                <>
                  <span className="stat-value">
                    {a.remaining.toLocaleString()} <span className="stat-of">/ {a.plan.toLocaleString()}</span>
                  </span>
                  <span
                    className="meter"
                    role="meter"
                    aria-label={`Account ${i + 1} credits left`}
                    aria-valuemin={0}
                    aria-valuemax={a.plan}
                    aria-valuenow={a.remaining}
                  >
                    <span style={{ width: `${Math.min(100, (a.remaining / Math.max(1, a.plan)) * 100)}%` }} />
                  </span>
                  <span className="stat-hint">Refills {resetDate(a.resetsAt)}</span>
                </>
              ) : (
                <>
                  <span className="stat-value">Unavailable</span>
                  <span className="stat-hint">This key didn&rsquo;t answer</span>
                </>
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
