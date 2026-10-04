export function bandColor(score: number): string {
  if (score >= 75) return "var(--signal-hi)";
  if (score >= 45) return "var(--signal-mid)";
  return "var(--signal-lo)";
}

function bandLabel(score: number): string {
  if (score >= 75) return "Strong";
  if (score >= 45) return "Fair";
  return "Weak";
}

/** The feed's signal gutter: a ring filled to the relevance score, with its band underneath. */
export function SignalScore({ score }: { score: number | null }) {
  const value = Math.max(0, Math.min(100, score ?? 0));
  const color = bandColor(value);
  return (
    <div className="signal" title={`Signal ${score ?? "unscored"} of 100`}>
      <div className="signal-ring">
        <svg viewBox="0 0 48 48" aria-hidden>
          <circle className="track" cx="24" cy="24" r="21" fill="none" strokeWidth="4" />
          <circle
            cx="24"
            cy="24"
            r="21"
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${value} 100`}
          />
        </svg>
        <span className="value">
          {score ?? "?"}
          <span className="sr-only"> out of 100</span>
        </span>
      </div>
      {score !== null && (
        <span className="signal-band" style={{ color }}>
          {bandLabel(value)}
        </span>
      )}
    </div>
  );
}
