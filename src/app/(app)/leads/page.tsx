import Link from "next/link";
import { Handshake, Search, TriangleAlert } from "lucide-react";

import { DeepLinks, type DeepLink } from "@/components/deep-links";
import { LeadCard } from "@/components/lead-card";
import { AddLeadForm, LeadsScanButton } from "@/components/lead-tools";
import { EmptyState, PageHeader } from "@/components/page-header";
import { SetupNotice } from "@/components/setup-notice";
import { laneStatus, listLeads } from "@/lib/leads/queries";
import type { Lead } from "@/lib/leads/types";
import { postSearchUrl, type PostDate } from "@/lib/links/deep";
import { linkOpens } from "@/lib/links/queries";
import { supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
// "Check sources now" runs a pass (100s budget, see leads/actions.ts).
export const maxDuration = 120;

const VIEWS = [
  { key: "new", label: "New", statuses: ["new"] },
  { key: "pipeline", label: "In progress", statuses: ["contacted", "talking"] },
  { key: "closed", label: "Closed", statuses: ["won", "lost"] },
] as const;

// LinkedIn's post search is fresh where the search APIs are days behind.
// Templates from docs/growth/leads.md; he opens them himself.
const SEARCHES: { label: string; q: string; date: PostDate; jobs?: boolean }[] = [
  {
    label: "Hiring posts",
    q: '("hiring" OR "we\'re hiring") AND ("AI engineer" OR "LLM engineer" OR "GenAI engineer")',
    date: "past-24h",
  },
  {
    label: "Client posts",
    q: '("looking for" OR "need") AND ("freelance" OR "contract" OR "consultant") AND ("AI developer" OR "AI agent" OR "LLM" OR "chatbot")',
    date: "past-week",
  },
  { label: "Founders asking", q: '("looking for" OR "anyone know") AND ("AI engineer" OR "AI developer") AND founder', date: "past-week" },
  { label: "Job posts", q: '"AI engineer"', date: "past-24h", jobs: true },
];
const PLACES = ["", "Dubai", "UK", "Pakistan"];

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view: viewParam } = await searchParams;
  const view = VIEWS.find((v) => v.key === viewParam) ?? VIEWS[0];
  const configured = supabaseConfigured();
  const data = configured ? await load() : null;

  return (
    <>
      <PageHeader
        title="Leads"
        eyebrow="Career"
        action={data && !("error" in data) ? <LeadsScanButton /> : undefined}
      >
        People who want an AI engineer: clients, founders, contract roles and recruiters. The goal is a conversation,
        so each lead comes with a reply you can edit and send yourself.
      </PageHeader>

      {!data ? (
        <SetupNotice />
      ) : "error" in data ? (
        <p className="notice notice-danger" role="alert">
          <TriangleAlert aria-hidden />
          <span>
            Couldn&rsquo;t load leads ({data.error}). If the tables are missing, run{" "}
            <code>node --env-file=.env.local scripts/migrate.mjs</code>.
          </span>
        </p>
      ) : (
        <div className="stack">
          <div className="seg" role="group" aria-label="View" style={{ justifySelf: "start" }}>
            {VIEWS.map((v) => {
              const count = data.leads.filter((l) => (v.statuses as readonly string[]).includes(l.status)).length;
              return (
                <Link key={v.key} href={v.key === "new" ? "/leads" : `/leads?view=${v.key}`} aria-current={v === view ? "page" : undefined}>
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

          {data.dueCount > 0 && view.key !== "pipeline" && (
            <p className="notice" role="status">
              <span>
                {data.dueCount} lead{data.dueCount > 1 ? "s are" : " is"} due a follow-up.{" "}
                <Link className="link" href="/leads?view=pipeline">
                  See them
                </Link>
              </span>
            </p>
          )}

          <List leads={data.leads.filter((l) => (view.statuses as readonly string[]).includes(l.status))} view={view.key} now={data.now} />

          <AddLeadForm />
          <SearchPanel searches={data.searches} now={data.now} />
          <Lanes lanes={data.lanes} />
        </div>
      )}
    </>
  );
}

function List({ leads, view, now }: { leads: Lead[]; view: string; now: number }) {
  if (!leads.length) {
    return (
      <EmptyState icon={Handshake} title={view === "new" ? "No new leads" : view === "pipeline" ? "Nothing in progress" : "Nothing closed yet"}>
        {view === "new"
          ? "Sources are checked three times a day. Open a LinkedIn search below, or add a lead you found."
          : view === "pipeline"
            ? "Leads you reach out to move here, and come back for a follow-up after six days."
            : "Won and lost leads land here."}
      </EmptyState>
    );
  }
  // In progress, the follow-ups due come first.
  const sorted =
    view === "pipeline"
      ? [...leads].sort((a, b) => Date.parse(a.nudge_at ?? "9999") - Date.parse(b.nudge_at ?? "9999"))
      : leads;
  return (
    <div className="wire">
      {sorted.map((lead) => (
        <LeadCard key={lead.id} lead={lead} now={now} />
      ))}
    </div>
  );
}

function SearchPanel({ searches, now }: { searches: { label: string; links: DeepLink[] }[]; now: number }) {
  return (
    <section className="panel stack-sm reveal" aria-labelledby="lead-searches">
      <div className="panel-head" style={{ marginBottom: 0 }}>
        <span className="panel-icon">
          <Search aria-hidden />
        </span>
        <h2 id="lead-searches">Search LinkedIn</h2>
        <p>Newest first, in your browser. Anything worth answering, add above.</p>
      </div>
      <ul className="list-plain stack-sm">
        {searches.map((s) => (
          <li key={s.label} className="stack-xs">
            <strong className="small">{s.label}</strong>
            <DeepLinks links={s.links} now={now} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Lanes({ lanes }: { lanes: { label: string; needs: string[] }[] }) {
  const off = lanes.filter((l) => l.needs.length);
  return (
    <details className="panel reveal">
      <summary>
        Sources: {lanes.length - off.length} of {lanes.length} on
      </summary>
      <ul className="list-plain stack-xs small" style={{ marginTop: 12 }}>
        {lanes.map((l) => (
          <li key={l.label}>
            <span className={l.needs.length ? "chip" : "chip chip-mint"}>{l.needs.length ? "off" : "on"}</span>{" "}
            {l.label}
            {l.needs.length > 0 && (
              <span className="muted">
                {" "}
                (add {l.needs.map((n) => <code key={n}>{n} </code>)}to turn it on, see docs/setup.md)
              </span>
            )}
          </li>
        ))}
        <li className="muted">Contract roles from the Jobs tab, and recruiter messages from the email bridge, join too.</li>
      </ul>
    </details>
  );
}

async function load(): Promise<
  | { leads: Lead[]; searches: { label: string; links: DeepLink[] }[]; lanes: ReturnType<typeof laneStatus>; dueCount: number; now: number }
  | { error: string }
> {
  const now = Date.now();
  try {
    const built = SEARCHES.map((s) => ({
      label: s.label,
      links: PLACES.map((place) => {
        const q = place ? `${s.q} AND ${place}` : s.q;
        return {
          key: `lead-search:${s.label}:${place || "any"}`,
          label: place || "Anywhere",
          href: postSearchUrl(q, { date: s.date, sort: "date_posted", jobs: s.jobs }),
          openedAt: null as string | null,
        };
      }),
    }));
    const [leads, opens] = await Promise.all([listLeads(), linkOpens(built.flatMap((s) => s.links.map((l) => l.key)))]);
    const searches = built.map((s) => ({ ...s, links: s.links.map((l) => ({ ...l, openedAt: opens[l.key] ?? null })) }));
    const dueCount = leads.filter((l) => l.status === "contacted" && l.nudge_at && Date.parse(l.nudge_at) <= now).length;
    return { leads, searches, lanes: laneStatus(), dueCount, now };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
