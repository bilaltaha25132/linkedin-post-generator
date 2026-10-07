# Engage tab

Where Bilal's comments would land with impact today, and a drafted comment for
any post he opens. Comments are the cheapest growth lever on LinkedIn: on-topic,
substantive comments put his name in front of the exact audience he wants, and
LinkedIn now shows impressions on comments too.

Research: [research/engage-and-discovery.md](research/engage-and-discovery.md),
[research/growth-strategy.md](research/growth-strategy.md#6-networking).

## The honest constraint

The posts that matter for comments are 0-6 hours old. **No compliant API can
find them**: LinkedIn exposes no feed or search API, and search engines index
posts days to months late. Every tool that claimed otherwise rode the user's
LinkedIn session through an extension, and those tools are the ones LinkedIn
shut down. So the Engage tab works from three inputs, in order of value:

1. **What Bilal shares in** while scrolling LinkedIn (seconds of effort).
2. **The rounds list**: the people worth being visible to, one tap from their
   latest posts, ordered by who's due.
3. **Today's topics** from the wire, so he knows which conversations to look for.

Plus a lagging fourth: search-API hits for watchlist people posting about
today's topics (a few days old, good for "reply in the thread", not for first-hour).

Round 2 found two more feeds that need no LinkedIn access from us: LinkedIn's
own **bell notifications** (he turns on "all posts" for his tier A and B
people, and the email bridge in [unlocks.md](unlocks.md#1-the-email-bridge)
turns those emails into inbox items), and **deep links** into LinkedIn's post
search for the last 24 hours, which he opens himself.

## 1. Share in, get a draft

Three ways in, all user-initiated, none touching LinkedIn's page:

| Way | How | Platform |
|---|---|---|
| **Share sheet** | The app becomes an installable PWA with a `share_target` (`/share?url&text&title`). In the LinkedIn app: Share → Send via… → Signal Desk. | Android, desktop Chrome |
| **iOS Shortcut** | Safari has no Web Share Target. A one-action Shortcut in the share sheet opens `/share?url=…`. Setup steps go in [setup.md](../setup.md) when built. | iPhone |
| **Bookmarklet** | Highlight the post text, click "Comment with Signal Desk". It opens `/share?url=<page>&text=<selection>`. No installed software, no page reading. | Desktop |
| **Paste box** | URL and/or text into the Engage tab. | Anywhere |

When a post arrives:

1. **Decode its age** from the URL (no fetch). Show it: "posted 47 min ago".
2. **Get the text**: the highlighted or pasted text. If only a bare URL came in
   and Bilal enabled the option, fetch LinkedIn's public embed for that one post
   (see rule 4 in [data-and-rules.md](data-and-rules.md#the-rules-enforced-in-code-review));
   otherwise ask him to paste the text.
3. **Ground it**: embed the post and look for a match in the wire (the paper,
   release or story it's about) and in his voice corpus (a project of his that
   touches the same problem). This is what makes our drafts better than every
   comment assistant on the market: they can only rephrase the post; ours can
   bring the paper's actual number or his own production experience.
4. **Draft 3 comments** in different shapes (below), each scored on the rubric.
5. **Show the timing advice**: under 2h "comment now", 2-6h "still good",
   6-24h "reply inside a thread instead", older "skip unless you know the author".

### Comment shapes

- **Field note**: adds one data point from his own work. "We hit the same wall
  with hybrid search. BM25 plus vectors with rank fusion beat every prompt
  change we tried on support tickets. Did the gain hold past a few hundred
  thousand chunks?"
- **Counterpoint**: agrees, then gives the edge case where it broke.
- **Practitioner question**: one sharp question the author can actually answer.
- (When the wire matched) **From the source**: the number or finding from the
  paper or release that the post skipped.

### Rubric (each line 0-2; a draft needs 9/12 to be shown)

1. **Anchored**: points at one specific claim or line in the post.
2. **Adds something**: a first-hand detail, number, failure or tool detail, or a
   fact from the matched source. Never restates the post.
3. **One idea, 2-4 sentences, 25-70 words.** Under 15 words fails.
4. **Friction allowed**: a caveat or edge case, said respectfully.
5. **Ends with a question or a takeaway**, not both.
6. **Sounds like Bilal**: plain English, no em dashes, no "Great post!", no
   "As an AI engineer", no hashtags, emojis, links or pitch.

Hard fails: generic praise, self-promotion, a claim he can't back, more than one
question, anything that reads templated. The existing AI-tell checks
(`src/lib/voice/tells.ts`) run on comments too.

### Draft, then his words

Drafts open in an editor, not a clipboard. The Copy button reads "Copy (edit
first?)" until he has changed at least a few words, then "Copy". This is a
nudge, not a lock. LinkedIn's 2026 guidance is that AI help is fine as long as
the comment represents his voice; an edited draft does, a pasted one may not.

## 2. Rounds

A watchlist of about 40-60 people and company pages, each with a tier:

- **A**: big reach and on his beat (e.g. Andrew Ng, Harrison Chase, Jerry Liu).
- **B**: on-beat practitioners and founders (the best comment return: smaller
  threads, technical readers who become peers and clients).
- **C**: reach but off-beat; comment rarely.
- **Targets**: hiring managers and founders from the Jobs and Leads tabs.
- **Warm**: people who engaged with his posts (from his data archive).

A seed list of 48 names (founders, researchers, practitioners, recruiters) is in
[research/engage-and-discovery.md](research/engage-and-discovery.md#23-watchlist-seed-48-entries).
About 15 URLs there came from memory and must be checked before seeding; the
app stores a profile URL only after Bilal confirms it opens the right person.

The Rounds view lists who's due ("not visited in 5 days", tier A first), each
with one button that opens `linkedin.com/in/<slug>/recent-activity/all/` in his
own browser, plus his notes and the last comment he logged for them. He shares
any post that's worth it straight back in. Signal Desk tracks only "visited"
and his notes. Nothing is fetched from LinkedIn.

The "Bell" column shows whether he turned on all-post notifications for that
person (he ticks it; the app can't check). Tier A and B with the bell on means
fresh posts arrive by email without him visiting.

**Pod guard.** If most of his logged comments in a fortnight go to the same
handful of people who also comment on all of his posts, the tab says so.
LinkedIn detects engagement pods and cuts their reach, and recovery reportedly
takes 60-90 days.

Daily target shown on the tab: **5-10 on-topic comments, 20-30 minutes**, with
3-5 of them in the 15 minutes before his own post goes out (warms the ranker on
his topics) and replies to every comment on his own post in the hour after.

## 3. Today's topics

A strip at the top of Engage: the 3-5 topics hottest in the last 24h, each with
"people likely posting about this" (watchlist members whose topics match) and
two LinkedIn search links he opens himself. Knowing what to look for turns a
30-minute scroll into 10.

**Where topics come from.** The wire's top items, plus a trend radar on the
hourly cron reading free, keyless feeds (all tested 2026-10-07):

| Feed | Endpoint |
|---|---|
| HN (Algolia) | `hn.algolia.com/api/v1/search_by_date?query=AI&tags=story&numericFilters=points>50` |
| Techmeme | `techmeme.com/feed.xml` |
| TLDR AI | `tldr.tech/api/rss/ai` |
| The Rundown AI | `rss.beehiiv.com/feeds/2R3C6Bt5wj.xml` |
| Ben's Bites | `bensbites.com/feed` |
| HF trending models, daily papers | `huggingface.co/api/models?sort=trendingScore`, `huggingface.co/api/daily_papers` |

The LLM names the entities ("Mistral Large 4"), and a topic scores by how many
feeds carry it within 24 hours times recency. LinkedIn's AI conversation lags
HN and Techmeme by about 12-48 hours and leans to big-lab launches, AI and
careers, and enterprise adoption, so newsletters and Techmeme weigh more than
HF and GitHub. Two or more feeds in a day is the "comment on it, post about it"
signal.

**The two links per topic** (templates in [unlocks.md](unlocks.md#2-deep-links)):

- *Latest*: `search/results/content/?keywords={topic}&datePosted="past-24h"&sortBy="date_posted"`, for first-hour comments.
- *Top*: the same with `sortBy="relevance"`, for posts already drawing a crowd.

## 4. Lagging discovery via search

Once a day, for each top topic, one Tavily query:
`include_domains: ["linkedin.com"]`, `time_range: "week"`, query = topic + a
watchlist name or "AI engineer". Hits under 7 days old (URL timestamp) appear
under "Threads still alive" with the advice "reply inside the top thread".
Budget: about 5 queries a day, shared with the Leads budget.

## Reply helper for his own posts

After a post goes live, the post card gets "Replies": he pastes a comment
someone left, gets a reply draft that continues the thread (the ranker rewards
threaded discussion). Fifteen minutes and an hour after a scheduled post goes
out, a reminder email says "reply to your comments now".

## Comments become posts

Every comment he logs is kept (with its post's URL). The Strategist looks for
comments that drew replies and suggests turning them into a full post: a good
comment is a tested hook.

## Done when

- Sharing from the LinkedIn Android app lands a post in Engage with its age
  and three drafts in under 15 seconds.
- Bookmarklet works in Chrome and Edge on LinkedIn desktop.
- In a 2-week trial Bilal posts at least half of his comments from drafts after
  editing, and rates fewer than 1 in 5 drafts "useless".
