export function bandColor(score: number): string {
  if (score >= 75) return "var(--signal-hi)";
  if (score >= 45) return "var(--signal-mid)";
  return "var(--signal-lo)";
}

/** The feed's signal gutter: a vertical meter plus the mono relevance score. */
export function SignalScore({ score }: { score: number | null }) {
  const value = score ?? 0;
  const color = bandColor(value);
  return (
    <div className="signal" title={`Signal ${value} of 100`}>
      <div className="meter">
        <i style={{ height: `${value}%`, background: color }} />
      </div>
      <div className="score" style={{ color }}>
        {score ?? "—"}
        <small>/ 100</small>
      </div>
    </div>
  );
}
