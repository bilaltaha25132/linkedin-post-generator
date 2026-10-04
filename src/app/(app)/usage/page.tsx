import { Coins } from "lucide-react";

import { EmptyState, PageHeader } from "@/components/page-header";
import { SetupNotice } from "@/components/setup-notice";
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
};

export default async function UsagePage() {
  if (!supabaseConfigured()) return <SetupNotice />;
  const rows = await getUsageSummary();

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
    { label: "Total tokens", value: (totals.input + totals.output).toLocaleString() },
    { label: "Input tokens", value: totals.input.toLocaleString() },
    { label: "LLM calls", value: totals.calls.toLocaleString() },
    { label: "Est. cost", value: `$${estCost.toFixed(estCost < 1 ? 4 : 2)}`, hint: "At cache-miss rates" },
  ];

  return (
    <>
      <PageHeader title="Usage" eyebrow="Desk">
        DeepSeek tokens spent so far. The DeepSeek dashboard is the source of truth for billing; this is a live
        in-app estimate.
      </PageHeader>

      {rows.length === 0 ? (
        <EmptyState icon={Coins} title="No usage yet">
          Run a scan or write a post and it&rsquo;ll show up here.
        </EmptyState>
      ) : (
        <>
          <div className="stats">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className="stat reveal"
                style={{ "--reveal-delay": `${i * 60}ms` } as React.CSSProperties}
              >
                <span className="stat-label">{s.label}</span>
                <span className="stat-value">{s.value}</span>
                {s.hint && <span className="stat-hint">{s.hint}</span>}
              </div>
            ))}
          </div>

          <section className="reveal" style={{ "--reveal-delay": "240ms" } as React.CSSProperties}>
            <div className="panel-head" style={{ marginBottom: 12 }}>
              <h2>By operation</h2>
            </div>
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
          </section>
        </>
      )}
    </>
  );
}
