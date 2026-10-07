# Strategist: what to post, when, and what's working

The Strategist tab answers "what should I post next?" from three things the
tool already knows or will know: what's happening in AI right now (the wire),
what his audience responds to (his analytics), and what employers ask for (the
Jobs tab). It also publishes and schedules, and writes the weekly report.

Research: [research/growth-strategy.md](research/growth-strategy.md). Numbers
below are the research's defaults; each becomes his own measured value once he
has enough posts.

## What the feed rewards in 2026 (the short version)

- LinkedIn's ranker is LLM-based: it reads post text, and the author's headline
  and industry, and matches them against what each reader engages with. **A
  consistent topic is how the ranker learns who to show him to.** Drift costs reach.
  Round 2 confirmed the detail: LinkedIn's own papers describe a 150B ranking
  model (360Brew) that reads the profile and the post as text together, and an
  LLM retriever whose biggest gains are for members with small networks. His
  profile is effectively part of every post's prompt.
- **Saves and sends are the target metrics.** They signal "worth keeping" and
  "worth passing on", and posts with a reusable table, checklist or framework
  earn them. Aim for saves above 1% and sends above 0.5% of impressions.
- Reach on LinkedIn is down about 60% over two years (van der Blom 2026, 1.3M
  posts). Comments are worth about 2x a like, saves about 2x a comment.
- Format reach vs a typical personal post (AuthoredUp, 3M posts): PDF carousel
  1.39x, poll 1.24x, image 1.20x, text 1.07x, video 0.86x, article 0.69x.
- 2-5 posts a week is the sweet spot; daily posting cuts reach per post ~26%.
- 1,300-2,500 characters performs best, which is his usual 180-320 words.
- Hashtags do nothing. External links cost roughly 0-27% (not the folk "60%").
- His slot: **Tue-Thu, 5:30-7:30 pm PKT** (5 pm UAE, 2 pm UK, 9 am US East):
  the only window that reaches all four markets while he's awake to reply.

Today the writer ends posts with 2-4 hashtags (`src/lib/voice/profile.ts`,
from ADR 0005). The new data says they add nothing to reach, and his own style
has none. Proposal: drop them, recorded as a new ADR when this ships. Bilal decides.

## Pillars

Three content pillars, editable in Settings, each with a target share:

- **P1 AI engineering in practice (40%)**: RAG, agents, evals, cost and latency,
  pgvector, failures and fixes.
- **P2 AI news with an engineer's take (35%)**: releases, papers, tooling, and
  what they change for people building.
- **P3 Build in public and career (25%)**: Signal Desk and client work
  (anonymised), numbers, working remotely from Karachi for global teams.

Every post, draft and wire item is assigned a pillar by embedding similarity to
pillar descriptions (and later to clusters of his own posts).

## "Post this next"

A ranked list of 3-5 suggestions, refreshed every pass. Each suggestion says
what, why, in which format and when:

> **Draft a carousel on Mistral Large 4's cyber benchmark** (P2)
> Fresh (6h), scored 88 on the wire, the top skill in your job matches this
> month is security for agents, and your carousels reach 1.6x your text posts.
> Suggested slot: Wed 6:00 pm PKT. [Draft it]

Ranking = wire score × freshness × pillar fit × format fit × balance boost,
using these rules (from research section 9):

1. **Trend fit**: wire items close to a pillar; news loses priority after 48h
   unless the angle is a deep dive.
2. **Pillar balance**: a pillar with zero posts in the last 6 gets a boost.
3. **Drift alarm**: if fewer than 8 of the last 10 posts are on-pillar, only
   on-pillar suggestions show, with a warning.
4. **Winner follow-up**: a post at 1.5x his median reach (or top-20% follower
   conversion) earns a follow-up within 7 days: part 2, deep dive, or carousel version.
5. **Repurpose**: a strong text post becomes a carousel 3-6 weeks later.
6. **Series**: 3+ similar posts that beat the median get a "make this a
   recurring series" suggestion.
7. **Build-in-public quota**: at least 1 in 4 posts shows his own work.
8. **Skill demand**: skills rising in his Jobs matches (e.g. evals, MCP, agent
   security) boost wire items about them. Posting about what employers ask for
   is how recruiters find him.
9. **Comment to post**: a comment of his that drew replies is suggested as a
   post seed (see [engage.md](engage.md#comments-become-posts)).
10. **Release day**: when the wire sees a major model or paper release (2+ trend
   feeds within hours, see [engage.md](engage.md#3-todays-topics)), the top
   suggestion is a carousel skeleton ready to fill: the release's own figures,
   the benchmark table, and "what it means for people building RAG and agents".
   Being early on releases is how the AI-engineering creators he admires grew.
11. **Series manager**: named series are tracked; one that hasn't run in its
   usual gap gets a pre-filled next edition from the wire.
12. **Gulf/UK lens**: for business-facing topics, an optional angle for Gulf
   and UK decision-makers (cost, data residency, Arabic support), since those
   are the markets he wants work from.
13. **Newsletter readiness**: LinkedIn invites his whole network once, at
   launch, so the suggestion appears only when posting has been steady for 8-12
   weeks and three strong editions are drafted. Until then it stays a meter.

## Pre-flight checks on every draft

Shown on the draft page as quiet warnings, never auto-fixes:

- Length outside 1,100-2,200 characters (carousel captions 600-1,000).
- Hook: first line over ~120 characters, or no concrete noun, number or claim.
- Any hashtag; any external link that isn't the subject of the post.
- Engagement bait ("comment YES", "agree?", "repost if").
- Same format three times in a row; posting twice within 24h; more than 4 a week.
- Tags: only people or companies directly involved, at most 3.
- Teaching posts end with a saveable takeaway; carousels end with a summary slide.
- **Save-worthiness**: no reusable artifact (table, checklist, steps, numbers
  he measured) in a teaching post.
- **Profile fit**: the draft's embedding is far from his profile's (headline,
  About, experience). Either it's off-lane, or the profile needs a line about
  the new lane. Same pgvector setup the wire already uses.
- **Slop phrases**: phrasing common in generic LLM output, checked against his
  voice profile. LinkedIn now has a report button for AI slop, and reported
  posts reportedly lose reach.
- **Polls**: a poll draft gets a note that poll reach looks good in vendor
  tables but engagement is thin and recruiters rarely remember them.

## The learning loop

### Input

- **Weekly**: the creator analytics .xlsx export (upload on the Strategist tab;
  a Monday nudge in the weekly email). Parsed with SheetJS in the browser, rows
  sent to the server.
- **Per post (optional)**: the single-post export, for saves, sends, profile
  views and followers gained.
- **Once, then monthly**: the data archive .zip, which backfills every post he
  has ever written (Shares.csv) so the loop starts with history, not from zero.
- **Our own**: URNs of posts published through the app, which join exactly.

Posts are matched to our drafts by URN, then by URL, then by date plus text similarity.

### Metrics

- **Reach multiplier** = impressions / his trailing-90-day median (cancels out
  account growth).
- **Follower conversion** = followers gained per 1,000 reached. **The headline metric.**
- **Profile-view rate** = profile views / reached: the recruiter-and-client signal.
- **Weighted engagement** = (reactions + 2·comments + 2·saves + 2·sends + 1.5·reposts) / impressions.
- **Audience quality** = share of viewers who are AI/ML/software people, eng
  leaders, founders or recruiters, and share from UAE/UK/US (Demographics sheet).

### Insights (recomputed weekly)

- Topic clusters of his posts (pgvector + k-means, LLM-labelled), each with n,
  median reach multiplier and follower conversion.
- Hook types (question, number, contrarian claim, story, news lead, "I built")
  vs reach.
- Format × pillar table.
- Weekday and hour buckets (needs 3+ posts per bucket; until then the default slot).
- Audience-quality alert when target-audience share drops 20% vs the prior 90 days.

**Small numbers, honest labels.** At ~12 posts a month, everything is medians,
buckets under 5 posts are hidden, and every insight shows its n ("weak signal:
4 posts").

## Publishing and scheduling

- **Connect LinkedIn** (Settings): OAuth with the two self-serve products. The
  token is stored server-side; a banner appears at day 55 to reconnect.
- On any draft: **Publish now** or **Schedule** (slot picker defaults to the
  next Tue-Thu 6 pm PKT; DST in UK/US handled from stored transition dates).
  Text, a single image, or the carousel PDF as a document post (the Documents
  API takes the PDF we already render; the title is the deck title).
- Each scheduled post is an approved row; a 10-minute GitHub Actions cron
  publishes rows that are due and approved, stores the URN and permalink, and
  marks the post Posted.
- "Am I free for an hour after?" checkbox on scheduling, and a **reply timer**
  when the post goes out: nudges at 10, 30 and 60 minutes. Comment notices from
  the email bridge show up next to the timer with a drafted reply, aiming for
  real back-and-forth threads. The app logs his median reply time.
- **Automatic per-post numbers** would need the Community Management API (see
  [unlocks.md](unlocks.md#3-the-official-upgrade)). Without it, the weekly XLSX
  upload fills the same tables.
- Posting by hand still works exactly as today (copy for LinkedIn, mark posted,
  paste the URL).

## Weekly report

Monday 9am PKT email (and a Strategist "This week" page), five short sections:

1. **Last week**: posts, reach multiplier, follower conversion, best post and
   why it worked (in one sentence).
2. **This week's plan**: 3 slots with a suggested post for each.
3. **People**: who to reply to, who engaged twice (connect?), rounds due.
4. **Jobs and leads**: top 3 of each, with status nudges ("you saved this 6 days ago").
5. **One experiment**: e.g. "turn last week's best text post into a carousel",
   or "post at 9 am PKT once to test Gulf mornings".
6. **Top Voice progress** (monthly): the badge is editorial, so the report
   tracks what the editors look at: his posting streak, share of on-lane
   posts, share with his own build or data, comments given, and local
   presence (Pakistan events, communities, mentions).

## Done when

- The analytics upload parses a real export from Bilal's account and shows the
  tables above with his numbers.
- "Post this next" shows suggestions he'd actually write, judged over 2 weeks.
- A scheduled carousel goes out on time through the API with one approval click.
