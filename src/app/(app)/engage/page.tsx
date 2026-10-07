import { headers } from "next/headers";
import { Flame, MessagesSquare, TriangleAlert } from "lucide-react";

import { CapturedPostCard } from "@/components/captured-post-card";
import { DeepLinks, type DeepLink } from "@/components/deep-links";
import { EngageReplies } from "@/components/engage-replies";
import { EngageRounds } from "@/components/engage-rounds";
import { EngageShareBox } from "@/components/engage-share-box";
import { EmptyState, PageHeader } from "@/components/page-header";
import { SetupNotice } from "@/components/setup-notice";
import {
  commentStats,
  listCapturedPosts,
  listOpenEvents,
  listWatchPeople,
  todaysTopics,
  type CommentStats,
} from "@/lib/engage/queries";
import type { CapturedPost, EngagementEvent, Topic, WatchPerson } from "@/lib/engage/types";
import { postSearchUrl } from "@/lib/links/deep";
import { linkOpens } from "@/lib/links/queries";
import { supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
// Drafting runs the writer and the rubric back to back.
export const maxDuration = 90;

const DAILY_TARGET = { low: 5, high: 10 };

export default async function EngagePage() {
  if (!supabaseConfigured()) {
    return (
      <>
        <PageHeader title="Engage" eyebrow="Grow" />
        <SetupNotice />
      </>
    );
  }

  const data = await load();
  const origin = await appOrigin();

  return (
    <>
      <PageHeader title="Engage" eyebrow="Grow">
        Comments that add something, on the posts worth being seen on. Signal Desk drafts; you edit and post them
        yourself on LinkedIn.
      </PageHeader>

      {"error" in data ? (
        <p className="notice notice-danger" role="alert">
          <TriangleAlert aria-hidden />
          <span>
            Couldn&rsquo;t load Engage ({data.error}). If the tables are missing, run{" "}
            <code>node --env-file=.env.local scripts/migrate.mjs</code>.
          </span>
        </p>
      ) : (
        <div className="stack">
          <p className="small" role="status">
            <strong>
              {data.stats.today} of {DAILY_TARGET.low}-{DAILY_TARGET.high}
            </strong>{" "}
            comments today. Twenty minutes a day does it; a few just before your own post goes out warm it up.
          </p>
          {data.stats.podWarning && (
            <p className="notice notice-danger" role="alert">
              <TriangleAlert aria-hidden />
              <span>{data.stats.podWarning}</span>
            </p>
          )}

          {data.topics.length > 0 && <TopicsStrip topics={data.topics} links={data.topicLinks} now={data.now} />}

          <EngageShareBox />

          {data.posts.length ? (
            <section className="stack-sm" aria-label="Posts to comment on">
              {data.posts.map((p) => (
                <CapturedPostCard key={p.id} post={p} now={data.now} />
              ))}
            </section>
          ) : (
            <EmptyState icon={MessagesSquare} title="No posts yet">
              Share a post from LinkedIn, use the bookmarklet, or paste one above. New posts from people whose bell
              you ring arrive here through the email bridge.
            </EmptyState>
          )}

          <EngageReplies events={data.events} now={data.now} />
          <EngageRounds people={data.people} now={data.now} />
          <ShareSetup origin={origin} />
        </div>
      )}
    </>
  );
}

async function load(): Promise<
  | {
      posts: CapturedPost[];
      events: EngagementEvent[];
      people: WatchPerson[];
      topics: Topic[];
      topicLinks: Record<string, DeepLink[]>;
      stats: CommentStats;
      now: number;
    }
  | { error: string }
> {
  const now = Date.now();
  try {
    const [posts, events, people, stats] = await Promise.all([
      listCapturedPosts(),
      listOpenEvents(),
      listWatchPeople(),
      commentStats(),
    ]);
    const topics = await todaysTopics(people);
    const topicLinks = await linksFor(topics);
    return { posts, events, people, topics, topicLinks, stats, now };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

/** Two LinkedIn searches per topic, latest for first-hour comments and top for busy threads. */
async function linksFor(topics: Topic[]): Promise<Record<string, DeepLink[]>> {
  const built = topics.map((t) => {
    const q = searchTerms(t.title);
    return [
      t.id,
      [
        { key: `topic:${q}:latest`, label: "Latest", href: postSearchUrl(q, { date: "past-24h", sort: "date_posted" }) },
        { key: `topic:${q}:top`, label: "Top", href: postSearchUrl(q, { date: "past-week", sort: "relevance" }) },
      ],
    ] as const;
  });
  const opens = await linkOpens(built.flatMap(([, links]) => links.map((l) => l.key)));
  return Object.fromEntries(
    built.map(([id, links]) => [id, links.map((l) => ({ ...l, openedAt: opens[l.key] ?? null }))]),
  );
}

/** A headline cut to the words LinkedIn search matches on. */
function searchTerms(title: string): string {
  return title
    .replace(/[^\p{L}\p{N}\s.+-]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !/^(the|and|for|with|from|that|this|what|how|why|its|are|new|now)$/i.test(w))
    .slice(0, 5)
    .join(" ");
}

function TopicsStrip({ topics, links, now }: { topics: Topic[]; links: Record<string, DeepLink[]>; now: number }) {
  return (
    <section className="panel stack-sm reveal" aria-labelledby="topics-title">
      <div className="panel-head" style={{ marginBottom: 0 }}>
        <span className="panel-icon">
          <Flame aria-hidden />
        </span>
        <h2 id="topics-title">Today&rsquo;s topics</h2>
        <p>What your wire rates highest in the last day and a half. People will be posting about these.</p>
      </div>
      <ul className="list-plain stack-sm">
        {topics.map((t) => (
          <li key={t.id} className="stack-xs">
            <a className="link small" href={t.url} target="_blank" rel="noreferrer">
              <strong>{t.title}</strong>
            </a>
            {t.people.length > 0 && <p className="muted small">Likely posting: {t.people.join(", ")}</p>}
            <DeepLinks links={links[t.id] ?? []} now={now} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ShareSetup({ origin }: { origin: string }) {
  // Opens /share with the page and any highlighted text; it never reads the page itself.
  const bookmarklet = `javascript:(()=>{const t=String(getSelection()).slice(0,6000);open('${origin}/share?via=bookmarklet&url='+encodeURIComponent(location.href)+'&text='+encodeURIComponent(t),'_blank')})()`;
  return (
    <details className="panel reveal">
      <summary>Send posts here from LinkedIn</summary>
      <div className="stack-sm small" style={{ marginTop: 12 }}>
        <p>
          <strong>Android or desktop Chrome:</strong> install Signal Desk (browser menu → Install app). Then in the
          LinkedIn app, Share → Send via… → Signal Desk.
        </p>
        <p>
          <strong>Desktop:</strong> drag this to your bookmarks bar, highlight a post&rsquo;s text on LinkedIn and
          click it:{" "}
          <a className="btn btn-sm" href={bookmarklet}>
            Comment with Signal Desk
          </a>
        </p>
        <p>
          <strong>iPhone:</strong> make a Shortcut that takes a URL from the share sheet and opens{" "}
          <code>{origin}/share?url=</code> followed by it.
        </p>
      </div>
    </details>
  );
}

async function appOrigin(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
