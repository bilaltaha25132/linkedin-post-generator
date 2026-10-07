# Data we can get, and the rules we keep

Full report with policy quotes: [research/linkedin-api-and-rules.md](research/linkedin-api-and-rules.md).

## What LinkedIn's API gives an individual

| Need | Path | Works for Bilal? |
|---|---|---|
| Sign in, get his person ID | "Sign In with LinkedIn using OpenID Connect" (self-serve) | Yes. Returns name, photo, email, ID only. |
| Publish text, image, multi-image, PDF document ("carousel"), poll, video | "Share on LinkedIn" (`w_member_social`, self-serve), `POST /rest/posts` with a pinned `LinkedIn-Version` | Yes. 150 requests a day per member. |
| Schedule | The API has no schedule field. Our cron publishes an approved draft at its time. | Yes. |
| Stay connected | 60-day access token, no refresh token for self-serve apps | Re-authorise about every 60 days; banner at day 55. |
| Read his own post analytics or follower count | `r_member_postAnalytics` / `r_member_profileAnalytics` in the Community Management API | **Not today.** Only for registered organisations after review; the route via a small company is in [unlocks.md](unlocks.md#3-the-official-upgrade). |
| Read his own past posts and comments | `r_member_social` | **No.** Closed to new requests. |
| EU data-portability API | DMA API | **No.** EU/EEA/Switzerland profiles only. |
| His profile (headline, about, skills) | none self-serve | **No.** Use his data archive. |
| Feed, search, other people's posts | none | **No.** |

The app has to be associated with a LinkedIn Page he owns (a small "Signal
Desk" or personal-brand page is enough). Do not use "Linked" or "In" in the app
name.

## What Bilal can hand us, legally

These are his own data, exported by him, uploaded to his own private app.

1. **Creator analytics export (.xlsx)**: Analytics → Export, up to 365 days.
   Sheets: Discovery, Engagement (daily), Top posts (top 50 by engagement and by
   impressions, with URLs and dates), Followers (daily), Demographics (job
   titles, locations, industries, seniority, company size). Column labels are
   localised, so the parser reads sheets by position and checks headers.
2. **Per-post analytics export**: impressions, reach, reactions, comments,
   reposts, saves, sends, profile views and followers gained from that post.
3. **"Get a copy of your data" archive (.zip)**: Shares.csv (his posts),
   Comments.csv, Reactions.csv, Connections.csv, Invitations.csv, Profile,
   Positions, Skills, Education, Recommendations, Member Follows. No impressions.
4. **What he pastes or shares**: a post URL and the text he highlighted, a
   profile section, a job description.
5. **What our own API calls return**: the URN and permalink of every post we
   publish for him, so analytics rows join to our drafts exactly.
6. **LinkedIn's emails to him**: job alerts, application updates, comments and
   mentions on his posts, profile views, weekly search appearances, InMail
   previews, invitations. A Google Apps Script on his own Gmail posts them to
   the app every 10-15 minutes. Design: [unlocks.md](unlocks.md#1-the-email-bridge).

## Outside LinkedIn

Public, documented, free sources for jobs, leads and trends: company job-board
APIs (Ashby, Greenhouse, Lever, Workable), HN via Algolia, Himalayas, Jobicy,
RemoteOK, Remotive, We Work Remotely, Freelancer.com, Reddit (OAuth app),
Bluesky, and search APIs (Tavily, Exa, SerpApi/JSearch) that return LinkedIn
post URLs from their own indexes. Each has its own terms: attribution links,
polling caps, private use. They are recorded per source in
[jobs.md](jobs.md) and [leads.md](leads.md).

## Links he opens himself

The app builds LinkedIn search URLs (posts in the last 24 hours on a topic,
jobs posted today in Pakistan, UAE, UK or remote) and shows them as links.
Bilal clicks; LinkedIn's own search does the rest. Templates and parameters:
[unlocks.md](unlocks.md#2-deep-links).

## The rules (enforced in code review)

1. **No LinkedIn automation.** Never comment, react, connect, follow, message or
   endorse through code. The API scope that technically allows commenting is
   not used.
2. **Publishing needs a click.** Every post, including scheduled ones, is
   approved by Bilal in the app. The API terms prohibit using it "to automate
   posting"; a human approval per post is the line.
3. **No reading LinkedIn in bulk.** No crawling of profiles, feeds, search or
   job pages, no session cookies, no browser extension that reads LinkedIn's
   page. Search APIs may return LinkedIn URLs and snippets from their own index;
   we never follow those results with a fetch. LinkedIn's `robots.txt`
   disallows all crawlers, and its terms forbid copying content from search
   tools, so we keep only the link and the short snippet.
4. **One opt-in exception**: when Bilal shares a bare post URL with no text, the
   app may fetch LinkedIn's public embed (`/embed/feed/update/urn:li:activity:<id>`)
   once, for that post only, and only if he turned the option on. Off by default.
5. **Drafts are drafts.** Comment and connection-note drafts are shown for
   editing, never copied silently into LinkedIn. The UI nudges an edit before
   copy (see [engage.md](engage.md)).
6. **Volumes stay human.** Suggestion queues are capped at what a person would
   do: about 10 comments and 10 connection requests a day, 3-4 posts a week.
7. **Job and lead sources keep their terms**: attribution link on every card,
   polling caps per source, private app only, nothing republished.
8. **No real-person impersonation and no data selling.** Watchlists hold public
   profile links and Bilal's own notes, nothing scraped.
9. **Email links stay links.** The app never opens a LinkedIn link found in an
   email. It stores the canonical URL with tracking and login tokens stripped,
   and never ingests LinkedIn security mail.
10. **No grey-zone vendors in the app.** Cookie tools, extensions and scraping
   vendors are documented with their risks in [unlocks.md](unlocks.md#4-grey-zone-documented-not-built),
   and none is wired into the cron.

## A post URL carries its own timestamp

Every LinkedIn post URL holds an activity, share or ugcPost ID whose top bits
are the creation time: `createdAtMs = BigInt(id) >> 22n`. This gives a post's
age for free, without fetching anything. It drives "comment now" vs "too late",
and drops stale search results.

```ts
const m = url.match(/(?:activity[-:]|share:|ugcPost:)(\d{18,20})/);
const postedAt = m ? new Date(Number(BigInt(m[1]) >> 22n)) : null;
```
