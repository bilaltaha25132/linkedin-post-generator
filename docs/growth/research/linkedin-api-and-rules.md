# LinkedIn API and rules: what Signal Desk can legally and technically do

Researched 2026-10-07 for Bilal Taha (individual, Karachi, Pakistan). The question: can Signal Desk, a personal Next.js + Supabase app on Vercel Hobby, publish and schedule posts, read his own analytics, help with comments and networking, and review his profile?

Labels used below:
- **[V]**: verified against a primary source (learn.microsoft.com/linkedin, linkedin.com/legal, or a LinkedIn Help article) that was fetched during this research.
- **[S]**: secondary source only (trade press or vendor blogs).
- **[U]**: unverified or inferred. Test it before relying on it.

The web-search budget ran out near the end of the research. Items marked [S] or [U] were not cross-checked further.

---

## TL;DR

1. **Publishing works and is self-serve.** Add the **Share on LinkedIn** product to get `w_member_social`, plus **Sign In with LinkedIn using OpenID Connect** (`openid profile email`). Together they let Bilal post text, a single image, multi-image (2 to 20), video, a document/PDF "carousel", articles, and polls to his own profile through `POST /rest/posts`. Organic "Carousel" (the ads format) is sponsored-only. A PDF document post is the organic equivalent. [V]
2. **Tokens.** Access tokens last 60 days. Programmatic refresh tokens (365 days) are documented only for approved Marketing Developer Platform partners. In practice, a self-serve app has to re-run OAuth about every 60 days. [V for the doc text; U that a Share-on-LinkedIn-only app never gets a `refresh_token`]
3. **His own analytics through the API are blocked for an individual.** `memberCreatorPostAnalytics` (`r_member_postAnalytics`) and `memberFollowersCount` (`r_member_profileAnalytics`) exist and do exactly what he wants. They sit inside the **Community Management API**, which LinkedIn says is "only available to registered legal organizations for commercial use cases only." It also requires a business email, a website, a privacy policy and a verified LinkedIn Page. `r_member_social` (reading your own posts and comments) is **closed**: "We're not accepting access requests at this time." [V]
4. **The Member Data Portability (DMA) API does not work for a member in Pakistan.** It covers EU/EEA and Switzerland only, decided by the location on the member's profile. [V]
5. **The legal data sources available to Bilal today:** (a) the creator analytics XLSX export (up to 365 days, top posts, followers, demographics); (b) the per-post analytics export; (c) the "Download your data" archive (Shares, Comments, Reactions, Connections, Invitations, Profile, Positions, Skills and more); (d) the post URNs his own app gets back when it publishes. [V/S]
6. **Extensions and automation.** The User Agreement explicitly bans "browser plugins and add-ons" that scrape, and bots that "create, comment on, like, share" posts. LinkedIn's help page bans extensions that "scrape, modify the appearance of, or automate activity on LinkedIn's website." Even an extension that only reads what the user is viewing is technically "copying" the Services, and it carries account-restriction risk. [V]
7. **2026 climate.** LinkedIn now limits the reach of automated and generic AI comments, added a "Seems like AI slop" report button (30 Jul 2026), and replaced its own AI post rewriter with a "Post Proofreader" (Sep 2026). It says: "It's ok to use AI to help you write, but your posts and comments need to represent your voice." [S, with quotes]

---

## 1. Self-serve products for an individual developer

### 1.1 Getting an app at all
- A developer app must be associated with a **LinkedIn Company Page**, and a Page super-admin has to verify the association. An individual can create his own Page for this, such as a personal brand or "Signal Desk" page. [S: n8n/vendor docs; the Community Management docs confirm Page verification for that product, V]
- Do **not** put "Linked" or "In" in the app name or logo. This is a Community Management review rule, and it is good hygiene anyway. [V]

### 1.2 Sign In with LinkedIn using OpenID Connect [V]
- Scopes: `openid`, `profile`, `email`. The userinfo endpoint is `GET https://api.linkedin.com/v2/userinfo`. It returns `sub`, `name`, `given_name`, `family_name`, `picture`, `locale`, and optionally `email` and `email_verified`.
- `sub` is what you use to build the author URN, `urn:li:person:{sub}`.
- It returns **no headline, experience, skills or about section**. The legacy `r_liteprofile` and `r_basicprofile` scopes were deprecated for new apps on 1 Aug 2023 [S]. **No self-serve API can review his full profile.**
- "Verified on LinkedIn" (`/identityMe`, `/verificationReport`) has a self-serve Development tier limited to the app's admins. It also returns basic profile plus verification categories only. Current experience and education are **Plus tier** (Business Development approval). It does not help with profile review. [V]

### 1.3 Share on LinkedIn (`w_member_social`) [V]
- How to get it: Developer Portal, then Products, then "Share on LinkedIn". The doc says this "will grant you `w_member_social`". It is self-serve, with no review for personal posting.
- **Posts API vs ugcPosts:** The Share on LinkedIn page (last updated 2023) still shows `POST /v2/ugcPosts` and `/v2/assets?action=registerUpload`. The Posts API page states: "The Posts API replaces the ugcPosts API." New code should use `POST https://api.linkedin.com/rest/posts` with the headers `LinkedIn-Version: YYYYMM` and `X-Restli-Protocol-Version: 2.0.0`.
  - Versions sunset after about a year. Example: "Marketing Version 202510 ... will be sunset on October 15, 2026." Bump the version yearly.
  - Use `/rest/images`, `/rest/videos` and `/rest/documents` for uploads.
  - Vendors confirm `/rest/posts` works for a person author with only Share on LinkedIn [S: Blotato, Zernio, bundle.social].
- **Content types (Posts API table):**

| Content | Organic | Notes |
|---|---|---|
| Text only | Yes | `commentary` uses "little text" format. Mentions use `@[Name](urn:li:person:…)`, hashtags `#tag` |
| Single image | Yes | Upload with Images API, then `urn:li:image:…` |
| **MultiImage** | Yes | "minimum of 2 images and maximum of 20 images", organic only |
| Video | Yes | Videos API |
| **Document (PDF/PPT/PPTX/DOC/DOCX)** | Yes | Documents API: "file size can't exceed 100MB and 300 pages". For person owners "the caller must match the document owner". Permission table lists `w_member_social`. **This is the organic "PDF carousel".** |
| Article/link | Yes | "The Posts API does not support URL scraping". You supply title, description and thumbnail yourself |
| Poll | Yes | Poll API |
| Carousel (ads format) | **No** | "Organic carousel is currently not supported", sponsored only |

- **lifecycleState:** "PUBLISHED is the only accepted field during creation." There is no `scheduledAt` field, so the API has **no native scheduling**. Scheduling therefore means your own cron calls `POST /rest/posts` at the target time.
- **Edit and delete:** `PARTIAL_UPDATE` can change `commentary`. `DELETE /rest/posts/{urn}` is supported. [V; U whether a `w_member_social`-only token may edit or delete. Docs imply yes for one's own posts]
- **Reading back:** "To retrieve all posts authored by a person, `r_member_social` permission is required". That permission is closed. Store the `x-restli-id` URN returned on create. Whether a `w_member_social`-only token can `GET /rest/posts/{urn}` for its own post is **[U]**.
- **w_member_social also allows comment/like via API** ("Post, comment, and like posts on behalf of an authenticated member"). We will not use this for comments. See §5.
- **Rate limits (Share on LinkedIn page):** 150 requests per member per day and 100,000 per app per day (UTC). The API Terms also cap self-serve apps at 100,000 lifetime users. [V]

### 1.4 Tokens [V]
- "By default, access tokens are valid for 60 days and programmatic refresh tokens are valid for a year."
- But: "LinkedIn supports programmatic refresh tokens for all approved Marketing Developer Platform (MDP) partners."
- Bilal's self-serve app will most likely get **no refresh_token** [U, test it]. Plan for a "Reconnect LinkedIn" banner at around day 55, and store `expires_at`.
- API Terms §4.2: you **may** store tokens.

---

## 2. Reading his OWN analytics through the API

| Endpoint | Scope | What it returns | Product | Who can get it |
|---|---|---|---|---|
| `GET /rest/memberCreatorPostAnalytics?q=entity` / `q=me` | `r_member_postAnalytics` | IMPRESSION, MEMBERS_REACHED, REACTION, COMMENT, RESHARE. From 202604 also POST_SAVE, POST_SEND, LINK_CLICKS, PREMIUM_CTA_CLICKS, FOLLOWER_GAINED_FROM_CONTENT, PROFILE_VIEW_FROM_CONTENT. DAILY or TOTAL, with dateRange | Community Management API | Vetted orgs only |
| `GET /rest/memberCreatorVideoAnalytics` | `r_member_postAnalytics` | VIDEO_PLAY, VIDEO_WATCH_TIME, VIDEO_VIEWER | same | same |
| `GET /rest/memberFollowersCount?q=me` / `q=dateRange` | `r_member_profileAnalytics` | lifetime and daily follower counts. Scope text: "profile viewers, followers, and search appearances" | same | same |
| `GET /rest/posts?q=author` | `r_member_social` | his posts, comments, likes | "Member Post Management" | **Closed**: "We're not accepting access requests at this time due to resource constraints." |

The member analytics endpoints were added in **202506** (followers `q=me` since 202504) [V, Recent Changes]. The `metricType` became a plain string in 202605.

**Eligibility, quoted from Community Management App Review [V]:**
> "At this time, our Community Management APIs are only available to registered legal organizations for commercial use cases only."
> "Personal email addresses won't pass the vetting process."
> Must have: "Verified business email address", "Verified organization", "Verified organization website and domain address", app verified by the org's LinkedIn Page.

- There are two tiers. **Development** gives limited calls: 500 per app and 100 per member per day after the increase. **Standard** needs a screencast, test credentials, and a privacy-policy review. Apply from a **new app with no other products**. If rejected, you can't reapply on the same app.
- The Development tier would be enough for one user. **The blocker is the legal-entity requirement, not the volume.**
- **Feasibility for Bilal:** Not possible as an individual. It becomes possible only if he forms a registered business (in Pakistan, for example an SECP-registered company; whether a sole proprietorship passes is **[U]**). He would also need a business domain email, a website with a privacy policy, and a Page. The use case "Executive Management / Profile Management" (posting to and monitoring one's own profile) is an approved category. Even with approval, the Marketing data-storage rules say member social-activity data may be stored only **48 hours**. Storing post analytics long term is not explicitly covered; the closest category is "Organization Pages' Admin and Reporting Data: One Year" [U for member analytics]. Restricted use cases also forbid export, combining with other data, and sales or recruiting uses.

---

## 3. Member Data Portability API (DMA) [V]
- It exists because of the EU Digital Markets Act.
- Product "Member Data Portability API (Member)", scope `r_dma_portability_self_serve`. Tokens come from the OAuth Token Generator, and the app must use LinkedIn's "Member Data Portability (Member) Default Company" page.
- Endpoints:
  - `GET /rest/memberSnapshotData?q=criteria&domain=…`: profile, posts, articles, account history, and other historical data. It mirrors the data-download domains, with `Linkedin-Version: 202312` only.
  - Member Changelog API: interactions after consent (posts, comments, reactions). "Users can only query changelog events created in the past 28 days."
- **Eligibility:** "only members located in the EU/EEA or Switzerland (as determined by the location provided by the member in their LinkedIn profile) can utilize this functionality." Others "will receive error messages if they try to apply for access … or try to consent."
- **For Bilal in Karachi: not available.** Changing his profile location to the EU to qualify would be misrepresentation under the User Agreement. Do not do it.
- It has no impressions or analytics in any case [U: domains reviewed only partially].

---

## 4. Manual exports: the realistic legal data sources

### 4.1 Creator / post analytics export (XLSX)
- **Where:** Profile, then Analytics, then Content/Post analytics, then **Export** (desktop). Date range from "the past seven days up to the past 365 days" [V, Help a701208: "Export your analytics to an .XLSX file"]. "this graph will populate up to yesterday" [V].
- **Workbook layout:** five sheets, **DISCOVERY** (total impressions and members reached), **ENGAGEMENT** (daily impressions and engagements), **TOP POSTS** (top 50 by engagement and top 50 by impressions: post URL, publish date, count), **FOLLOWERS** (daily new followers plus total), **DEMOGRAPHICS** (job titles, locations, industries, seniority, company size, with percentages) [S: multiple vendor guides; exact column labels **[U]**].
- **Post text is not included, only URLs** [S]. Labels are localized, and one open-source parser reads sheets by position for that reason [S: github obrenoalvim/linkedin-insights].
- **Per-post export:** "View analytics" on a post, then Export. It includes impressions, members reached, reactions/comments/reposts, saves/sends, and viewer demographics [S: Lindsey Gamble].
- **How Signal Desk can use it:** upload the XLSX, parse it with SheetJS, join TOP POSTS URLs to our own stored post URNs, and keep the history ourselves. This is Bilal's own data, which he exported and handed to his own app. It is not API "Content", so the API storage limits do not apply [interpretation; Marketing storage doc: "requirements don't apply to data that's independently provided to you by your clients"].

### 4.2 "Get a copy of your data" archive [V, Help 50191]
Settings & Privacy, then Data privacy, then "Get a copy of your data". It produces a ZIP (`Complete_LinkedInDataExport_*.zip`). Some files arrive within about 10 minutes and the full archive within about 24 to 48 hours. Files most relevant to Signal Desk:

| File | LinkedIn's description (verbatim) | Likely columns [S/U] |
|---|---|---|
| **Shares.csv** | "all shared or re-shared posts. This includes the date, URL, shared comments, and visibility status." | Date, ShareLink, ShareCommentary, SharedUrl, MediaUrl, Visibility [U] |
| **Comments.csv** | "comments a member has made to posts, articles, shares … includes the date and URL." | Date, Link, Message [U] |
| **Reactions.csv** | "reaction type … like, celebrate, support, love, insightful, or funny, the date, and URL of the post reacted to." | Date, Type, Link [U] |
| **Connections.csv** | "first and last name, public profile URL, email address, company, position, and connection date for all 1st degree connections." Email appears only if the connection allows it, and there is a notes preamble before the header row [S] | First Name, Last Name, URL, Email Address, Company, Position, Connected On |
| Invitations.csv | "invitee and inviter's first and last name, URL, date sent, and message." | |
| Member Follows | who he follows, with dates | |
| Profile.csv, Positions.csv, Education.csv, Skills.csv, Certifications, Projects, Honors, Languages, Recommendations Given/Received, Endorsements | full profile contents | **these feed the profile review** |
| Rich Media | "URL links to any photos, videos, or documents shared" | |
| Saved Items, Search Queries, Votes, Instant Reposts, Messages, Inferences, Ad Targeting, "AI-powered conversations", "Profile Summary" (LinkedIn's AI summary of him) | | |

- **No impressions in the archive.** Engagement counts in Shares.csv are **[U]**. One vendor says reaction and comment counts come with the export; this was not verified.
- The archive is the **legal path for "find people to connect with"**: Connections.csv, Invitations, Member Follows, plus who he engages with (Comments and Reactions URLs). Signal Desk can suggest; Bilal clicks Connect himself.

---

## 5. Policies on extensions, automation, scraping, and AI comments

### 5.1 Key policy lines [V]
- **User Agreement §8.2 (effective 3 Nov 2025)**, "you will not":
  > "Develop, support or use software, devices, scripts, robots or any other means or processes (such as crawlers, browser plugins and add-ons or any other technology) to scrape or copy the Services, including profiles and other data from the Services"
  > "Use bots or other unauthorized automated methods to access the Services, add or download contacts, send or redirect messages, create, comment on, like, share, or re-share posts, or otherwise drive inauthentic engagement"
  > "Overlay or otherwise modify the Services or their appearance (such as by inserting elements into the Services …)"
  > "Interfere with the operation of … the Services (e.g., spam, … manipulating algorithms)"
- **User Agreement, Generative AI:** "Please review and edit such content before sharing with others … you are responsible for ensuring it complies with our Professional Community Policies." The agreement also acknowledges "content automatically generated and shared using tools offered by LinkedIn or others off LinkedIn."
- **Help a1341387 (Prohibited software):** "We don't permit the use of any third party software, including 'crawlers', bots, browser plug-ins, or browser extensions that scrape, modify the appearance of, or automate activity on LinkedIn's website." Violators "risk having their accounts restricted or shut down," and tools "may become non-operational without notice."
- **Professional Community Policies:** "Don't do things to artificially increase engagement with your content. Respond authentically to others' content and don't agree with others ahead of time to like or re-share each other's content." Also: "Do not share synthetic or manipulated media … without clearly disclosing."
- **API Terms of Use** (last revised 13 Dec 2022), §3.1: "Use the Content or the APIs to automate posting on the LinkedIn Services." This is prohibited. Also prohibited: scraping-sourced content, and combining "Content with any other LinkedIn content". §4.1: "You must not capture, copy, cache, or store any Content … except to the extent expressly permitted", store "only for the duration necessary". §4.3: profile data may be refreshed "only when the Member is actually using your Application and not on an automated schedule." §4.4: delete on request.
  - **Interpretation [U]:** the Share on LinkedIn product exists precisely so members can post from apps. Scheduling tools such as Buffer and Hootsuite publish member posts at a chosen time. A human-authored, human-approved post published at the member's chosen time is the member's own act and is industry norm. Unattended bot posting (auto-generating and auto-publishing without review) is what the clause targets. **Keep a mandatory human "Approve & schedule" click per post.**
- **LinkedIn Help (comments), Aug 2025:** "if we detect excessive comment creation or use of an automation tool, we may limit the visibility of those comments." [S: SocialMediaToday quoting LinkedIn Help]

### 5.2 Enforcement examples
- **hiQ v. LinkedIn:** ended Dec 2022 with a $500k consent judgment (breach of the User Agreement, CFAA and more) and a permanent injunction to stop scraping and delete data and code. [S: Proskauer, NatLawReview]
- **Proxycurl (Nubela):** sued 24 Jan 2025 (N.D. Cal.) over fake accounts used for scraping. Permanent injunction and data deletion followed, and the service shut down on 4 Jul 2025. [S: Nubela blog, multiple]
- **ProAPIs:** sued in Oct 2025 for running "millions of fake accounts" and selling scraped data at up to $15k a month. [S: SecurityAffairs, Bloomberg Law]
- **Apollo.io and Seamless.ai:** their LinkedIn company pages were removed in Mar 2025. This was widely attributed to their Chrome extensions scraping profiles. Apollo's page was reportedly back by Jul 2026. [S]
- **2026 AI crackdown:**
  - 21 May 2026: Laura Lorenzetti announced limited reach for AI content that lacks perspective, plus detection of automated comments. Quote: "It's ok to use AI to help you write, but your posts and comments need to represent your voice and your perspectives."
  - 30 Jul 2026: the "Seems like AI slop" button (on posts and comments). LinkedIn blocks "hundreds of thousands" of automated comment attempts daily. CPO Hari Srinivasan: "AI slop is a top priority." [S: TechCrunch, SocialMediaToday]

### 5.3 Risk of a "read only what I'm viewing, I post manually" Chrome extension
- **The letter of the rules:** a content script that reads the LinkedIn DOM and sends post text to our server is a "browser plugin" that "copies" the Services. Injecting a "Draft comment" button is "inserting elements into the Services". Both are prohibited on their face, whether or not anything is posted automatically. **Policy risk: moderate. Legal (lawsuit) risk for a single personal user: very low.** The lawsuits all involved fake accounts and data resale.
- **Practical detection:** LinkedIn detects automation by behavior (request rates, headless browsers, extension fingerprinting of known tools). A passive reader with no extra requests, no auto-scroll and no clicking has a low detection likelihood [U]. Many comment-assistant extensions (LiGo, WiseReply, CommenTron) are publicly listed on the Chrome Web Store and appear to keep operating.
  - But the account at stake is Bilal's real professional identity. Even a temporary restriction would cost more than the feature is worth.
- **Lower-risk alternatives, in order:**
  1. **No extension.** Bilal copies a post's text or URL into Signal Desk (or uses the OS share sheet or a bookmarklet that only sends the URL he's on). Signal Desk drafts a comment, and he pastes it himself. Zero automation touches LinkedIn.
  2. A "send selection to Signal Desk" context-menu extension. It reads only text **he highlights**, injects nothing into the page and makes no LinkedIn requests. This is still technically "copying", but it is functionally the same as copy-paste. Low risk [interpretation].
  3. A full DOM-reading or overlay extension. Moderate risk. Avoid.
- **Comment quality:** given the 2026 suppression of generic AI comments, drafts must be specific, short and in his voice. Keep a human edit step and a low daily volume. Vendor guides suggest staying well under about 20 to 40 comments a day [S, unverified heuristics].

---

## 6. LinkedIn's own AI features that overlap (2025-2026)
| Feature | Status | Overlap with Signal Desk |
|---|---|---|
| AI post rewrite ("enhance/rewrite with AI", Premium) | **Removed Aug 2026**. Replaced by **Post Proofreader** (Premium, Sep 2026): inline tracked-change language suggestions; "as opposed to letting LinkedIn users generate something completely new" [S: SocialMediaToday 20 Sep 2026, TechCrunch] | Signal Desk's drafting stays differentiated (topic-to-draft in his voice). LinkedIn now only polishes |
| AI writing assistant for profile (headline/About), Premium | Live [S, Help a1444194 title] | Overlaps "review my profile". Ours can be deeper, using his exported Profile, Positions and Skills plus his target roles |
| AI-assisted messages (InMail and first-message drafts, Premium) | Live [S] | Not in our scope |
| AI comment suggestions | No native comment generator confirmed [U] | None |
| Job Match ("how well you match"), Jan 2025; natural-language AI job search, all members by Jun 2025 | Live [S] | Adjacent (career agent), not posts |
| Hiring Assistant (Recruiter) | Generally available in English by end of Sep 2025; v2 in 2026 [S] | Recruiter-side only |
| Creator analytics, per-post export | Live [V/S] | Our analytics import builds on this |
| Native scheduling | Live (see §7) | Overlaps our scheduler |

---

## 7. Scheduling
- **Native:** the clock icon next to "Post" in the composer, desktop and mobile. Personal posts can be scheduled from about 10 minutes up to about **3 months** ahead, and "View all scheduled posts" lists them. It supports text, image, video and, reportedly, document posts. [S: SocialMediaToday 2022 launch, Planable, Postfa.st. No LinkedIn Help page was fetched; **U** on exact limits]
- **Through the API:** there is no schedule field ("PUBLISHED is the only accepted field during creation").
  - Signal Desk stores the approved draft plus `publish_at`. A cron job (GitHub Actions, already in our stack; Vercel Hobby crons are daily-only) runs every 5 to 15 minutes, uploads media, calls `POST /rest/posts`, and saves the returned URN.
  - GitHub Actions cron can lag 5 to 30 minutes under load [U]. That is fine for LinkedIn.
  - Budget: 150 member calls a day is plenty. A multi-image post costs about 2N+1 calls.
- **Simplest zero-risk option:** Signal Desk produces the final text, the PDF and the images, and Bilal schedules natively in LinkedIn. We lose the URN, but he can paste the post URL back for analytics joining.

---

## Capability matrix

| Feature Bilal wants | Official path | Feasible for Bilal (individual, PK)? | Risk |
|---|---|---|---|
| Log in with LinkedIn / get his person URN | OIDC product (self-serve) | **Yes**, immediately | None |
| Publish text post | Share on LinkedIn, `POST /rest/posts` | **Yes** | Low. Keep a human approval click (API Terms §3.1 "automate posting") |
| Publish single image / multi-image (2-20) | Images API + Posts (multiImage) | **Yes** | Low |
| Publish PDF "carousel" | Documents API (`w_member_social`, ≤100MB, ≤300 pages) + Posts | **Yes** [V docs; U live test] | Low |
| Publish video, poll, article-link | Videos, Poll, Article content | **Yes** | Low |
| Schedule posts | Our cron + Posts API, or LinkedIn native scheduler (manual) | **Yes** | Low |
| Edit or delete a post we made | Posts PARTIAL_UPDATE / DELETE | Probably [U] | Low |
| Stay connected long term | 60-day token, re-auth | Yes, with re-auth about every 60 days | None. Refresh token unlikely [U] |
| List all his past posts via API | `r_member_social` | **No**: closed | n/a. Use Shares.csv |
| His post impressions/reactions/comments via API | `r_member_postAnalytics` (Community Mgmt) | **No** as an individual. Only with a registered business plus vetting | n/a |
| Follower count / growth via API | `r_member_profileAnalytics` (Community Mgmt) | **No** as an individual (same) | n/a |
| Post analytics without the API | Creator analytics XLSX and per-post export, uploaded to Signal Desk | **Yes** (manual, up to 365 days) | None |
| DMA portability API | `r_dma_portability_self_serve` | **No**: EU/EEA/CH only | Lying about location would be a UA violation |
| Full history (posts, comments, reactions, connections, profile) | "Get a copy of your data" ZIP, uploaded | **Yes** (manual, 10 min to 48 h) | None |
| Comment on trending posts | Bilal pastes post text or URL; we draft; **he** posts manually | **Yes** | Low if human-edited, specific and low volume. Generic AI comments get reach-limited (2026) |
| Comment via API (`w_member_social` allows it) | Possible technically | Do not | **High**: UA "bots … comment on" and automation-detection suppression |
| Discover trending posts | No API for feed or search. Use non-LinkedIn signals (our Firecrawl sources) or what Bilal pastes in | Partial | Scraping LinkedIn search or feed: **High** (UA §8.2) |
| Find people to connect with | Suggest from Connections.csv, Invitations, Comments/Reactions URLs, plus people he pastes. He clicks Connect | **Yes** (suggestions only) | Low. Auto-connect: High |
| Profile review | OIDC gives name and photo only. Use archive Profile/Positions/Skills CSVs or a pasted profile / "Save to PDF" | **Yes** (manual input) | None |
| Chrome extension reading the LinkedIn DOM | none (prohibited category) | Technically yes | **Moderate**: account restriction possible. Prefer copy-paste or a selection-only context menu |

---

## Recommended architecture (for the build plan)
1. One LinkedIn app with the OIDC and Share on LinkedIn products. Associate it with a Page Bilal owns.
2. Use `/rest/posts` with a pinned `LinkedIn-Version`, bumped yearly. Upload images, documents and video via `/rest/*`.
3. Scheduler: Supabase `scheduled_posts` table, a GitHub Actions cron every 10 minutes, and a human approval gate. Store the returned URN and permalink.
4. Analytics: XLSX upload (creator plus per-post exports) and ZIP upload (data archive). Parse, upsert and chart. Prompt him weekly to re-export.
5. Comments and networking: a paste-in workflow with no LinkedIn automation.
6. Token health: an `expires_at` banner at day 55.
7. Optional later: if Bilal registers a business, apply for Community Management Development tier for `r_member_postAnalytics` and `r_member_profileAnalytics`, on a **separate new app**.

---

## Sources
Primary (LinkedIn / Microsoft Learn):
- Share on LinkedIn: https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin
- Sign In with LinkedIn using OIDC: https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2
- Posts API: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
- Documents API: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/documents-api
- MultiImage API: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/multiimage-post-api
- Member Post Statistics: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/members/post-statistics
- Member Follower Statistics: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/members/follower-statistics
- Community Management overview: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/community-management-overview
- Community Management App Review: https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review
- Recent Marketing API changes: https://learn.microsoft.com/en-us/linkedin/marketing/integrations/recent-changes
- Restricted use cases: https://learn.microsoft.com/en-us/linkedin/marketing/restricted-use-cases
- Data storage requirements: https://learn.microsoft.com/en-us/linkedin/marketing/data-storage-requirements
- Refresh tokens: https://learn.microsoft.com/en-us/linkedin/shared/authentication/programmatic-refresh-tokens
- Member Data Portability (Member): https://learn.microsoft.com/en-us/linkedin/dma/member-data-portability/member-data-portability-member
- Member Snapshot API: https://learn.microsoft.com/en-us/linkedin/dma/member-data-portability/shared/member-snapshot-api
- Verified on LinkedIn overview: https://learn.microsoft.com/en-us/linkedin/consumer/integrations/verified-on-linkedin/overview
- API Terms of Use: https://www.linkedin.com/legal/l/api-terms-of-use
- User Agreement (eff. 3 Nov 2025): https://www.linkedin.com/legal/user-agreement
- Professional Community Policies: https://www.linkedin.com/legal/professional-community-policies
- Help, prohibited software and extensions: https://www.linkedin.com/help/linkedin/answer/a1341387
- Help, download your account data: https://www.linkedin.com/help/linkedin/answer/50191
- Help, member portability APIs: https://www.linkedin.com/help/linkedin/answer/a6214075
- Help, combined post analytics: https://www.linkedin.com/help/linkedin/answer/a701208

Secondary:
- SocialMediaToday, comment visibility limits (20 Aug 2025): https://www.socialmediatoday.com/news/linkedin-limit-visibility-of-comments-made-via-automation-tools/758207/
- SocialMediaToday, limit reach of AI content (21 May 2026): https://www.socialmediatoday.com/news/linkedin-wants-to-limit-the-reach-of-ai-generated-content/820935/
- TechCrunch, "AI slop" button (30 Jul 2026): https://techcrunch.com/2026/07/30/linkedin-adds-a-button-to-report-ai-generated-slop/
- SocialMediaToday, Post Proofreader (20 Sep 2026): https://www.socialmediatoday.com/news/linkedin-ditches-post-enhancement-launches-post-proofreader/830851/
- SocialMediaToday, native scheduling launch: https://www.socialmediatoday.com/news/LinkedIn-Launches-Native-Post-Scheduling-in-App/637428/
- Proxycurl shutdown (founder): https://nubela.co/blog/goodbye-proxycurl/
- ProAPIs lawsuit: https://securityaffairs.com/183001/security/linkedin-sues-proapis-for-15k-month-linkedin-data-scraping-scheme.html
- hiQ settlement: https://www.natlawreview.com/article/linkedin-s-data-scraping-battle-hiq-labs-ends-proposed-judgment
- Apollo/Seamless page removal: https://martech.org/a-pair-of-lead-gen-providers-have-disappeared-from-linkedin/ , https://salesmotion.io/blog/linkedin-removed-apollo-brand-page-2025-alternatives
- Posting via Posts API with w_member_social: https://www.blotato.com/blog/linkedin-posting-api , https://zernio.com/blog/linkedin-posting-api
- r_member_postAnalytics in practice: https://github.com/gitroomhq/postiz-app/issues/1680 , https://github.com/trypostit/trypost/issues/377
- Creator analytics export layout: https://www.skool.com/evyai/how-to-download-your-top-linkedin-posts-from-2025-in-a-sheet , https://github.com/obrenoalvim/linkedin-insights , https://www.lindseygamble.com/blog/linkedin-introduces-exportable-single-post-analytics
- Job Match / AI job search: https://mezha.ua/en/news/u-linkedin-shi-dopomagatime-znahoditi-robotu-za-opisom-301796/
- Hiring Assistant: https://www.socialmediatoday.com/news/linkedin-updates-its-ai-powered-hiring-bot/831837/
