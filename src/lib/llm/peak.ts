/**
 * DeepSeek bills peak hours at double the off-peak rate. Peak is 01:00-04:00
 * and 06:00-10:00 UTC, Monday to Friday; weekends are off-peak all day (per
 * api-docs.deepseek.com/quick_start/pricing, checked 2026-10). Chinese public
 * holidays are also off-peak, but aren't modelled: treating them as peak only
 * errs toward waiting.
 */
const PEAK_WINDOWS: [number, number][] = [
  [1, 4],
  [6, 10],
];

export function isDeepSeekPeak(at: Date = new Date()): boolean {
  const day = at.getUTCDay();
  if (day === 0 || day === 6) return false;
  const hour = at.getUTCHours();
  return PEAK_WINDOWS.some(([start, end]) => hour >= start && hour < end);
}

/** When the current peak window ends; null when it's off-peak already. */
export function peakEndsAt(at: Date = new Date()): Date | null {
  if (!isDeepSeekPeak(at)) return null;
  const hour = at.getUTCHours();
  const window = PEAK_WINDOWS.find(([start, end]) => hour >= start && hour < end)!;
  const end = new Date(at);
  end.setUTCHours(window[1], 0, 0, 0);
  return end;
}
