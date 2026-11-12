import { ExternalLink } from "lucide-react";

import { describeSignal } from "@/lib/study/extract";
import type { CheckSummary } from "@/lib/study/types";

const DAY = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
// Changes this recent get the amber flag on the card.
const RECENT_CHANGE_DAYS = 30;

export function recentlyChanged(check: CheckSummary | undefined, now: Date): boolean {
  return Boolean(check?.last_changed_at && now.getTime() - Date.parse(check.last_changed_at) < RECENT_CHANGE_DAYS * 86_400_000);
}

/** One line under a program saying what the last automatic read of its official page found. */
export function CheckLine({ check, now }: { check?: CheckSummary; now: Date }) {
  if (!check) return <p className="small muted study-check">Not checked automatically yet.</p>;
  const when = DAY.format(new Date(check.checked_at));
  const changed = recentlyChanged(check, now);
  const page = (
    <a href={check.url} target="_blank" rel="noreferrer">
      {check.url.includes("daad.de") ? "DAAD page" : "official page"} <ExternalLink aria-hidden size={11} />
    </a>
  );

  let tone = "muted";
  let text: string;
  if (check.status !== "ok") {
    const reason = check.status === "blocked" ? "the site refused an automated read" : check.status === "skipped" ? "it is a PDF" : (check.error ?? "it didn't load");
    const lastGood = check.last_ok_at ? ` Last read ${DAY.format(new Date(check.last_ok_at))}.` : "";
    text = `Couldn't check the page on ${when}: ${reason}.${lastGood}`;
    tone = "soft";
  } else if (check.verdict === "match") {
    text = `Checked ${when}: the closing date matches the`;
    tone = "study-check-ok";
  } else if (check.verdict === "differs") {
    text = `Checked ${when}: the page shows ${check.dates.slice(0, 4).map(describeSignal).join(", ")}, not the dates here. Confirm on the`;
    tone = "study-check-warn";
  } else {
    text = `Checked ${when}: no deadline dates found on the`;
  }

  return (
    <p className={`small study-check ${tone}`}>
      {changed && <span className="chip chip-amber">Page changed {DAY.format(new Date(check.last_changed_at!))}</span>}{" "}
      {text} {check.status === "ok" ? page : null}
      {check.status === "ok" ? "." : null}
    </p>
  );
}
