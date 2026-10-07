import Link from "next/link";
import { Briefcase, CalendarClock, Handshake, PenLine, TriangleAlert } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { SetupNotice } from "@/components/setup-notice";
import { SignalScore } from "@/components/signal-score";
import { postThisNext, type Suggestion } from "@/lib/plan/next";
import { listPillars, postPerformance, recentPosts, upcomingPosts, type Upcoming } from "@/lib/plan/queries";
import { slotLabel } from "@/lib/plan/slot";
import { JOB_BAR, LEAD_BAR, todaySummary, type TodayItem, type TodaySummary } from "@/lib/today/queries";
import { supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
// The post suggestion embeds up to a dozen new wire stories first.
export const maxDuration = 60;

const PKT_MS = 5 * 3_600_000;

export default async function TodayPage() {
  const configured = supabaseConfigured();
  const data = configured ? await load() : null;

  return (
    <>
      <PageHeader title={data && !("error" in data) ? dayTitle(data.now) : "Today"} eyebrow="Grow">
        The day on one screen: your next post, the people to answer, and the jobs and leads worth a look.
      </PageHeader>

      {!data ? (
        <SetupNotice />
      ) : "error" in data ? (
        <p className="notice notice-danger" role="alert">
          <TriangleAlert aria-hidden />
          <span>Couldn&rsquo;t load today ({data.error}).</span>
        </p>
      ) : (
        <div className="stack">
          <NextPost next={data.next} suggestion={data.suggestion} queued={data.summary.queued} now={data.now} />
          <Engagement summary={data.summary} />
          <div className="today-lists">
            <ItemList
              icon={Briefcase}
              title="Jobs"
              note={`${data.summary.jobsNew} new at ${JOB_BAR}+ in three days`}
              items={data.summary.jobs}
              empty="No new roles at this fit. The job scan runs twice a day."
              more="/jobs"
            />
            <ItemList
              icon={Handshake}
              title="Leads"
              note={
                `${data.summary.leadsNew} new at ${LEAD_BAR}+` +
                (data.summary.followUps ? `, ${data.summary.followUps} follow-up${data.summary.followUps > 1 ? "s" : ""} due` : "")
              }
              items={data.summary.leads}
              empty="No strong new leads. Sources are checked three times a day."
              more={data.summary.followUps ? "/leads?view=pipeline" : "/leads"}
            />
          </div>
        </div>
      )}
    </>
  );
}

function dayTitle(now: number): string {
  const d = new Date(now + PKT_MS).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  return `Today, ${d}`;
}

function untilText(at: number, now: number): string {
  const hours = (at - now) / 3_600_000;
  if (hours < 1) return "within the hour";
  if (hours < 36) return `in ${Math.round(hours)}h`;
  return `in ${Math.round(hours / 24)} days`;
}

function NextPost({
  next,
  suggestion,
  queued,
  now,
}: {
  next: Upcoming | null;
  suggestion: Suggestion | null;
  queued: number;
  now: number;
}) {
  return (
    <section className="panel stack-sm reveal" aria-labelledby="next-post">
      <div className="panel-head" style={{ marginBottom: 0 }}>
        <span className="panel-icon">
          <CalendarClock aria-hidden />
        </span>
        <h2 id="next-post">Next post</h2>
        <p>
          {next
            ? `Scheduled ${untilText(Date.parse(next.at), now)}.`
            : suggestion?.slot
              ? `Nothing scheduled. Next good slot: ${slotLabel(new Date(suggestion.slot))} (${untilText(Date.parse(suggestion.slot), now)}).`
              : "Nothing scheduled."}
        </p>
      </div>
      {next ? (
        <div className="today-row">
          <p className="truncate">{next.excerpt.split("\n")[0]}</p>
          <Link className="btn btn-sm" href="/queue">
            Open the queue
          </Link>
        </div>
      ) : suggestion ? (
        <div className="today-row">
          <div style={{ minWidth: 0 }}>
            <p className="truncate">
              <strong>{suggestion.format === "carousel" ? "Carousel: " : ""}</strong>
              {suggestion.title}
            </p>
            <p className="small muted">{suggestion.why[0]}</p>
          </div>
          <Link className="btn btn-dark btn-sm" href={suggestion.href}>
            <PenLine aria-hidden /> Draft it
          </Link>
        </div>
      ) : null}
      <p className="small muted">
        {queued ? `${queued} draft${queued > 1 ? "s" : ""} in To post. ` : ""}
        <Link className="link" href="/plan">
          More ideas in Plan
        </Link>
      </p>
    </section>
  );
}

function Engagement({ summary }: { summary: TodaySummary }) {
  const tiles = [
    { label: "Comments today", value: summary.commentsToday, of: "of 5-10", hint: "Thoughtful ones on posts in your lane" },
    { label: "Drafts waiting", value: summary.draftsWaiting, hint: "Posts you shared in, with a comment ready" },
    { label: "Rounds due", value: summary.roundsDue, hint: "People on your list to visit" },
    { label: "Replies waiting", value: summary.replies, hint: "Comments on your own posts" },
  ];
  return (
    <div className="stats" style={{ marginBottom: 0 }}>
      {tiles.map((t) => (
        <Link key={t.label} href="/engage" className="stat">
          <span className="stat-label">{t.label}</span>
          <span className="stat-value">
            {t.value} {t.of && <span className="stat-of">{t.of}</span>}
          </span>
          <span className="stat-hint">{t.hint}</span>
        </Link>
      ))}
    </div>
  );
}

function ItemList({
  icon: Icon,
  title,
  note,
  items,
  empty,
  more,
}: {
  icon: typeof Briefcase;
  title: string;
  note: string;
  items: TodayItem[];
  empty: string;
  more: string;
}) {
  return (
    <section className="panel stack-sm reveal" aria-label={title}>
      <div className="panel-head" style={{ marginBottom: 0 }}>
        <span className="panel-icon">
          <Icon aria-hidden />
        </span>
        <h2>{title}</h2>
        <p>{note}</p>
      </div>
      {items.length ? (
        <ul className="list-plain stack-sm">
          {items.map((i) => (
            <li key={i.id} className="today-item">
              <SignalScore score={i.score} label="Fit" />
              <div style={{ minWidth: 0 }}>
                <Link className="link" href={i.href}>
                  {i.title}
                </Link>
                {i.sub && <p className="small muted truncate">{i.sub}</p>}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="small muted">{empty}</p>
      )}
      <Link className="link small" href={more}>
        Open {title}
      </Link>
    </section>
  );
}

async function load() {
  const now = Date.now();
  try {
    const [summary, pillars, recent, performance, upcoming] = await Promise.all([
      todaySummary(now),
      listPillars(),
      recentPosts(10),
      postPerformance(),
      upcomingPosts(),
    ]);
    const next = upcoming.find((u) => Date.parse(u.at) > now) ?? null;
    const suggestion = next ? null : ((await postThisNext({ now, pillars, recent, performance, upcoming })).suggestions[0] ?? null);
    return { now, summary, next, suggestion };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
