import Link from "next/link";
import { BarChart3, Clock, Compass, Layers, PenLine, TriangleAlert } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { AnalyticsUpload, PillarEditor } from "@/components/plan-tools";
import { SetupNotice } from "@/components/setup-notice";
import {
  bucketBy,
  followerConversion,
  median,
  reachMultipliers,
  SOLID_BUCKET,
  weekdayPkt,
  type Bucket,
  type PostPerf,
} from "@/lib/plan/metrics";
import { postThisNext, type Mix, type Suggestion } from "@/lib/plan/next";
import { cadenceChecks, type Check } from "@/lib/plan/preflight";
import {
  accountSummary,
  listPillars,
  postPerformance,
  recentPosts,
  upcomingPosts,
  type AccountSummary,
  type Pillar,
  type Upcoming,
} from "@/lib/plan/queries";
import { slotLabel } from "@/lib/plan/slot";
import { supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
// Ranking embeds up to a dozen new wire stories first.
export const maxDuration = 60;

const PILLAR_COLORS = ["var(--brand)", "var(--brand-indigo)", "var(--positive)", "var(--signal-mid)"];

export default async function PlanPage() {
  const configured = supabaseConfigured();
  const data = configured ? await load() : null;

  return (
    <>
      <PageHeader title="Plan" eyebrow="Grow" action={data && !("error" in data) ? <AnalyticsUpload /> : undefined}>
        What to post next and when, from what&rsquo;s on the wire, what your audience responds to, and what employers
        ask for. Upload your LinkedIn analytics export each week to keep the numbers current.
      </PageHeader>

      {!data ? (
        <SetupNotice />
      ) : "error" in data ? (
        <p className="notice notice-danger" role="alert">
          <TriangleAlert aria-hidden />
          <span>
            Couldn&rsquo;t load the plan ({data.error}). If the tables are missing, run{" "}
            <code>node --env-file=.env.local scripts/migrate.mjs</code>.
          </span>
        </p>
      ) : (
        <div className="stack">
          {data.mix.drifting && (
            <p className="notice" role="status">
              <TriangleAlert aria-hidden />
              <span>
                Only {data.mix.onPillar} of your last {data.mix.total} posts sit squarely in a pillar. LinkedIn learns
                who to show you to from a steady topic, so only on-pillar ideas are suggested until that recovers.
              </span>
            </p>
          )}

          <Suggestions suggestions={data.suggestions} pillars={data.pillars} />
          <MixPanel mix={data.mix} skills={data.skills} />
          <Upcoming upcoming={data.upcoming} />
          <Working perf={data.performance} account={data.account} pillars={data.pillars} />

          <details className="panel reveal">
            <summary>Pillars: what each covers, and its share of your posts</summary>
            <div style={{ marginTop: 12 }}>
              <PillarEditor
                pillars={data.pillars.map((p) => ({ id: p.id, name: p.name, description: p.description, target_share: p.target_share }))}
              />
            </div>
          </details>
        </div>
      )}
    </>
  );
}

function Suggestions({ suggestions, pillars }: { suggestions: Suggestion[]; pillars: Pillar[] }) {
  const name = new Map(pillars.map((p) => [p.id, p.name]));
  return (
    <section className="stack-sm reveal" aria-labelledby="next-heading">
      <div className="panel-head" style={{ marginBottom: 0 }}>
        <span className="panel-icon">
          <PenLine aria-hidden />
        </span>
        <h2 id="next-heading">Post this next</h2>
        <p>Ranked by how strong and fresh the story is, how well it fits a pillar, and what your mix needs.</p>
      </div>
      {!suggestions.length ? (
        <p className="panel muted small">
          Nothing strong on the wire this week that fits your pillars. Check the{" "}
          <Link className="link" href="/">
            feed
          </Link>{" "}
          after the next scan, or write from your own work.
        </p>
      ) : (
        <ol className="wire list-plain">
          {suggestions.map((s) => (
            <li key={s.href} className="wire-row plan-row">
              <div style={{ minWidth: 0 }} className="stack-xs">
                <h3>{s.title}</h3>
                {s.angle && <p className="small">{s.angle}</p>}
                <div className="meta">
                  <span className="launch-tag paper-tag">{KIND[s.kind]}</span>
                  {s.pillarId && <span>{name.get(s.pillarId)}</span>}
                  <span>{s.format === "carousel" ? "Carousel" : "Text post"}</span>
                  {s.slot && <span>{slotLabel(new Date(s.slot))}</span>}
                </div>
                <p className="reason">{sentence(s.why)}</p>
              </div>
              <Link className="btn btn-dark btn-sm" href={s.href}>
                <PenLine aria-hidden /> Draft it
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

const KIND: Record<Suggestion["kind"], string> = {
  story: "From the wire",
  "follow-up": "Follow-up",
  repurpose: "Repurpose",
  build: "Your work",
};

function sentence(parts: string[]): string {
  const s = parts.join("; ");
  return s.charAt(0).toUpperCase() + s.slice(1) + ".";
}

function MixPanel({ mix, skills }: { mix: Mix; skills: { skill: string; n: number }[] }) {
  return (
    <section className="panel stack-sm reveal" aria-labelledby="mix-heading">
      <div className="panel-head" style={{ marginBottom: 0 }}>
        <span className="panel-icon">
          <Compass aria-hidden />
        </span>
        <h2 id="mix-heading">Your mix</h2>
        <p>
          {mix.total
            ? `Your last ${mix.total} posts by pillar, against the share you set.`
            : "Posts you mark posted, publish from here or import from LinkedIn are sorted into pillars."}
        </p>
      </div>
      {mix.total > 0 && (
        <>
          <div className="mix-bar" aria-hidden>
            {mix.pillars.map((p, i) => (
              <span key={p.id} style={{ width: `${(p.count / mix.total) * 100}%`, background: PILLAR_COLORS[i % PILLAR_COLORS.length] }} />
            ))}
          </div>
          <table className="plan-table">
            <thead>
              <tr>
                <th>Pillar</th>
                <th>Posts</th>
                <th>Share</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {mix.pillars.map((p, i) => (
                <tr key={p.id}>
                  <td>
                    <span className="mix-dot" style={{ background: PILLAR_COLORS[i % PILLAR_COLORS.length] }} />
                    {p.name}
                  </td>
                  <td>{p.count}</td>
                  <td>{Math.round((p.count / mix.total) * 100)}%</td>
                  <td>{Math.round(p.target * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {skills.length > 0 && (
        <div className="stack-xs">
          <span className="small muted">Asked for most in your strong job matches this month (posts about these get a boost):</span>
          <ul className="figures" style={{ marginTop: 0 }}>
            {skills.slice(0, 10).map((s) => (
              <li key={s.skill}>
                {s.skill} <span className="muted">{s.n}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Upcoming({ upcoming }: { upcoming: (Upcoming & { checks: Check[] })[] }) {
  if (!upcoming.length) return null;
  return (
    <section className="panel stack-sm reveal" aria-labelledby="upcoming-heading">
      <div className="panel-head" style={{ marginBottom: 0 }}>
        <span className="panel-icon">
          <Clock aria-hidden />
        </span>
        <h2 id="upcoming-heading">Scheduled</h2>
        <p>Posts waiting to go out, with any clash in timing.</p>
      </div>
      <ul className="list-plain stack-sm">
        {upcoming.map((u) => (
          <li key={u.id} className="stack-xs">
            <span className="small">
              <strong>{slotLabelAny(u.at)}</strong> <span className="muted">{u.excerpt.split("\n")[0]}</span>
            </span>
            {u.checks.map((c) => (
              <span key={c.key} className="small muted">
                {c.message}
              </span>
            ))}
          </li>
        ))}
      </ul>
      <Link className="link small" href="/queue">
        Open the queue
      </Link>
    </section>
  );
}

function slotLabelAny(iso: string): string {
  const pkt = new Date(Date.parse(iso) + 5 * 3_600_000);
  return pkt.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }) + " PKT";
}

function Working({ perf, account, pillars }: { perf: PostPerf[]; account: AccountSummary; pillars: Pillar[] }) {
  const measured = perf.filter((p) => p.impressions !== null);
  const multipliers = reachMultipliers(measured);
  const name = new Map(pillars.map((p) => [p.id, p.name]));
  const tables: { title: string; rows: Bucket[]; label?: (k: string) => string }[] = [
    { title: "Format", rows: bucketBy(measured, multipliers, (p) => p.format), label: (k: string) => FORMAT[k] ?? k },
    { title: "Pillar", rows: bucketBy(measured, multipliers, (p) => p.pillarId), label: (k: string) => name.get(k) ?? "Unsorted" },
    { title: "Opening line", rows: bucketBy(measured, multipliers, (p) => p.hookType) },
    { title: "Weekday (PKT)", rows: bucketBy(measured, multipliers, (p) => (p.publishedAt ? weekdayPkt(p.publishedAt) : null)) },
  ].filter((t) => t.rows.length);
  const conversions = measured.map(followerConversion).filter((x): x is number => x !== null);
  const top = [...measured].sort((a, b) => (multipliers.get(b.id) ?? 0) - (multipliers.get(a.id) ?? 0)).slice(0, 3);

  return (
    <section className="panel stack-sm reveal" aria-labelledby="working-heading">
      <div className="panel-head" style={{ marginBottom: 0 }}>
        <span className="panel-icon">
          <BarChart3 aria-hidden />
        </span>
        <h2 id="working-heading">What&rsquo;s working</h2>
        <p>
          {account.lastImport
            ? `From your exports, last imported ${account.lastImport}. Reach is shown against your typical post, so account growth doesn't flatter newer posts.`
            : "Nothing imported yet."}
        </p>
      </div>

      {!account.lastImport && !measured.length ? (
        <div className="stack-xs small">
          <p>Two exports fill this in. Both stay in your Signal Desk database.</p>
          <ol className="stack-xs" style={{ paddingLeft: 20 }}>
            <li>
              <strong>Weekly:</strong> on LinkedIn open your profile, then Analytics, then Export, and upload the .xlsx
              here. A single post&rsquo;s analytics export works too, and adds its saves, sends and followers.
            </li>
            <li>
              <strong>Once:</strong> Settings, Data privacy, Get a copy of your data, pick Posts (Shares). Upload the
              .zip when LinkedIn emails it, and every post you&rsquo;ve written comes in with its date.
            </li>
          </ol>
        </div>
      ) : (
        <>
          <ul className="figures" style={{ marginTop: 0 }}>
            {account.totalFollowers !== null && <li>{account.totalFollowers.toLocaleString("en")} followers</li>}
            {account.newFollowers28 !== null && <li>+{account.newFollowers28.toLocaleString("en")} in 28 days</li>}
            {account.impressions28 !== null && (
              <li>
                {account.impressions28.toLocaleString("en")} impressions in 28 days
                {account.impressionsPrev28 ? ` (${change(account.impressions28, account.impressionsPrev28)})` : ""}
              </li>
            )}
            {conversions.length >= SOLID_BUCKET && (
              <li>{median(conversions)!.toFixed(1)} followers per 1,000 reached (median)</li>
            )}
            <li>
              {measured.length} post{measured.length === 1 ? "" : "s"} with numbers
            </li>
          </ul>

          {top.length > 0 && (
            <div className="stack-xs">
              <strong className="small">Best recent reach</strong>
              <ul className="list-plain stack-xs small">
                {top.map((p) => (
                  <li key={p.id} className="truncate">
                    <span className="meta-mono">{(multipliers.get(p.id) ?? 0).toFixed(1)}x</span>{" "}
                    {p.url ? (
                      <a className="link" href={p.url} target="_blank" rel="noreferrer">
                        {firstLine(p.text) ?? p.publishedAt?.slice(0, 10) ?? "Post"}
                      </a>
                    ) : (
                      (firstLine(p.text) ?? "Post")
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tables.length ? (
            <div className="plan-tables">
              {tables.map((t) => (
                <table key={t.title} className="plan-table">
                  <thead>
                    <tr>
                      <th>{t.title}</th>
                      <th>Posts</th>
                      <th>Reach</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.rows.map((b) => (
                      <tr key={b.key}>
                        <td>{t.label ? t.label(b.key) : b.key}</td>
                        <td>
                          {b.n}
                          {b.n < SOLID_BUCKET && <span className="muted"> (weak signal)</span>}
                        </td>
                        <td>{b.medianMultiplier?.toFixed(2)}x</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}
            </div>
          ) : (
            <p className="small muted">
              Tables by format, pillar, opening line and weekday appear once three posts share a trait.
            </p>
          )}
          {account.audience.length > 0 && (
            <div className="stack-xs">
              <strong className="small">Who sees your posts</strong>
              <ul className="figures" style={{ marginTop: 0 }}>
                {account.audience.slice(0, 8).map((a) => (
                  <li key={`${a.kind}:${a.label}`}>
                    {a.label} <span className="muted">{Math.round(a.share * 100)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      <p className="small muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <Layers aria-hidden width={14} height={14} /> Medians throughout; anything under {SOLID_BUCKET} posts is marked as a weak signal.
      </p>
    </section>
  );
}

const FORMAT: Record<string, string> = { text: "Text", media: "Image or document", link: "Link", carousel: "Carousel" };

function change(now: number, before: number): string {
  const pct = Math.round(((now - before) / before) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}% on the 28 before`;
}

function firstLine(text: string | null): string | null {
  const line = text?.trim().split("\n")[0]?.trim();
  return line ? (line.length > 90 ? `${line.slice(0, 87).trimEnd()}...` : line) : null;
}

async function load() {
  const now = Date.now();
  try {
    const [pillars, recent, performance, account, upcoming] = await Promise.all([
      listPillars(),
      recentPosts(10),
      postPerformance(),
      accountSummary(now),
      upcomingPosts(),
    ]);
    const { suggestions, mix, skills } = await postThisNext({ now, pillars, recent, performance, upcoming });
    const others = [
      ...recent.filter((r) => r.at).map((r) => ({ at: Date.parse(r.at!), format: r.format })),
      ...upcoming.map((u) => ({ at: Date.parse(u.at), format: u.format })),
    ];
    return {
      now,
      pillars,
      performance,
      account,
      suggestions,
      mix,
      skills,
      upcoming: upcoming.map((u) => ({
        ...u,
        checks: cadenceChecks(
          Date.parse(u.at),
          others.filter((o) => o.at !== Date.parse(u.at)),
          u.format,
        ),
      })),
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
