import Link from "next/link";
import { CalendarClock } from "lucide-react";

import { STAGES, stateName } from "@/lib/study/catalog";
import { DOCUMENTS } from "@/lib/study/documents";
import type { Program, StudyStage } from "@/lib/study/types";
import { formatDay, liveWindow, summerStatus, targetYears, type LiveWindow } from "@/lib/study/windows";

const SOON_DAYS = 45;
const OTHERS_SHOWN = 8;

type Closing = { program: Program; window: LiveWindow; stage?: StudyStage };

/** What he sees first: how much is open, what closes next, and how far his own list has got. */
export function StudyOverview({
  programs,
  stages,
  docsDone,
  now: nowMs,
}: {
  programs: Program[];
  stages: Record<string, StudyStage>;
  docsDone: number;
  now: number;
}) {
  const now = new Date(nowMs);
  const years = targetYears(now);
  const relevant = programs.filter((p) => p.tier !== "wider" || stages[p.id]);
  const openSummer = relevant.filter((p) => p.tier === "core" && summerStatus(p, now) === "open");

  const closing: Closing[] = relevant.flatMap((p) =>
    (["summer", "winter"] as const)
      .map((intake) => liveWindow(intake === "summer" ? p.summerSpan : p.winterSpan, intake, now))
      .filter((w): w is LiveWindow => w !== null && w.status === "open" && w.daysLeft <= SOON_DAYS)
      .map((window) => ({ program: p, window, stage: stages[p.id] })),
  );
  closing.sort((a, b) => a.window.end.getTime() - b.window.end.getTime());
  const mine = closing.filter((c) => c.stage && c.stage !== "dropped" && c.stage !== "rejected");
  const others = closing.filter((c) => !c.stage && c.program.tier === "core");
  const following = Object.values(stages);
  const applied = following.filter((s) => s === "applied" || s === "admitted").length;

  const tiles = [
    {
      label: `Open for summer ${years.summer}`,
      value: openSummer.length,
      hint: "CS, AI and data programs taking applications today",
      href: "/study",
    },
    {
      label: `Closing in ${SOON_DAYS} days`,
      value: closing.filter((c) => c.program.tier === "core" || c.stage).length,
      hint: "Summer or winter windows, CS, AI and data",
      href: "/study",
    },
    {
      label: "Following",
      value: following.length,
      hint: applied ? `${applied} applied or admitted` : "Nothing applied to yet",
      href: "/study?view=following",
    },
    {
      label: "Documents ready",
      value: docsDone,
      of: `of ${DOCUMENTS.length}`,
      hint: "Prepared once, used everywhere",
      href: "/study?view=documents",
    },
  ];

  return (
    <div className="stack">
      <div className="stats" style={{ marginBottom: 0 }}>
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="stat">
            <span className="stat-label">{t.label}</span>
            <span className="stat-value">
              {t.value} {t.of && <span className="stat-of">{t.of}</span>}
            </span>
            <span className="stat-hint">{t.hint}</span>
          </Link>
        ))}
      </div>

      <div className="today-lists">
        <ClosingList
          title="Your programs closing soon"
          empty="None of the programs you follow close in the next 45 days."
          items={mine}
        />
        <ClosingList
          title="Also closing soon"
          empty="No other CS, AI or data window closes in the next 45 days."
          items={others.slice(0, OTHERS_SHOWN)}
          more={others.length > OTHERS_SHOWN ? `${others.length - OTHERS_SHOWN} more. Sort the list below by next deadline to see them.` : undefined}
        />
      </div>
    </div>
  );
}

function ClosingList({ title, empty, items, more }: { title: string; empty: string; items: Closing[]; more?: string }) {
  return (
    <section className="panel stack-sm" aria-label={title}>
      <div className="panel-head" style={{ marginBottom: 0 }}>
        <h2>
          {title} <span className="muted">{items.length}</span>
        </h2>
      </div>
      {items.length === 0 ? (
        <p className="small soft">{empty}</p>
      ) : (
        <ul className="list-plain stack-sm">
          {items.map(({ program: p, window: w, stage }) => (
            <li key={`${p.id}-${w.intake}`} className="study-closing">
              <span className={`study-days${w.daysLeft <= 14 ? " study-days-urgent" : ""}`}>
                <strong>{w.daysLeft}</strong>
                <span>{w.daysLeft === 1 ? "day" : "days"}</span>
              </span>
              <span style={{ minWidth: 0 }}>
                {p.source ? (
                  <a href={p.source} target="_blank" rel="noreferrer" className="truncate" style={{ display: "block" }}>
                    <strong>{p.program}</strong>
                  </a>
                ) : (
                  <strong className="truncate">{p.program}</strong>
                )}
                <span className="small soft truncate" style={{ display: "block" }}>
                  {p.university}, {stateName(p.state)}
                </span>
                <span className="small muted">
                  <CalendarClock aria-hidden size={12} /> {w.intake === "summer" ? "Summer" : "Winter"} {w.year}, closes {formatDay(w.end)}
                  {stage ? `. ${STAGES.find((s) => s.stage === stage)?.label}` : ""}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {more && <p className="small muted">{more}</p>}
    </section>
  );
}
