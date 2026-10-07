import Link from "next/link";
import { IdCard, TriangleAlert, Users } from "lucide-react";

import { AddConnectionForm, ConnectionCard, ProfileReviewPanel, RefreshQueueButton } from "@/components/network-tools";
import { EmptyState, PageHeader } from "@/components/page-header";
import { SetupNotice } from "@/components/setup-notice";
import { DAILY_INVITES, MIN_ACCEPTANCE, WEEKLY_INVITES } from "@/lib/network/format";
import { getProfileReview, listConnections, pace } from "@/lib/network/queries";
import { syncSuggestions } from "@/lib/network/suggest";
import type { Connection } from "@/lib/network/types";
import { supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
// The profile review is one long writer call.
export const maxDuration = 120;

const VIEWS = [
  { key: "queue", label: "Queue", statuses: ["incoming", "suggested"] },
  { key: "sent", label: "Sent", statuses: ["sent"] },
  { key: "connected", label: "Connected", statuses: ["accepted", "talking"] },
] as const;

export default async function NetworkPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view: viewParam } = await searchParams;
  const view = VIEWS.find((v) => v.key === viewParam) ?? VIEWS[0];
  const configured = supabaseConfigured();
  const data = configured ? await load() : null;

  return (
    <>
      <PageHeader title="Network" eyebrow="Grow" action={data && !("error" in data) ? <RefreshQueueButton /> : undefined}>
        People worth knowing, from who engaged with you, who you commented on, your leads and the roles you saved. You
        send every invite yourself, at a pace that keeps acceptance high.
      </PageHeader>

      {!data ? (
        <SetupNotice />
      ) : "error" in data ? (
        <p className="notice notice-danger" role="alert">
          <TriangleAlert aria-hidden />
          <span>
            Couldn&rsquo;t load your network ({data.error}). If the tables are missing, run{" "}
            <code>node --env-file=.env.local scripts/migrate.mjs</code>.
          </span>
        </p>
      ) : (
        <div className="stack">
          <ul className="figures" style={{ marginTop: 0 }}>
            <li>
              {data.pace.today} of {DAILY_INVITES} today
            </li>
            <li>
              {data.pace.week} of {WEEKLY_INVITES} this week
            </li>
            <li>{data.pace.notesLeft} notes left this month</li>
            {data.pace.acceptance !== null && <li>{Math.round(data.pace.acceptance * 100)}% accepted</li>}
          </ul>

          {data.pace.paused && (
            <p className="notice" role="status">
              <TriangleAlert aria-hidden />
              <span>
                Under {Math.round(MIN_ACCEPTANCE * 100)}% of your last invites were accepted. LinkedIn restricts accounts with
                low acceptance, so the queue is paused. Favour people who already engaged with you.
              </span>
            </p>
          )}

          <div className="seg" role="group" aria-label="View" style={{ justifySelf: "start" }}>
            {VIEWS.map((v) => {
              const count = data.connections.filter((c) => (v.statuses as readonly string[]).includes(c.status)).length;
              return (
                <Link key={v.key} href={v.key === "queue" ? "/network" : `/network?view=${v.key}`} aria-current={v === view ? "page" : undefined}>
                  {v.label}
                  {count > 0 && (
                    <span className="muted" style={{ marginLeft: 6 }}>
                      {count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <List
            connections={data.connections.filter((c) => (view.statuses as readonly string[]).includes(c.status))}
            view={view.key}
            canSend={!data.pace.paused && data.pace.dailyLeft > 0}
            notesLeft={data.pace.notesLeft}
            dailyLeft={data.pace.dailyLeft}
          />
          <AddConnectionForm />

          <section className="panel stack-sm reveal" aria-labelledby="profile-heading">
            <div className="panel-head" style={{ marginBottom: 0 }}>
              <span className="panel-icon">
                <IdCard aria-hidden />
              </span>
              <h2 id="profile-heading">Profile review</h2>
              <p>
                {data.profile.reviewedAt
                  ? `Last reviewed ${data.profile.reviewedAt.slice(0, 10)}. Re-run it when your job matches shift.`
                  : "Checks your headline, About, experience and skills against what recruiters search for, and drafts rewrites you paste in yourself."}
              </p>
            </div>
            <ProfileReviewPanel initialProfile={data.profile.profile} initialReview={data.profile.review} />
          </section>
        </div>
      )}
    </>
  );
}

function List({
  connections,
  view,
  canSend,
  notesLeft,
  dailyLeft,
}: {
  connections: Connection[];
  view: string;
  canSend: boolean;
  notesLeft: number;
  dailyLeft: number;
}) {
  if (!connections.length) {
    return (
      <EmptyState
        icon={Users}
        title={view === "queue" ? "No one in the queue" : view === "sent" ? "No invites waiting" : "No connections logged yet"}
      >
        {view === "queue"
          ? "People who comment on your posts, whose posts you comment on, founders behind your leads and the teams behind roles you save show up here. Add someone yourself below."
          : view === "sent"
            ? "Invites you mark as sent wait here until they're accepted."
            : "Accepted invites land here."}
      </EmptyState>
    );
  }
  // Invitations to answer first, then today's share of the queue.
  const shown =
    view === "queue"
      ? [
          ...connections.filter((c) => c.status === "incoming"),
          ...connections.filter((c) => c.status === "suggested").slice(0, Math.max(dailyLeft, 3)),
        ]
      : connections;
  const rest = connections.length - shown.length;
  return (
    <div className="wire">
      {shown.map((c) => (
        <ConnectionCard key={c.id} c={c} canSend={canSend} notesLeft={notesLeft} />
      ))}
      {rest > 0 && <p className="small muted">{rest} more wait for another day. Ten a day keeps it human.</p>}
    </div>
  );
}

async function load() {
  const now = Date.now();
  try {
    await syncSuggestions(now);
    const [connections, pace_, profile] = await Promise.all([listConnections(), pace(now), getProfileReview()]);
    return { connections, pace: pace_, profile };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
