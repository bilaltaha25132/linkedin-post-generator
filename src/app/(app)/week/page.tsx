import Link from "next/link";
import { BarChart3, Briefcase, CalendarRange, FlaskConical, PenLine, TriangleAlert, Users } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { SetupNotice } from "@/components/setup-notice";
import { slotLabel } from "@/lib/plan/slot";
import { supabaseConfigured } from "@/lib/supabase/server";
import { buildWeeklyReport, type WeekItem, type WeeklyReport } from "@/lib/weekly/report";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function WeekPage() {
  const configured = supabaseConfigured();
  const data = configured ? await load() : null;

  return (
    <>
      <PageHeader title="This week" eyebrow="Grow">
        The Monday report: how last week went, what to post this week, and who and what needs you. It&rsquo;s emailed
        every Monday at 9 am PKT.
      </PageHeader>

      {!data ? (
        <SetupNotice />
      ) : "error" in data ? (
        <p className="notice notice-danger" role="alert">
          <TriangleAlert aria-hidden />
          <span>Couldn&rsquo;t build the report ({data.error}).</span>
        </p>
      ) : (
        <Report r={data.report} />
      )}
    </>
  );
}

function Report({ r }: { r: WeeklyReport }) {
  const lw = r.lastWeek;
  return (
    <div className="stack">
      <Section icon={BarChart3} title="Last week" note={`Since ${r.weekOf}`}>
        <ul className="figures" style={{ marginTop: 0 }}>
          <li>
            {lw.posts} post{lw.posts === 1 ? "" : "s"}
          </li>
          {lw.medianMultiplier !== null && <li>{lw.medianMultiplier.toFixed(1)}x your usual reach</li>}
          {lw.impressions !== null && <li>{lw.impressions.toLocaleString("en")} impressions</li>}
          {lw.newFollowers !== null && <li>+{lw.newFollowers} followers</li>}
          {lw.searchAppearances !== null && <li>{lw.searchAppearances} search appearances</li>}
        </ul>
        {lw.best && (
          <p className="small">
            Best:{" "}
            {lw.best.url ? (
              <a className="link" href={lw.best.url} target="_blank" rel="noreferrer">
                {lw.best.text}
              </a>
            ) : (
              lw.best.text
            )}{" "}
            <span className="muted">at {lw.best.multiplier.toFixed(1)}x your median</span>
          </p>
        )}
        {lw.foundBy.length > 0 && <p className="small muted">Recruiters found you for {lw.foundBy.join(", ")}.</p>}
        {r.uploadDue && (
          <p className="small">
            <Link className="link" href="/plan">
              Upload this week&rsquo;s analytics export
            </Link>{" "}
            <span className="muted">so these numbers are real.</span>
          </p>
        )}
      </Section>

      <Section icon={PenLine} title="This week's plan" note="Three slots, Tuesday to Thursday at 6 pm PKT">
        {r.plan.length ? (
          <ul className="list-plain stack-sm">
            {r.plan.map((s) => (
              <li key={s.href} className="stack-xs">
                <span className="meta-mono">{s.slot ? slotLabel(new Date(s.slot)) : "Any day"}</span>
                <Link className="link" href={s.href}>
                  {s.format === "carousel" ? "Carousel: " : ""}
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="small muted">Nothing strong on the wire yet. Write from your own work this week.</p>
        )}
      </Section>

      <Section icon={Users} title="People" note={`${r.people.replies} replies waiting, ${r.people.roundsDue} rounds due`}>
        <Items items={r.people.warm} empty="No one new engaged with you twice." />
        <Link className="link small" href="/engage">
          Open Engage
        </Link>
      </Section>

      <Section icon={Briefcase} title="Jobs and leads" note="The strongest new this week">
        <Items items={[...r.jobs, ...r.leads]} empty="No strong new roles or leads this week." />
        {r.nudges.map((n) => (
          <p key={n} className="small">
            {n}
          </p>
        ))}
      </Section>

      <Section icon={FlaskConical} title="One experiment">
        <p className="small">{r.experiment}</p>
      </Section>

      {r.progress && (
        <Section icon={CalendarRange} title="Top Voice progress" note="Monthly">
          <ul className="figures" style={{ marginTop: 0 }}>
            <li>{r.progress.streakWeeks} week streak</li>
            {r.progress.onLane !== null && <li>{Math.round(r.progress.onLane * 100)}% on-lane</li>}
            {r.progress.ownWork !== null && <li>{Math.round(r.progress.ownWork * 100)}% your own work</li>}
            <li>{r.progress.comments30} comments given</li>
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  note,
  children,
}: {
  icon: typeof PenLine;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel stack-sm reveal" aria-label={title}>
      <div className="panel-head" style={{ marginBottom: 0 }}>
        <span className="panel-icon">
          <Icon aria-hidden />
        </span>
        <h2>{title}</h2>
        {note && <p>{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Items({ items, empty }: { items: WeekItem[]; empty: string }) {
  if (!items.length) return <p className="small muted">{empty}</p>;
  return (
    <ul className="list-plain stack-sm">
      {items.map((i) => (
        <li key={i.href + i.title} className="stack-xs">
          <Link className="link" href={i.href}>
            {i.title}
          </Link>
          {i.sub && <span className="small muted">{i.sub}</span>}
        </li>
      ))}
    </ul>
  );
}

async function load() {
  try {
    return { report: await buildWeeklyReport(Date.now()) };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
