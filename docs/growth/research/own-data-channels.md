# A. Legitimate channels for Bilal's own LinkedIn data (round 2, deep pass)

Date: 2026-10-07. Scope: every legitimate, zero-cost (or near zero) channel through which Bilal's own LinkedIn data and LinkedIn's own recommendations reach him, which Signal Desk (Next.js on Vercel Hobby, Supabase, GitHub Actions cron) could ingest. No scraping, no automation of LinkedIn actions.

Labels: **[V]** verified against a primary source (vendor docs, LinkedIn/Microsoft/Google docs, or real redacted email fixtures in public code). **[S]** secondary (blogs, third-party guides, parsers). **[U]** unverified / inferred.

Method note: about 16 web searches ran before the session-wide search cap (200 calls, shared by all agents) was hit twice, so the 40-search target was not reached. I made up for it with about 45 direct fetches of primary sources and GitHub API reads of real parsers and redacted LinkedIn email fixtures (via `gh`). Some gaps remain marked [U], mainly the exact wording of post-performance emails.

---

## 1. Ranked channels (summary table)

| # | Channel | What data | Freshness | Setup effort | Cost | ToS risk | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | **LinkedIn notification emails -> Gmail -> Google Apps Script -> POST to app** | Job alerts (title, company, location, job ID, insight line, search term), job recommendations, application updates, comment/reaction/mention notices, messages/InMail previews, invitations, weekly "appeared in N searches", follower notices, post-performance nudges, newsletters, archive-ready notice | 5 to 15 min (trigger interval) | ~1 to 2 h (one script, one API route) | $0 | Very low (reading your own inbox) | **Build first** |
| 2 | **Creator analytics XLSX export (manual upload)** | Daily impressions and engagements, members reached, top 50 posts by impressions and engagements (with URLs), daily new followers plus total, audience demographics | Whenever exported (weekly ritual), about 13-month lookback | ~2 min per week for him; ~half a day to build the parser | $0 | None (first-party export) | **Build second**: the only full first-party analytics |
| 3 | **Single-post analytics XLSX export** | Per-post metrics for one post | Manual, per post | 1 min per post | $0 | None | Optional: export each post at day 7 |
| 4 | **"Download your data" archive (Complete)** | Posts (Shares.csv), comments, reactions, reposts, saved items, connections, invitations, company/hashtag/member follows, saved jobs, job applications, job alert configs, job-seeker preferences, search queries, inferences, learning, messages, rich media, profile | Manual; ready in up to 24 to 48 h; link valid 72 h; no scheduling | ~5 min per month | $0 | None | **Build third**: monthly upload, mainly for voice and history |
| 5 | **Buffer free plan + Buffer API (publish via Buffer, read metrics)** | Daily impressions, reach, reactions, comments, reposts, engagementRate for posts **published through Buffer** | Daily (up to ~24 h lag) | Medium (changes publishing path) | $0 (Free: 3 channels, 1 API key, 250 req/day, 3,000 req/30 days) | Low (Buffer is the LinkedIn partner) | **Optional**: only worth it if automatic per-post metrics matter more than publishing directly |
| 6 | Gmail API directly (instead of Apps Script) | Same as #1 | Same | Higher (GCP project, OAuth, token storage) | $0 | Very low | Fallback only, because of the 7-day token trap |
| 7 | Gmail filter -> forward -> inbound webhook (Resend / Cloudflare) | Same as #1 | Seconds | Medium | $0 with limits | Very low, but a third party sees the mail | Not recommended |
| 8 | LinkedIn Member Data Portability API (DMA) | Snapshot + 28-day changelog of all member data | Near real time | n/a | n/a | n/a | **Not available**: EEA and Switzerland members only |
| 9 | LinkedIn Community Management API (`r_member_postAnalytics`) | Per-post impressions, reach, saves, sends, follows, profile views | n/a | n/a | n/a | n/a | **Not available**: registered legal organizations, commercial use only |
| 10 | Make / Zapier / n8n / Pipedream / Metricool free | Posting only, or org-page stats only | n/a | n/a | n/a | n/a | **No personal read path** |
| 11 | Microsoft 365 / Outlook / Entra LinkedIn integration | Profile cards in work/school apps | n/a | n/a | n/a | n/a | **No API path** for an individual |

---

## 2. Channel 1: LinkedIn emails as a data feed

### 2.1 Email catalogue (senders, subjects, content)

From real (redacted) emails published in GitHub repos, plus classifier code that people have tuned against live mailboxes:

| Sender | Type | Subject pattern (examples) | Body content useful to the app | Label |
|---|---|---|---|---|
| `jobalerts-noreply@linkedin.com` | Saved-search job alert digest | `{Title} at {Company}`; `{Title} at {Company}: up to £90K/year` (salary appears in the subject only for the headline job); older form `“{search}”: {Company} - {Title} and more`; `N+ new jobs for “{search}”`; `{Name}: your job alert for {search} in {place} has been created` | First line `Your job alert for {keywords} in {location}`, then banner `New jobs match your preferences.` / `A new job matches your preferences.`, then repeated cards: **Title / Company / Location**, then an insight line (`This company is actively hiring`, `4 connections`, `1 school alum`, `1 company alum`, `Apply with resume & profile`, or a salary line like `£59K-£78K / year`), then `View job: https://www.linkedin.com/comm/jobs/view/{JOB_ID}/?trackingId=...&otpToken=...`. Cards are separated by a line of dashes. Footer has `See all jobs on LinkedIn:` with the full search URL (keywords, geoId, f_TPR, f_WT, f_JT, sortBy, origin=JOB_ALERT_EMAIL) and `Manage your job alerts` | [V] fixtures |
| `jobs-noreply@linkedin.com` | Application lifecycle | `Your application was viewed by {Company}`; `Your application to {Title} at {Company}`; `{Name}, you have new application updates this week` | Company, role, status | [V] fixtures |
| `jobs-listings@linkedin.com` | Recommended jobs ("Jobs you may be interested in") | Recommendation digests | Same card shape as alerts [U on exact shape] | [S] sender seen in several job-tracker classifiers |
| `notifications-noreply@linkedin.com` | Network/activity digest ("Here's what's happened since you were last on LinkedIn") | `You appeared in 17 searches this week`; `{Name} shared a post`; `{Name} reshared a post: …`; `Congratulate {Name} for N years at {Company}` | Weekly **search appearance count** plus "found by people from these companies"; page follower gains; network posts; birthdays and anniversaries | [V] fixtures |
| `notifications-noreply@linkedin.com` | Engagement on own posts | `… commented on your post`, `… reacted to …`, `… mentioned you …`, `… viewed your profile` (classifier patterns: `viewed your profile`, `your post .*(reaction|comment|like|view)`, `appeared in .* search`, `endorsed you`, `trending in your network`, `people you may know`) | Who engaged and a text preview | [S] patterns from live-tuned classifier; exact subjects [U] |
| (in-app, sometimes email) | **Post performance nudges** (rolled out Aug 2025): notifications when a post drives profile viewers, new followers and impressions, sent periodically, including at 3 and 7 days after posting | Impressions, profile views, followers from a post | [S]; whether these always come by email is [U] |
| `messages-noreply@linkedin.com` | Growth suggestions | `{Name}, add {Person} - {Headline}`; `{Name}, follow {Person}`; `Accelerate your knowledge: Follow pages you recently explored` | LinkedIn's own recommendations ("people you may know", creators to follow) | [V] fixtures |
| `messaging-digest-noreply@linkedin.com` | Unread message digest | Message notices | Sender name and preview | [S] |
| `inmail-hit-reply@linkedin.com`, `hit-reply@linkedin.com`, `hit-reply-premium-inmail@linkedin.com`, `inmails-noreply@linkedin.com` | InMail / recruiter messages | Recruiter subject lines (`opportunity at`, `role at` …) | Recruiter name, company, role, message body | [S] (Apps Script and sieve filters used in production) |
| `invitations@linkedin.com` | Connection requests and accepts | `{Name} <invitations@…>`: `I want to connect`; `{Name}, start a conversation with your new connection, {Person}` | Who connected and their headline | [V] fixtures |
| `newsletters-noreply@linkedin.com` | Newsletters he subscribes to | `{Author} via LinkedIn`: issue title | Full issue title and teaser, which work as a topic signal | [V] fixtures |
| `security-noreply@linkedin.com` | Security | `please verify your new device` | Ignore (never ingest) | [V] fixtures |
| `updates-noreply@linkedin.com` | Misc updates, some job digests | `1 new job for '…'`, `* new jobs for '…'` | Job digests | [S] sieve filter |

Every email ends with `This email was intended for {Name} ({Headline})` and a "Learn why we included this" link [V]. That makes it easy to confirm the right mailbox.

**Job alert facts** [V, LinkedIn Help a511279]: daily or weekly frequency; email, app, or both; **max 20 job alerts per member**. The Data Export's `SavedJobAlerts.csv` also records each alert's config (`ALERT_PARAMETERS` with channels and frequency, `QUERY_CONTEXT` with keywords, geo URN and facets, `SAVED_SEARCH_ID`) [V, sample file]. So the app can rebuild which alert produced which email.

**Job recommendations** [V, Help 11783]: recommendations come from his preferences, profile and (Premium) Top Applicant, and "you may also receive these job recommendations by email or through in-app notifications".

**Parsing gotchas** [V, real RCA in job-alert-harvester]: banner lines (`New jobs match your preferences.`) and promo blocks shift a naive "first three lines" parser. Anchor on the `/jobs/view/{id}` link and take the 3 lines before it as Title/Company/Location. Strip tracking params and keep the canonical `https://www.linkedin.com/jobs/view/{id}/`. Dedup by job ID across alerts. The snippet field is padded with invisible U+034F characters.

**Do not** have the app open the `comm/` links or job pages. Fetching LinkedIn pages automatically would be scraping. Store the canonical link for Bilal to click himself.

### 2.2 Turning up the volume (settings Bilal controls)

- Settings & Privacy -> **Notifications** -> categories: Invitations and messages, Jobs and opportunities, Activity in your network, Activity that involves you, News and articles, Offers and tips, Updates from events. Each item can be set for in-app, push and email [V, Help a1341821 / a1378534].
- Email frequency choices per item: **Individual**, **Weekly digest** (Daily for groups), **LinkedIn recommended**, **Off** [S, Dummies / guideflow]. Paths seen: *Posting and commenting -> Comments and reactions* and *Connecting with others -> Profile views* (set to Individual or Weekly) [S].
- **Recommendation for the app:** set Comments and reactions, Mentions, Profile views, Job alerts and Messages to **Individual email**, and keep the weekly network digest on (it carries the search-appearance count). Create up to 20 well-designed job alerts (daily).
- Free accounts see limited viewer detail (about the last 5 viewers, plus weekly counts) [S].

### 2.3 Ingestion options compared

**A. Google Apps Script on his own account (recommended).**
- Runs as Bilal, inside Google, on a time trigger. Uses `GmailApp.search(query, start, max)`, `getPlainBody()`, `getFrom()`, `getSubject()`, `getDate()` and labels [V, GmailApp reference]. `GmailApp` asks for the full `https://mail.google.com/` scope [V]. To narrow it, use the Advanced Gmail service with `gmail.readonly` + `gmail.labels` set in `appsscript.json` [U; standard practice].
- Consumer-account quotas [V, Apps Script quotas]: triggers total runtime **90 min/day**, **6 min per execution**, **URL Fetch 20,000/day**, **email read/write 20,000/day**, 20 triggers per user per script. LinkedIn volume (tens of emails a day) uses well under 1% of this.
- Verification: an Apps Script used only by its owner does not need verification. A gmail.com owner sees a one-time "Google hasn't verified this app" screen and clicks Advanced -> continue [S; Google's text covers the Workspace case, V]. There is **no 7-day refresh-token expiry**, because there is no self-managed "Testing" OAuth client [S].
- Cost $0, no third party in the data path, nothing to host.

**B. Gmail API from Vercel or GitHub Actions (fallback).**
- Quotas are not an issue: 250 quota units/user/second, `messages.list` and `messages.get` cost 5 units each, 1.2M units/min per project [V/S, Gmail quota page plus summaries].
- **7-day trap** [V, Google OAuth2 docs]: "A Google Cloud Platform project with an OAuth consent screen configured for an external user type and a publishing status of 'Testing' is issued a refresh token expiring in 7 days, unless the only OAuth scopes requested are a subset of name, email address, and user profile." `gmail.readonly` is a restricted scope [V, Google verification docs and Nylas].
- Fix: set the app to **"In production" but unverified**. Personal use is an explicit exception to verification ("if you are the only user of your app or if your app is used by only a few users, all of whom are known personally to you") [V, restricted-scope-verification page]. He clicks through the unverified warning once. The token then lasts until revoked or unused for about 6 months [S]. There is a limit of 100 refresh tokens per account per client [V]. A real 2026 project chose this exact route and documented the trade-off (Internal audience is Workspace-only; personal Gmail falls back to External + In production) [V, DR-0011 in job-alert-harvester].
- Cost: more moving parts (GCP project, consent screen, refresh-token secret in Vercel env, token-revocation handling).

**C. Gmail filter -> auto-forward -> inbound email webhook.**
- Gmail needs the forwarding address verified via a link sent to it. Selective forwarding is done with a filter [V, Gmail help 10957].
- **Resend inbound**: free managed `<id>.resend.app` address, `email.received` webhook. Free plan is 3,000 emails/month and **100/day**, and inbound mail counts toward that quota [V, Resend docs and pricing]. The body may need a second API fetch [S].
- **Cloudflare Email Routing + Email Workers**: inbound is unlimited on the free plan [V]. It needs a domain on Cloudflare, which he may not own [U on his setup]. Free Workers can hit CPU limits on big emails [V].
- **Postmark**: inbound needs the Pro plan ($16.50/mo). The free plan has no inbound [V].
- Downsides: a third party processes his mail, forwarding verification is fiddly, and a quota cliff applies (Resend 100/day).

**Recommended design (A):**
1. Gmail filter: `from:(linkedin.com) -from:security-noreply@linkedin.com` -> apply label `li/inbox`. Gmail labels only; no forwarding.
2. Apps Script, time-driven trigger **every 10 or 15 min**: `GmailApp.search('label:li/inbox -label:li/sent newer_than:3d', 0, 100)`. For each message build `{gmail_id, from, subject, date, plain_body (trimmed, tracking params stripped), html_body optional}`. POST in batches with `UrlFetchApp.fetch` to `https://<app>.vercel.app/api/ingest/email`, with an HMAC-SHA256 signature header (shared secret in Script Properties). On 2xx, add label `li/sent`.
3. Next.js route handler: verify HMAC, then upsert into Supabase `inbound_emails` (unique on `gmail_id`), then run a **deterministic classifier by sender + subject regex** (table above). Typed parsers write to `job_alerts` (job_id PK, title, company, location, insight, salary, search_term, first_seen, alert_email_ids[]), `engagement_events` (type: comment|reaction|mention|profile_view|follower|post_perf, actor_name, preview, post_ref, ts), `weekly_stats` (search_appearances, from_companies), `recruiter_messages`, `invitations`, `growth_suggestions`, `newsletter_issues`. Unknown types fall to an LLM (DeepSeek) extraction step with a JSON schema. Raw rows are kept so parsers can be re-run when LinkedIn changes templates.
4. Score job alerts against his profile with the existing scoring pipeline. Surface "reply to these comments" items in the growth dashboard.
5. Redact: never store `otpToken`, `midToken`, `trk` or `lipi` values. Those are per-recipient login/tracking tokens [V, harvester privacy note].

---

## 3. Channel 2 and 3: Creator analytics XLSX exports

- "All LinkedIn members have access to creator analytics": combined post analytics (posts, images, videos, events, polls, articles) and audience analytics (follower growth, demographics). Default 7 days, with a selectable date range. **Export button -> .XLSX** in the top right of each section [V, LinkedIn Help a704175].
- Workbook sheets **DISCOVERY** (Impressions, Members reached for the window), **ENGAGEMENT** (daily Date, Impressions, Engagements), **TOP POSTS** (two side-by-side tables: top 50 by engagements in A-C and by impressions in E-G, keyed by post URL), **FOLLOWERS** (daily new followers plus a "Total followers on M/D/YYYY" line), **DEMOGRAPHICS** (category, value, percentage). Filenames changed in 2026 from `Content_*.xlsx` to `AggregateAnalytics_{Name}_{start}_{end}.xlsx`. The new format stores numbers as **text**, percentages as `"2%"` / `"< 1%"`, and uses singular category labels (`Job title`, `Industry`, `Location`, `Company`) [S, DuncanBoyne/linkedin-dashboard-skill, 2026].
- Lookback is about **13 months**, so keep every file and merge rather than replace. Recent numbers get revised upward, so keep the max on overlap [S].
- **Single-post export**: each post's "View analytics" page has an Export to Excel option [S, Lindsey Gamble / Ordinal]. Per-post impressions, members reached, reactions, comments, reposts, saves, sends, profile views and followers from the post match the metric set LinkedIn exposes to partners [V for the metric list, Member Post Statistics API doc].
- **Ingestion design**: an `/upload` page (drag-drop, multiple files) -> server action parses with SheetJS/exceljs -> idempotent upserts into `analytics_daily(date PK, impressions, engagements, new_followers)`, `analytics_top_posts(post_url PK, impressions, engagements, seen_in_window)`, `analytics_demographics(snapshot_date, category, value, pct)`, `analytics_reach(window, members_reached)`. Join `post_url` to the app's own published-post URNs (`urn:li:share:` / `urn:li:activity:`) to close the loop with each draft's features (hook type, topic, format, time posted). A weekly cron reminder (from the app, or the Monday digest email) says "export last 7 days". Two minutes of his time per week.
- Newsletter analytics, follower lists, subscriber export, newsletter RSS: no first-party export or RSS was found [U]. Treat as unavailable.
- "Content search alerts" (saved post searches that email you): no evidence this exists for posts. Job alerts are the only saved-search email [U].

---

## 4. Channel 4: Data archive ("Download your data")

- Path: Me -> Settings & Privacy -> Data privacy -> Download your data. Fast option (~10 min): profile, positions, education, skills, endorsements, certifications, recommendations, job applications. **Larger archive: "you'll receive an email within 48 hours"** (24 h typical). Download link valid **72 hours**. Desktop only. **No scheduling or recurring option** [V, Help a1339364]. He can request it again whenever he wants. The "archive is ready" email can be caught by Channel 1 to remind him.
- **Files and columns** [S, real-structure sample data in `alexewerlof/linkedout` test-data plus `juanmanueldaza/linkedin2md` parsers, both updated in 2026]:

| File | Columns | Use for Signal Desk |
|---|---|---|
| `Shares.csv` | Date, ShareLink, ShareCommentary, SharedUrl, MediaUrl, Visibility | **All his past posts**: voice corpus and pgvector cohesion seed. **No metrics in it** |
| `Comments.csv` | Date, Link, Message | His comment voice; who and what he engages with |
| `Reactions.csv` | Date, Type (LIKE, PRAISE, ENTERTAINMENT …), Link | Interest graph |
| `InstantReposts.csv`, `Votes.csv` (Date, Link, OptionText) | | Engagement history |
| `Rich_Media.csv` | Date/Time ("You uploaded a feed document on …"), Media Description, Media Link | Carousels/videos he posted |
| `Articles/…html` | Full article HTML | Long-form voice |
| `Saved_Items.csv` | savedItem (feed URL), CreatedTime | Posts he bookmarked = topic inspiration |
| `Connections.csv` | First Name, Last Name, URL, Email Address (often blank), Company, Position, Connected On (3 note lines before the header) | Audience composition |
| `Invitations.csv` | From, To, Sent At, Message, Direction | Network growth |
| `Company Follows.csv` | Organization, Followed On | Interest signals |
| `Member_Follows.csv` | Date, FullName, Status | Creators he follows |
| `Hashtag_Follows.csv` | HashTag, CreatedTime, LastModifiedTime, State | Topics |
| `Jobs/Saved Jobs.csv` | Saved Date, Job Url (`/jobs/view/{id}`), Job Title, Company Name | Job intent |
| `Jobs/Job Applications.csv` (may be split _1, _2) | Application Date, Contact Email, Contact Phone Number, Company Name, Job Title, Job Url, Resume Name, Question And Answers, (Status, Withdraw Date) | Application tracker |
| `Jobs/Job Seeker Preferences.csv` | Locations, Industries, Company Employee Count, Preferred Job Types, Job Titles, Open To Recruiters, Dream Companies, … | Job targeting |
| `SavedJobAlerts.csv` | ALERT_PARAMETERS, QUERY_CONTEXT, SAVED_SEARCH_ID | Map alert emails to searches |
| `job_applicant_saved_screening_question_responses*.csv`, `Job Descriptions` | | Optional |
| `SearchQueries.csv` | Time, Search Query | What he searches on LinkedIn |
| `Inferences_about_you.csv` | Category, Type of inference, Description, Inference | How LinkedIn classifies him (career inferences) |
| `Ad_Targeting.csv`, `Ads Clicked.csv`, `LAN Ads Engagement.csv` | | How LinkedIn segments him |
| `Learning.csv` | Content Title, Content Description, Content Type, Last Watched, Completed At, Saved, Notes | Learning topics |
| `Profile.csv`, `Profile Summary.csv`, `Positions.csv`, `Education.csv`, `Skills.csv`, `Endorsement_*`, `Recommendations_*`, `Honors.csv`, `Courses.csv`, `Languages.csv`, `Certifications`, `Projects` | | Profile facts for prompts |
| `messages.csv` | CONVERSATION ID, CONVERSATION TITLE, FROM, SENDER PROFILE URL, TO, RECIPIENT PROFILE URLS, DATE, SUBJECT, CONTENT, FOLDER | DMs (sensitive; opt-in only) |
| `guide_messages.csv`, `learning_coach_messages.csv`, `learning_role_play_messages.csv` | | LinkedIn AI assistant chats |
| Also seen in parsers: `Who viewed profile` (Date, Viewer Name), `Logins`, `Security Challenges`, `Registration`, `Receipts_v2`, `Events`, `Verifications`, `Causes`, `Interests`, `LinkedIn Salary` | | Mostly ignore |

- Ingestion: upload the ZIP -> unzip in a server action (bounded size and row caps, no zip-slip). Parse CSVs, skipping the leading "Notes:" lines in Connections.csv. Upsert by natural keys (ShareLink, Link+Date, Job Url). Embed Shares/Comments into pgvector for the voice profile. Monthly cadence.

---

## 5. Channel 5: Buffer as a partner-API proxy for metrics (optional)

- Buffer supports LinkedIn **profiles** (basic analytics plus community management) and Pages (advanced analytics) [V, Buffer support 567].
- **Free plan**: 3 channels, 10 scheduled posts per channel, 30-day analytics history, reply to comments, **1 API key**. No CSV export on Free [V, buffer.com/pricing]. API rate limits on Free: 100 per 15 min, **250 per 24 h, 3,000 per 30 days** [V, Buffer API docs].
- Post metrics through the GraphQL API: `post { metrics { type name value unit } metricsUpdatedAt }` and `aggregatedPostMetrics(...)`. On LinkedIn this includes `impressions`, `reach`, `engagementRate`, `reactions`, `comments`, `reposts`, plus `viewers` and `totalTimeWatched` for video. "Metric values are pulled from each network on a daily cadence". Needs a **personal API key** with the `insightsRead` scope; app clients cannot read metrics. Window max 365 days [V].
- Catch: in Buffer's data model, "A post is a piece of content scheduled or published through Buffer" [V]. Metrics cover **only posts sent via Buffer**, not posts made natively or through his own LinkedIn API integration [S/U; implied by the data model]. Whether the free plan's API key carries `insightsRead` is also [U]; test it before committing.
- Design if adopted: the app publishes through Buffer `createPost` (supports LinkedIn first comment, link cards and documents [V]) instead of LinkedIn `w_member_social`, stores the Buffer post ID, and a daily GitHub Actions job reads metrics (fewer than 30 calls/day). Trade-offs: a dependency on Buffer's free tier, a 10-post queue cap, and duplicate auth. **Recommendation:** keep direct publishing and use the weekly XLSX (Channel 2) as the source of truth. Use Buffer only if automatic per-post curves become essential.

---

## 6. Dead ends (checked, not usable)

- **LinkedIn Member Data Portability (Member) API** (DMA): it would be ideal (snapshot of all data plus a changelog of his posts, comments and reactions for the last 28 days, self-serve with `r_dma_portability_self_serve`). But "this feature is available only for LinkedIn members located in the European Economic Area and Switzerland" [V, Microsoft Learn, 2026-04]. Bilal is in Karachi: **not eligible**. Using a VPN or a false location would breach terms. Don't.
- **Community Management API / `memberCreatorPostAnalytics`** (`r_member_postAnalytics`: IMPRESSION, MEMBERS_REACHED, RESHARE, REACTION, COMMENT, and from 2026-04 POST_SAVE, POST_SEND, LINK_CLICKS, FOLLOWER_GAINED_FROM_CONTENT, PROFILE_VIEW_FROM_CONTENT) [V]. Access is "only available to registered legal organizations for commercial use cases only… Personal email addresses won't pass the vetting process" [V]. **Not for an individual.**
- **n8n** LinkedIn node: one operation, Post (create). No triggers [V]. **Zapier**: 2 actions (Create Share Update, Create Company Update). No triggers [V]. **Make**: personal profiles get create/delete post only. Watch triggers and statistics are company-page only [V]. **Pipedream**: the only trigger is "New Organization Post Created". It has actions such as "Retrieve Comments On Shares" and "Get Current Member Profile". Whether its LinkedIn app can read comments on a personal post is [U], and probably restricted.
- **Metricool Free**: "all your brands' social networks (except LinkedIn and Twitter)", no API, no export [V]. Paid plans start around €16-20/month.
- **Microsoft 365 / Outlook / Entra**: LinkedIn "account connections" only show LinkedIn profile info on profile cards in Outlook, OneDrive and SharePoint for **work or school** accounts, after admin enablement and user consent. "Data that is accessed from LinkedIn isn't stored permanently in Microsoft services" [V, Microsoft Entra docs]. No Graph endpoint or export for an individual [S]. A Copilot LinkedIn connector for personal data was not found [U].
- **Postmark inbound**: Pro plan only [V].

---

## 7. Recommended overall ingestion architecture

```
LinkedIn ──email──> Gmail (label li/inbox via filter)
                      │  Apps Script, every 10-15 min, HMAC-signed POST
                      ▼
          /api/ingest/email  (Vercel route)  ──> Supabase: inbound_emails (raw, idempotent)
                      │ classifier (sender+subject regex; LLM fallback)
                      ▼
   job_alerts · engagement_events · weekly_stats · recruiter_messages · invitations · suggestions
Weekly:  creator analytics .xlsx ──upload──> analytics_daily / top_posts / demographics / reach
Monthly: data archive .zip ──upload──> posts corpus (pgvector), comments, saved items, follows, jobs
Optional: Buffer API daily metrics (only if publishing moves to Buffer)
```

- **Freshness:** events in minutes (email), analytics weekly (XLSX), history monthly (ZIP).
- **Cost:** $0. Apps Script and Supabase free tier; well inside Vercel Hobby.
- **ToS posture:** reads only data LinkedIn sends him or exports for him. No automated visits to linkedin.com, no LinkedIn credentials stored, no scraping. Tracking tokens are stripped.
- **Fragility:** LinkedIn email templates change, as the 2026 header-shift RCA shows. Keep raw emails, anchor on job-ID links, add fixture tests, and alert when a known sender yields 0 parsed items.

---

## Sources

Google
- OAuth 2.0 refresh token expiration (Testing = 7 days; 100 tokens per client): https://developers.google.com/identity/protocols/oauth2
- Restricted scope verification, exceptions (personal use, testing): https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification
- Apps Script quotas: https://developers.google.com/apps-script/guides/services/quotas
- Apps Script client verification: https://developers.google.com/apps-script/guides/client-verification
- GmailApp reference: https://developers.google.com/apps-script/reference/gmail/gmail-app
- Gmail API quota: https://developers.google.com/workspace/gmail/api/reference/quota
- Gmail forwarding: https://support.google.com/mail/answer/10957
- Secondary: https://www.unipile.com/google-oauth-refresh-token/ , https://www.unipile.com/gmail-api-limits/ , https://developer.nylas.com/docs/dev-guide/provider-guides/google/google-verification-security-assessment-guide , https://nango.dev/blog/google-oauth-invalid-grant-token-has-been-expired-or-revoked

LinkedIn / Microsoft
- Download your account data: https://www.linkedin.com/help/linkedin/answer/a1339364
- Job alerts (20 max, daily/weekly, email/app): https://www.linkedin.com/help/linkedin/answer/a511279
- Job recommendations: https://www.linkedin.com/help/linkedin/answer/11783
- Notifications overview and settings: https://www.linkedin.com/help/linkedin/answer/a1341821 , https://www.linkedin.com/help/linkedin/answer/a1378534
- Creator analytics and export: https://www.linkedin.com/help/learning/answer/a704175
- Member Data Portability (EEA/CH only): https://learn.microsoft.com/en-us/linkedin/dma/member-data-portability/member-data-portability-member/
- Member Post Statistics API: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/members/post-statistics
- Community Management app review (legal orgs only): https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review
- Entra LinkedIn account connections: https://github.com/MicrosoftDocs/entra-docs/blob/main/docs/identity/users/linkedin-integration.md , https://github.com/MicrosoftDocs/entra-docs/blob/main/docs/identity/users/linkedin-user-consent.md
- Post performance notifications (Aug 2025): https://www.searchenginejournal.com/linkedin-alerts-you-when-posts-drive-profile-views-followers/554066/
- Settings guides: https://www.guideflow.com/tutorial/how-to-set-comments-and-reactions-email-frequency-to-individual-on-linkedin , https://www.guideflow.com/tutorial/how-to-set-profile-views-email-frequency-to-weekly-on-linkedin , https://www.dummies.com/article/technology/social-media/linkedin/modify-linkedin-communications-settings-253606/ , https://aiemaily.com/blog/how-to-stop-linkedin-notification-emails
- Analytics export guides: https://www.tryordinal.com/blog/how-to-export-analytics-from-linkedin-to-excel-or-a-csv , https://www.lindseygamble.com/blog/linkedin-introduces-exportable-single-post-analytics

Code (real parsers and redacted fixtures)
- Job alert email parser, fixtures, Gmail credential ADR, header-shift RCA: https://github.com/danjmfox/job-alert-harvester (src/core/parse-linkedin.mjs, fixtures/linkedin*, docs/decisions/DR-0011…, docs/feature/fix-linkedin-header-shift/rca.md)
- LinkedIn email sample corpus (notifications, invitations, newsletters, jobs): https://github.com/KelvinJais/Job-Applications-Tracker (other/, reject/, apply/)
- Sender/subject classifier: https://github.com/eriktaylor/apply-daemon/blob/main/src/email_classifier.py
- InMail Apps Script: https://github.com/ChrisCarini/google-apps-scripts/tree/master/recruiter-contacted-me
- Apps Script + LLM job curator: https://github.com/IamGuneet/Personalized-AI-Job-Curator-Workflow
- ProtonMail sieve (job alert subjects, InMail sender): https://github.com/ELLIOTTCABLE/System
- Event-driven comment notifications via forwarded email: https://github.com/christopherqueenconsulting/linkedin_engagement_manager/blob/main/docs/REPLY_NOTIFICATIONS.md
- Export CSV structure: https://github.com/alexewerlof/linkedout/tree/main/test-data , https://github.com/juanmanueldaza/linkedin2md
- Creator analytics XLSX structure: https://github.com/DuncanBoyne/linkedin-dashboard-skill

Tools
- Buffer pricing: https://buffer.com/pricing ; channels: https://support.buffer.com/article/567-supported-channels ; API docs and rate limits: https://developers.buffer.com/llms-full.txt ; post metrics: https://developers.buffer.com/guides/post-metrics
- Metricool pricing: https://metricool.com/pricing/
- n8n LinkedIn node: https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.linkedin/
- Make LinkedIn: https://apps.make.com/linkedin
- Zapier LinkedIn: https://zapier.com/apps/linkedin/integrations
- Pipedream LinkedIn: https://pipedream.com/apps/linkedin
- Resend receiving and pricing: https://resend.com/docs/dashboard/receiving/introduction , https://resend.com/pricing
- Cloudflare Email Routing: https://developers.cloudflare.com/email-routing/limits , https://developers.cloudflare.com/email-service/platform/pricing/
- Postmark pricing: https://postmarkapp.com/pricing
