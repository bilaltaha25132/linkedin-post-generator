import { SetupNotice } from "@/components/setup-notice";
import { getUsageSummary, type UsageRow } from "@/lib/usage/queries";
import { supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Rough DeepSeek deepseek-chat rates (USD per 1M tokens), cache-miss = upper
// bound. Prices change — the DeepSeek dashboard is the billing source of truth.
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

  return (
    <>
      <div className="page-head">
        <h1>Usage</h1>
        <p>DeepSeek tokens spent so far. The DeepSeek dashboard is the source of truth for billing; this is a live in-app estimate.</p>
      </div>

      {rows.length === 0 ? (
        <div className="empty">
          <h3>No usage yet</h3>
          <p>Run a scan or write a post and it&rsquo;ll show up here.</p>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
            <Stat label="Total tokens" value={(totals.input + totals.output).toLocaleString()} />
            <Stat label="LLM calls" value={totals.calls.toLocaleString()} />
            <Stat label="Est. cost" value={`$${estCost.toFixed(estCost < 1 ? 4 : 2)}`} accent />
          </div>

          <div className="panel" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--ink-soft)" }}>
                  <Th>Operation</Th>
                  <Th right>Calls</Th>
                  <Th right>Input</Th>
                  <Th right>Output</Th>
                  <Th right>Total</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: UsageRow) => (
                  <tr key={r.operation} style={{ borderTop: "1px solid var(--line)" }}>
                    <Td>{OP_LABELS[r.operation] ?? r.operation}</Td>
                    <Td right>{Number(r.calls).toLocaleString()}</Td>
                    <Td right>{Number(r.prompt_tokens).toLocaleString()}</Td>
                    <Td right>{Number(r.completion_tokens).toLocaleString()}</Td>
                    <Td right>{Number(r.total_tokens).toLocaleString()}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="panel" style={{ flex: "1 1 160px" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 28, letterSpacing: "-0.02em", color: accent ? "var(--accent)" : "var(--ink)" }}>
        {value}
      </div>
      <div style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th style={{ padding: "8px 10px", textAlign: right ? "right" : "left", fontWeight: 500 }}>{children}</th>;
}
function Td({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <td style={{ padding: "10px", textAlign: right ? "right" : "left", fontFamily: right ? "var(--font-mono)" : "inherit" }}>
      {children}
    </td>
  );
}
