# Unlocks: every route into more LinkedIn data, ranked

Round 2 of the research (2026-10-07) asked one question: what else can Signal
Desk get from LinkedIn, by any route, and what does each route cost in money,
effort and risk to Bilal's account? This page is the answer in one place. The
plan docs pick up the routes marked **Build**.

Reports behind it:
[own-data-channels](research/own-data-channels.md) ·
[official-programs](research/official-programs.md) ·
[grey-zone](research/grey-zone.md) ·
[fresh-discovery](research/fresh-discovery.md) ·
[advanced-growth](research/advanced-growth.md).

## The ranking

| # | Route | What it adds | Cost | Account risk | Verdict |
|---|---|---|---|---|---|
| 1 | **LinkedIn emails → Gmail → Apps Script → our API** | Job alerts with job IDs, application updates, comments, reactions and mentions on his posts, profile views, weekly "appeared in N searches", InMail previews, invitations | $0, about 2 hours to set up | None | **Build first** ([below](#1-the-email-bridge)) |
| 2 | **Deep links he opens himself** | LinkedIn's own post search (past 24h, latest or top) and job search per country, built by the app for today's topics | $0 | None | **Build** ([below](#2-deep-links)) |
| 3 | **Trend radar** | Today's AI topics from HN, Techmeme, TLDR AI, The Rundown, Ben's Bites, HF trending, feeding the deep links and "Post this next" | $0 | None | **Build** ([engage.md](engage.md#3-todays-topics)) |
| 4 | **Creator analytics XLSX, weekly** | Daily impressions, engagements, reach, top 50 posts, followers, demographics | $0, 2 minutes a week | None | **Build** (already planned in [strategist.md](strategist.md#the-learning-loop)) |
| 5 | **Data archive ZIP, monthly** | His posts, comments, reactions, connections, saved jobs, job applications, job alert setup, search queries, profile | $0, 5 minutes a month | None | **Build** (already planned) |
| 6 | **Notification settings tuned for email** | Turns routes 1's volume up: comments, mentions, profile views, job alerts and messages set to "Individual" email | $0, 10 minutes once | None | **Do** (a checklist on the Settings page) |
| 7 | **Bell on 20-40 creators** | LinkedIn's own push and email when they post, which route 1 then catches | $0 | None | **Do** (the Rounds list says who) |
| 8 | **Community Management API** (Development tier) | Per-post impressions, reach, saves, sends, follows, profile views, and follower count, pulled automatically | ~Rs 1,550 SECP fee plus a domain, website and paperwork; 1-4 weeks review | None | **Optional**, his decision ([below](#3-the-official-upgrade)) |
| 9 | Buffer free plan as the publisher | Daily metrics for posts published through Buffer | $0 | None | Skip unless route 8 is refused and he still wants automatic metrics |
| 10 | Search APIs on `linkedin.com/posts` (Firecrawl `tbs=qdr:d`, Tavily `time_range:day`) | A few fresh posts, mostly days old, filtered by the ID timestamp | Free tiers | None (their index, link and snippet only) | Keep as the lagging lane already planned |
| 11 | No-cookie scraping vendors (Apify actors and similar) | Posts and comments by named public people | $0-5 a month | None directly | **Grey.** Documented, not built ([below](#4-grey-zone-documented-not-built)) |
| 12 | AI browser agent in his own session, supervised | Feed summaries while he watches | Free-ish | Low-medium | His own call, ad hoc only, never scheduled. Not part of the app |
| 13 | Extensions, cookie tools, linked-account APIs (Unipile, PhantomBuster, Lix, Evaboot) | Feed, engagers, analytics | $49+ a month | **Medium-high** | **No** |
| 14 | Headless automation with his cookie, fake accounts | Everything | n/a | **High**, and the pattern behind every LinkedIn lawsuit | **No, never** |

Not available at any price: `r_member_social` (closed), the EU data-portability
API (EEA and Swiss members only), any official LinkedIn MCP or creator API
(none exist in 2026), saved-search alerts for posts (jobs only).

## 1. The email bridge

LinkedIn already emails Bilal most of what we want. Gmail plus a tiny Google
Apps Script turns that into a feed, with no LinkedIn login, no scraping and no
third party.

```
LinkedIn ──email──> Gmail (filter adds label li/inbox)
                     │ Apps Script on his own account, every 10-15 min,
                     │ HMAC-signed POST, then adds label li/sent
                     ▼
         /api/public/ingest/email ──> inbound_emails (raw, unique on gmail_id)
                     │ classify by sender + subject; DeepSeek JSON fallback
                     ▼
   job_alerts · engagement_events · weekly_stats · recruiter_messages · invitations
```

- **Why Apps Script, not the Gmail API**: it runs as him inside Google, needs no
  GCP project, and has no 7-day token expiry (a Gmail API app left in "Testing"
  loses its refresh token weekly). Quotas are hundreds of times what LinkedIn
  sends. He sees a one-time "unverified app" screen, which is normal for a
  script only its owner uses.
- **Gmail filter**: `from:(linkedin.com) -from:security-noreply@linkedin.com`.
  Security mail (sign-in codes, password resets) never leaves his inbox.
- **What it parses** (senders verified against real redacted emails in public repos):

  | Sender | Becomes |
  |---|---|
  | `jobalerts-noreply@` | Job cards: title, company, location, insight line ("4 connections", salary), LinkedIn job ID, the alert's search term |
  | `jobs-noreply@` | Application status: viewed, rejected, weekly updates → the Applied tracker |
  | `jobs-listings@` | Recommended jobs, same card shape |
  | `notifications-noreply@` | Comments, reactions, mentions on his posts; weekly search appearances and "found by people at"; follower notices |
  | `inmail-hit-reply@`, `hit-reply@`, `inmails-noreply@`, `messaging-digest-noreply@` | InMail and message previews → recruiter messages |
  | `invitations@` | Connection requests and accepts → the Network tab |
  | `messages-noreply@` | LinkedIn's own "add" and "follow" suggestions → Network candidates |
  | `newsletters-noreply@` | Issue titles of newsletters he follows → a topic signal |

- **Rules**:
  - The app never opens or fetches a LinkedIn link from an email. It stores the
    canonical link (`https://www.linkedin.com/jobs/view/{id}/`) with tracking
    parameters (`trackingId`, `otpToken`, `midToken`, `trk`, `lipi`) stripped,
    since some of them are per-recipient login tokens.
  - Raw emails are kept so parsers can be re-run when LinkedIn changes a
    template. Parsers anchor on stable things (the `/jobs/view/{id}` link), have
    fixture tests, and raise an alert when a known sender parses to zero items.
  - The shared secret lives in Script Properties and `.env.local`, never in the repo.
- **Effort**: one Apps Script file (shipped in the repo as a copy-paste snippet
  with setup steps), one route handler, a few parsers. About a day of work.

## 2. Deep links

LinkedIn's own search is the freshest index of LinkedIn posts there is, and a
link that Bilal clicks is just Bilal browsing. The app's job is to know **what
to search for today** and build the exact URL.

Post search (needs him logged in; facets beyond `keywords` are reported, not
guaranteed, so every link also has a plain-keywords fallback):

```
https://www.linkedin.com/search/results/content/?keywords={q}
  &datePosted=%22past-24h%22        past-24h | past-week | past-month
  &sortBy=%22date_posted%22         date_posted (latest) | relevance (top)
  &authorJobTitle=%22founder%22     optional
  &contentType=%22jobs%22           optional: posts tagged as jobs
  &origin=FACETED_SEARCH
```

Job search (verified live on 2026-10-07: 21 Pakistan "AI Engineer" jobs posted
in the previous 1-20 hours):

```
https://www.linkedin.com/jobs/search/?keywords={q}&geoId={geo}&f_TPR=r86400&sortBy=DD
  geoId   Pakistan 101022442 · UAE 104305776 · UK 101165590 · Worldwide 92000000
  f_TPR   r3600 hour · r86400 day · r604800 week
  f_WT    2 remote     f_JT  C contract, F full-time     f_E  3,4 associate and mid-senior
```

Where they appear: Engage (two links per trending topic: latest and top),
Leads (hiring, client and founder searches), Jobs (one row of country links
above the Matches list). Each link records when he last opened it.

## 3. The official upgrade

The only official route to his own post analytics is the Community Management
API, and it is for registered organisations doing commercial work. The ladder:

1. **Now, free**: keep the self-serve "Share on LinkedIn" app for publishing;
   import the XLSX export weekly.
2. **Register a company**: a Pakistani SMC-Pvt Ltd through SECP is the cheapest
   that probably qualifies (about Rs 1,550 in government fees online by SECP's 2018 schedule, to re-check, plus a
   domain, a business email on it, a website with a privacy policy). A UK Ltd is
   £100 plus a registered-office service.
3. **Create a LinkedIn Page** for the company (free, needed to verify any app).
4. **Apply for CMA Development tier on a new, separate app.** CMA can't be added
   to an app that has other products. The use case must be honest and commercial
   ("profile management for our consultancy"). Review takes days to weeks;
   rejections mean a new app and a new application.
5. **What it gives**: 500 calls a day (100 per member), per-post impressions,
   reach, reactions, comments, reposts, **saves, sends**, link clicks, followers
   gained, profile views from content, and follower count. Our publish flow
   already keeps each post's URN, which is all the analytics endpoint needs.
6. **The catch**: without an upgrade to Standard tier (a screencast review that
   LinkedIn may refuse), access is removed after 12 months. The XLSX import stays
   as the fallback, so losing CMA costs nothing but freshness.

Even with CMA: no listing his own posts, no reading comments on personal posts,
no feed. Worth it only if automatic per-post metrics matter to him more than
Rs 10-20k a year and the paperwork. A company also helps with client invoicing,
which may be the better reason.

## 4. Grey zone: documented, not built

What LinkedIn has actually sued over is the industrial model: fake accounts
plus resale of logged-in data (hiQ, Proxycurl, ProAPIs). No reported case
involves an individual reading his own feed. For Bilal the real risk is
**account restriction**, and his account is the asset this whole app exists to
grow. LinkedIn's User Agreement bans "browser plugins and add-ons" that scrape
or automate, it was reported in 2026 to check for 6,000+ known extensions, and
its `robots.txt` disallows every crawler, including the AI user agents by name.

- **Cookie tools, extensions, linked-account APIs**: not recommended. They put
  his own account behind the automation.
- **No-cookie vendors** (Apify actors and similar): the vendor carries the
  scraping risk, he carries vendor-vanishing risk and data-protection duties
  for other people's data. Acceptable only for small, occasional pulls of named
  public figures' posts, with no stored commenter or reactor identities. It still
  conflicts with LinkedIn's terms, so it stays **his decision and out of the app**.
- **Bot-fetching logged-out LinkedIn pages ourselves**: avoid. Poor, stale data
  for the policy cost. The one exception stays the opt-in single-post embed.

Full matrix with legal notes and sources: [research/grey-zone.md](research/grey-zone.md#6-risk-matrix).

## 5. New ideas from round 2

From [research/advanced-growth.md](research/advanced-growth.md#6-feature-ideas-no-existing-tool-offers),
the ones that fit this app and are folded into the plan:

| Idea | Why it works now | Lands in |
|---|---|---|
| Profile-post alignment score | The 2026 feed ranker is an LLM that reads his profile and the post together | [strategist.md](strategist.md#pre-flight-checks-on-every-draft) |
| Save-worthiness check | Saves and sends are the strongest signals; a reusable table or checklist earns them | [strategist.md](strategist.md#pre-flight-checks-on-every-draft) |
| Recruiter-query coverage test | Recruiters now search in plain language ("remote LangGraph engineer Pakistan") | [profile-and-network.md](profile-and-network.md#profile-review) |
| 60-minute reply timer | Replies in the first hour keep a post in circulation | [strategist.md](strategist.md#publishing-and-scheduling) |
| Release-day kit | When the wire sees a major release, a carousel skeleton is ready within the hour | [strategist.md](strategist.md#post-this-next) |
| Series manager | Named recurring formats build a following; flag a lapsed series | [strategist.md](strategist.md#post-this-next) |
| Gulf/UK lens | A business framing (cost, data residency, Arabic) for Gulf and UK readers | [strategist.md](strategist.md#post-this-next) |
| Newsletter readiness | LinkedIn invites the whole network once, at launch | [strategist.md](strategist.md#post-this-next) |
| Top Voice tracker | The badge is editorial: consistency, focus, originality, community, local prominence | [strategist.md](strategist.md#weekly-report) |
| Pod guard | Same-small-group engagement patterns are detected and cut reach | [engage.md](engage.md#2-rounds) |

## What stayed unverified

The search cap (200 per session) ran out during round 2, so the agents switched
to direct fetches of primary sources. Marked [U] in the reports and still open:

- Exact subjects of LinkedIn's post-performance emails (the parser will learn them from his inbox).
- Whether a sole proprietorship would pass the CMA review.
- Premium pricing in Pakistan.
- Pakistan-specific creator examples and engagement numbers.
- Whether the content-search facets beyond `keywords` still filter (the URLs are accepted; results weren't visible logged out).
- LinkedIn's stance on AI browser agents run by a member.
