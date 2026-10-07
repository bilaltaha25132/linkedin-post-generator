# B. Official LinkedIn routes to unlock more data/capability: what each takes

Research date: 2026-10-07. Subject: Bilal Taha, an individual Full Stack AI Engineer in Karachi, Pakistan, building Signal Desk (Next.js/Supabase), a personal LinkedIn growth tool.

Labels: **[V]** verified against an official or primary page fetched this session · **[S]** supported by a secondary source or strong inference · **[U]** unverified, conflicting or guessed.

> **Method note (honest):** The session's web-search budget is shared by every agent. It ran out after about 14 searches, so this pass did **not** reach the 40 searches requested. To make up for it I fetched about 35 primary pages directly: learn.microsoft.com LinkedIn docs, linkedin.com/legal, developer.linkedin.com, Postiz and Mixpost docs and issues, the n8n forum, gov.uk and Stripe. Every claim about docs or policy is [V] from those fetches. Anecdotes, pricing for Pakistan and Premium feature details are thinner and labelled to match.

---

## 0. Short answer

1. **There is exactly one official route to his own post analytics: the Community Management API (CMA).** It needs a *registered legal organization*, a business email on that organization's domain, a website with a privacy policy, and a LinkedIn Page that verifies the app. "Commercial use cases only" [V]. Individuals are excluded [V]. A sole proprietorship is **not explicitly addressed** by LinkedIn [U]; Mixpost's docs read it as "LLC, Corporations, 501(c)… not individual developers" [S].
2. **The CMA Development tier is small but enough for a one-person tool.** It allows 500 calls per app per day and 100 per member per day, with no BATCH_GET and no webhooks [V]. It still unlocks `r_member_postAnalytics` and `r_member_profileAnalytics`, because all approved CMA permissions are granted [V]. The catch: he must apply for Standard tier within 12 months or "we'll remove your API access due to inactivity" [V]. Standard tier needs a narrated screencast and test credentials [V].
3. **Even with CMA he still cannot list his own posts or read comments on his personal posts.** `r_member_social` is **closed** ("not accepting access requests… due to resource constraints") [V], and `r_member_social_feed` is "granted to select developers only" [V]. That doesn't block the analytics, because Signal Desk already gets each post's URN back when it publishes (`x-restli-id`), and that URN is all the analytics endpoint needs.
4. **There is no official MCP server, agent API, creator API or newsletter-publishing API for members as of 2026** [S]. Every "LinkedIn MCP" is third-party [S].
5. **LinkedIn's API Terms literally prohibit using the APIs "to automate posting on the LinkedIn Services"** (§3.1(26)) [V]. The safe reading for Signal Desk: he approves or schedules each post himself, and the app never posts on its own.
6. **The cheapest legal entity that probably qualifies is a Pakistani SMC-Pvt Ltd through SECP**, at about Rs 1,550 government fee online [S]. A UK Ltd is £100 online now, not £50 [V], plus a UK registered-office service. A US LLC or C-corp costs $500+ through Stripe Atlas [V]. LinkedIn's docs set no country restriction, and non-US partners such as Metricool (Spain) and mLabs (Brazil) are approved for member post analytics [S].

---

## 1. The unlock ladder

| # | Step | Cost | Time | What it unlocks | Likelihood / risk |
|---|---|---|---|---|---|
| 0 | **What he has now:** self-serve "Share on LinkedIn" + "Sign In with LinkedIn (OIDC)" | Free | Instant | `w_member_social`: post, comment and like as himself. Text, image, video, document, article, multi-image and poll posts through the Posts API [V]. Limits: 150 requests/member/day, 100k/app/day [V] | Certain [V]. Rule: no "automated posting" (§3.1(26)) [V] |
| 1 | **Native creator-analytics export** (profile → Analytics → Export) | Free | Minutes, manual | Impressions, engagements, followers and demographics as an XLSX he can import into Supabase by hand | High [S]. This is not an API, but it is LinkedIn's own feature, so it carries no ToS risk. **Best free stopgap** |
| 2 | **Create a LinkedIn Page** ("Signal Desk" or his studio name) | Free | 10 min | Nothing on its own. It is a **prerequisite** for every Marketing API application, because a Page super admin must verify the app [V] | Certain. A Page needs a company name; personal-brand Pages are allowed [S] |
| 3 | **Register a legal entity** (see §3) plus a domain email, website and privacy policy | ~Rs 1.5k–10k (SECP SMC) / £100 + ~£50–100/yr office (UK) / $500 (Atlas) | 1 day–3 weeks | Eligibility for CMA, Advertising API and Pages Data Portability | Entity creation: high. LinkedIn accepting it: medium–high if every detail matches (legal name ↔ Page ↔ domain ↔ website) [S] |
| 4 | **Apply for CMA Development tier** on a **new, empty app** (CMA can't be added to an app that already has other products [V]; it can't coexist with OIDC or Share on LinkedIn [S, Postiz #1582]) | Free | "Several days" (Mixpost) to 1–4 weeks (consultant) [S]; one secondary source says 4 weeks–4 months [S] | `r_member_postAnalytics` (per post and in aggregate: impressions, members reached, reactions, comments, reshares, saves, sends, link clicks, premium CTA clicks, followers gained, profile views from content) [V]. `r_member_profileAnalytics` (`memberFollowersCount`, lifetime and daily) [V]. Video analytics (plays, watch time, viewers) [V]. `w_member_social_feed` (comment and react as himself) [V]. Org scopes for his Page [V]. Limits: 500/app and 100/member per day, no batch, no webhooks [V] | **Medium** [U]. Rejections are per app: "create a new app" and reapply [V]. Use-case framing has to be honest and commercial, e.g. "profile management / executive management for our consultancy". A purely personal hobby framing fails the "commercial use cases only" test [V] |
| 5 | **CMA Standard tier** | Free | Weeks–months [S] | No API restrictions, webhooks for social actions | **Low–medium** for a one-user internal tool. It needs a full-integration screencast with the OAuth flow, posting, how commenters' data is shown, and test credentials [V]. "LinkedIn reserves the right… a partner might not be upgraded even if they meet these minimum requirements" [V]. Without it, access is **revoked after 12 months** [V] |
| 6 | **Advertising API** (alternative org-scope path; Postiz uses it) | Free to apply; ads spend optional | Unknown | `r_organization_social`, `w_organization_social`, `rw_organization_admin` (Page analytics), `r_1st_connections_size`, `w_member_social` [V]. **No member analytics** | Medium [U]. It also requires an "established business" [V]. Only worth it if CMA is refused and he wants Page analytics |
| 7 | **Pages Data Portability API (DMA)** | Free | "Decision in 7 business days" [V] | Read-only: his **Page's** posts, comments, reactions, analytics, newsletters and articles. Member identities appear only if each member opted in [V] | Unclear whether a non-EU Page qualifies [U]. It needs "valid business data" [V]. It covers only the Page, not his personal profile, so it is low value for him |
| 8 | **Premium Career / Business** (personal subscription) | ~$30–60/mo in the US [S]; Pakistan price unconfirmed [U] | Instant | In the UI: 365-day profile viewers, InMail credits, more search-appearance detail [S]. **No API and no export** | Certain to buy. Low value for the tool |
| 9 | **Sales Navigator Core** | $119.99/mo or $1,079.88/yr (US list price) [V] | Instant | Lead and account alerts, saved-search alerts, 50 InMails [V]. **No native CSV export**; CRM sync only on Advanced/Advanced Plus [S] | Low value. Data can't legally flow into the tool except as emailed alerts he reads himself |
| ✗ | `r_member_social`, `r_member_social_feed`, `r_full_profile` | — | — | Listing his own posts, reading comments on member posts, full profile | **Closed / restricted** [V]. Don't plan on them |

**Recommended path:** do steps 1 + 2 now, at no cost. Do 3 + 4 only if per-post analytics flowing automatically into Signal Desk is worth roughly Rs 10–20k a year plus SECP paperwork. Treat step 5 as unlikely, and design so that losing CMA after 12 months degrades to step 1, the manual export.

---

## 2. Community Management API in detail

### 2.1 What the review checks [V]

Source: [community-management-app-review](https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review).

- "At this time, our Community Management APIs are only available to **registered legal organizations for commercial use cases only**."
- He has to share a **business email address** (it gets verified, and "Personal email addresses won't pass") plus the organization's **legal name, registered address, website and privacy policy**.
- A **super admin of the organization's LinkedIn Page** must verify the app.
- The app name and logo must not include "Linked", "In" or the Microsoft name or logos.
- **Development tier** is checked for: approved use case, verified business email, verified organization, verified website and domain, and Page verification.
- **Standard tier** is checked for: approved use case, valid privacy policy, compliance with the terms and the data-storage rules, and a screencast. The screencast must be high-resolution, downloadable, preferably narrated, and cover each use case. For "Executive Management" (posting to his own profile) it must show the OAuth flow, a post, how a comment from another member is displayed, which profile fields of the commenter are shown, and any other member data used.
- If rejected, he can't reapply with the same app and must create a new one. Since 202505, requests older than 21 days get a "Reapply" button [V] ([recent changes](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/recent-changes)).
- The developer product page asks "Do you have an established business?" [V] ([product page](https://developer.linkedin.com/product-catalog/marketing/community-management-api)).

### 2.2 Tiers and limits [V]

Source: [increasing-access](https://learn.microsoft.com/en-us/linkedin/marketing/increasing-access).

- **Development:** "500 API calls for an app for 24 hrs; 100 API calls per member of an App for 24 hrs. All APIs with BATCH_GET: no API calls allowed. Webhook for Social Actions: push notifications disabled." He must "build core business use cases… within twelve (12) months."
- From the [FAQ](https://learn.microsoft.com/en-us/linkedin/marketing/lms-faq): "If you don't apply for Standard tier within twelve months, we'll remove your API access due to inactivity."
- **Standard:** "No restrictions."
- **Sizing for Signal Desk:** about 2 posts a day × 11 metrics × daily refresh, plus 1 follower call, comes to well under 100 calls a day. The Development tier is functionally enough.

### 2.3 Permissions granted on approval [V]

`r_1st_connections_size`, `r_basicprofile`, `r_organization_followers`, `r_organization_social`, `r_organization_social_feed`, `rw_organization_admin`, `w_member_social`, `w_member_social_feed`, `w_organization_social`, `w_organization_social_feed`, `r_member_profileAnalytics` (202504+), `r_member_postAnalytics` (202506+).

**Not included:** `r_member_social` (closed) and `r_member_social_feed` (select developers only).

### 2.4 What the member endpoints return [V]

- **`GET /rest/memberCreatorPostAnalytics`**
  - `q=entity` returns one post; `q=me` returns all his posts aggregated.
  - Metrics: IMPRESSION, MEMBERS_REACHED, RESHARE, REACTION, COMMENT, POST_SAVE, POST_SEND, LINK_CLICKS, PREMIUM_CTA_CLICKS, FOLLOWER_GAINED_FROM_CONTENT, PROFILE_VIEW_FROM_CONTENT. The last six arrived in 202604.
  - Aggregation is DAILY or TOTAL. DAILY isn't supported for MEMBERS_REACHED, LINK_CLICKS, FOLLOWER_GAINED or PROFILE_VIEW. "Daily impression metrics are not supported if given entity is post."
  - For `q=me`, RESHARE, REACTION and COMMENT "are not consistent with UI at the moment."
  - Values are "best-effort accurate."
  - Source: [post-statistics](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/members/post-statistics).
- **`GET /rest/memberFollowersCount`**: `q=me` returns the lifetime count; `q=dateRange` returns daily counts. Source: [follower-statistics](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/members/follower-statistics).
- **`memberCreatorVideoAnalytics`**: VIDEO_PLAY, VIDEO_WATCH_TIME, VIDEO_VIEWER [V].
- **Profile viewers and search appearances:** the permission description mentions them, but **I found no documented endpoint** that returns them [U].

### 2.5 Comments and replies on his own posts

- **Reading comments on member posts:** `r_member_social_feed` is "**Restricted**… granted to select developers only" [V] ([comments-api](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/comments-api)). So CMA most likely does **not** let him read the comment threads on his personal posts. The COMMENT *count* is available through post analytics.
  - Conflicting signal: the "Executive Management" screencast asks how comments on the member's post are displayed [V]. Read access may exist for some partners [U].
- **Writing a comment or reply as himself:**
  - Already possible with self-serve `w_member_social`, described as "Post, comment, and like posts on your behalf" [V].
  - CMA adds `w_member_social_feed` [V].
  - Nested replies need the parent `commentUrn`. He can paste it from a comment permalink [S].
  - There is a per-member short-term (1-minute) comment-creation throttle [V].
- **Listing his own posts:** `GET /rest/posts?q=author` "requires `r_member_social`", which is closed [V] ([posts-api](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api)). **Workaround:** store the post URN Signal Desk receives on publish, or let him paste URNs for posts he wrote by hand.

### 2.6 Data storage rules (apply once on CMA) [V]

Source: [data-storage-requirements](https://learn.microsoft.com/en-us/linkedin/marketing/data-storage-requirements).

- **Authenticated member's own profile and URN:** no limit.
- **Members' social activity data** (posts, comments, mentions and their content): **48 hours**.
- **Other members' profile data:** 24-hour cache only.
- **Organization Page admin and reporting data** (follower counts, summaries): **1 year**.
- **Org social activity:** 6 weeks, or 6 months if the org authenticated.
- **Member post analytics are not explicitly classed** [U].
  - Conservative reading: the counts relate to his *own* posts and he is the authenticated member, so storing aggregates is likely fine.
  - Strict reading: post content and commenter data fall under the 48h/24h rules.
  - Design implication: keep **his own post text** in Supabase, which is fine because Signal Desk generated it, not LinkedIn. Treat any **commenter names or text** as expiring within 24–48h.
- **Restricted uses** ([restricted-use-cases](https://learn.microsoft.com/en-us/linkedin/marketing/restricted-use-cases)):
  - Member data can't be used for sales, recruiting or lead generation.
  - It can't be combined with other data to build profiles.
  - It can't be exported.
  - **No social-feed display**, meaning no LinkedIn feed shown off-platform.

### 2.7 What open-source schedulers do

- **Postiz** [V]:
  - The personal provider uses `openid profile w_member_social` ([issue #1680](https://github.com/gitroomhq/postiz-app/issues/1680)).
  - The docs tell self-hosters to add Share on LinkedIn, **Advertising API** (for org scopes) and OIDC ([docs](https://docs.postiz.com/providers/linkedin)).
  - Issue #1582 notes that CMA scopes "cannot coexist with Share on LinkedIn or Sign In with LinkedIn using OpenID Connect."
  - Issue #1680 (member post analytics) has **no reports of anyone getting approved**. Self-hosters "could apply independently."
- **Mixpost** [V] ([docs](https://docs.mixpost.app/services/social/linked-in/community-management-api/)):
  - "Community Management API is only available for legal registered entities (e.g. LLC, Corporations, 501(c), etc.) and not individual developers." Individuals should use Share on LinkedIn instead.
  - Form tips: list the use cases (page management, page analytics, profile management); provide a single continuous narrated English demo video. "It may take several days to receive a response."
  - Engagement webhooks work only for Pages.
- **n8n** [S] ([forum](https://community.n8n.io/t/issue-with-linkedin-community-management-scopes/61687)): one user reports a CMA Development-tier approval and had to use generic OAuth2 to get the `rw_organization_admin` scope. Their entity type isn't stated.
- **Real solo-developer approvals for `r_member_postAnalytics`:** **none found** [U]. The vendors integrated with it are all companies, including non-US ones: Hootsuite, Buffer, Sprinklr, Metricool, Oktopost, Zoho, mLabs, SocialPilot, Later, Publer, Vista Social [S] ([destinationCRM](https://www.destinationcrm.com/Articles/CRM-News/CRM-Across-the-Wire/LinkedIn-Launches-Member-Post-Analytics-API-170402.aspx)).
- **Secondary timelines** [S]: 1–4 weeks for Development tier ([singhamandeep](https://singhamandeep.com/linkedin-community-management-api-access/)). Another source gives 4–8 weeks fast, 3–4 months typical, 6+ months slow ([Blotato](https://www.blotato.com/blog/linkedin-api-pricing)). Rejection causes it lists: unregistered applicant, a Page that doesn't match, vague use case, weak screencast, use case "too close to scraping," thin privacy policy.

---

## 3. Getting a legal entity from Pakistan

| Option | Cost | Time | Notes | LinkedIn fit |
|---|---|---|---|---|
| **FBR NTN as sole proprietor** | Free | Days | Not a separate legal entity | **Weak** [U]. LinkedIn asks for a "registered legal organization", and a sole proprietorship has no separate legal name or registration certificate. Might pass if the business name, domain and Page all match. Mixpost's reading suggests no |
| **SECP Single-Member Company (SMC-Pvt) Ltd** | Name + incorporation ~**Rs 1,550** online for paid-up capital ≤ Rs 100k [S] (figure from SECP's 2018 announcement; check the current schedule). Add annual return filing and an accountant ([SECP press release](https://www.secp.gov.pk/wp-content/uploads/2018/02/Press-Release-Feb-6-SECP-launches-single-online-procedure-for-swift-company-registration.pdf)) | ~1–3 days online [S] | Real legal entity with a certificate of incorporation. Annual compliance applies (Form A, tax return) | **Best cost-to-fit ratio** [S]. LinkedIn sets no country rule in its docs [V] |
| **UK Ltd (Companies House)** | **£100** online (raised from £50) [V] ([gov.uk](https://www.gov.uk/limited-company-formation/register-your-company)). Needs a **UK registered office**, via a formation agent at ~£20–100/yr [S]. Annual confirmation statement fee [S]. Identity verification through GOV.UK One Login is now required [V] | ~24h after identity verification [V] | Non-residents can be directors [S]. Ongoing accounts and tax filing | Good. A recognisable entity with a public register |
| **US company via Stripe Atlas** | **$500** one-time incl. first-year registered agent, then **$100/yr** agent [V] ([stripe.com/atlas](https://stripe.com/atlas)). Delaware franchise tax and annual report on top [S] | ~1–2 weeks [S] | Pakistan isn't named on the page ("175+ countries") [U]. US tax filings (5472/1120 for a foreign-owned company) carry real ongoing cost [S] | Good, but overkill for this |
| Firstbase / Doola (US LLC) | ~$300–400 + state fees [U] (not verified this session) | | | |

**Bottom line:** SECP SMC-Pvt Ltd plus a domain email, simple website, privacy policy and a matching LinkedIn Page is the cheapest credible applicant [S]. Two cautions. Registering a company only to get API access still requires a *real commercial use case*: misrepresenting a hobby as commercial risks losing access [V, the terms allow monitoring and suspension]. And Bilal works as a freelance or consulting engineer, so "internal tool for our consultancy's executive/profile management" is plausible and honest.

---

## 4. LinkedIn Pages: does a Page help?

**What a Page plus CMA or Advertising API gives** [V]:
- Post as the Page (`w_organization_social`).
- Page follower statistics, page view and click statistics, and share statistics on a rolling 12-month window: impressions, unique impressions, clicks, likes, comments, shares, engagement ([share-statistics](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/share-statistics)).
- Read comments on Page posts (`r_organization_social_feed`).
- Page reporting data can be stored for **1 year**.

**Usefulness for Bilal:** low as a growth channel [S]. Page posts reach far fewer people than personal posts, and his goal is personal-brand growth. The Page is mainly **required plumbing** for applications. It could serve as a test bed for analytics UI and for the Standard-tier screencast's "page management" use case.

**Premium Company Page:** about $99/month [U] (search budget exhausted, not verified). UI-only features (visitor insights, auto-invites, CTA); no API.

---

## 5. Other LinkedIn developer products (checked against the product catalog [V], [catalog](https://developer.linkedin.com/product-catalog))

| Product | Access | Useful for Signal Desk? |
|---|---|---|
| Sign In with LinkedIn (OIDC) | Self-serve [V] | Already used. Name, photo, email, `sub` |
| Share on LinkedIn | Self-serve [V] | Already used |
| Live Events | Listed self-serve [V] | No. Streaming only |
| Add to Profile / Plugins | Self-serve [V] | No |
| **Verified on LinkedIn** | Development tier free and automatic (app admins only, 5,000/day); Lite needs review and is free; Plus is enterprise [V] ([overview](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/verified-on-linkedin/overview)) | Marginal. Could show a "verified" badge for himself; no growth data |
| Advertising API | Application, "established business" [V] | Org scopes and Page analytics only (§1 row 6). No member analytics. Ads reporting matters only if he pays for ads |
| Events Management API | "Available to all developers as a self-serve API product on request" [V] | Only if he runs LinkedIn Events from a Page |
| Lead Sync, Conversions, Matched Audiences, Audience Insights, Media Planning | Application; the last three are restricted [V] | No (ads tooling) |
| Company Intelligence API | Closed to new applicants [V] | No |
| Data Integrations API | Partner [V] | No |
| Sales Display (SNAP) | Partner only [V] | No |
| Job Posting, Apply Connect, Recruiter System Connect, Talent Hub | ATS partners [V] | No |
| Learning API | Partner / LinkedIn Learning customers [V] | No |
| Member Data Portability (DMA) | EU/EEA members (round 1) | Not available in Pakistan |
| Pages Data Portability (DMA) | Application, business vetting, ~7 business days [V]; non-EU eligibility unclear [U] | Page data only |
| **Newsletter / article publishing API for members** | **None found.** Posts API supports "Article" as a *link share*; newsletters and articles show up only as read-only data in DMA Pages APIs [V] | No |
| **Official MCP server / agent API / "Creator API"** | **None.** "As of July 2026, LinkedIn publishes, endorses, and supports zero MCP servers" [S] ([Scalekit](https://www.scalekit.com/blog/linkedin-mcp-vs-api)); the catalog lists REST products only [V] | Wrap the official REST endpoints in his own MCP if wanted. Avoid cookie-based MCPs (they breach the User Agreement) [S] |
| New in 2025–2026 [V] | Member post, video and follower analytics (CMA). Google/Apple sign-in on the OAuth screen (Dec 2025). Rate-limit email alerts. Reapply flow. Developer Support moved to a form (Zendesk path ended 2026-06-30) | Nothing individual-friendly |

---

## 6. Premium, Sales Navigator and Recruiter Lite

| Plan | Price | Data he'd gain | Can it feed the tool? |
|---|---|---|---|
| Premium Career | ~$29.99/mo US [S]; PK pages show ~Rs 8,500 but that's an FX conversion from resellers, not official regional pricing [U] | Who viewed your profile over 365 days, InMail credits, applicant insights, AI writing help [S] | UI only. No API or export [S] |
| Premium Business | ~$59.99/mo US [S] (Pakistan price unknown [U]) | Same as Career plus company insights, unlimited people browsing [S]. Premium.linkedin.com now also lists "Premium All-in-One" [V] (price not verified) | UI only |
| Sales Navigator Core | **$119.99/mo or $1,079.88/yr** [V] ([compare-plans](https://business.linkedin.com/sales-solutions/compare-plans), US view) | 50+ search filters, lead and account alerts, saved searches, 50 InMails/mo, Account/Lead IQ [V] | **No native CSV export** [S] ([Cleverly 2026](https://www.cleverly.co/blog/export-leads-from-linkedin-sales-navigator)). Third-party exporters breach the ToS. Email alerts reach his inbox, but pulling that member data into a pipeline conflicts with the anti-scraping and anti-combining spirit [S] |
| Sales Navigator Advanced / Advanced Plus | $159.99/mo+ / custom [V] | Buyer intent, CRM sync (Plus: real-time) [V] | CRM sync only into Salesforce, HubSpot or Dynamics [V]. Not Supabase |
| Recruiter Lite | ~$170/mo [U] | Recruiting search and InMail | Irrelevant, and member data can't be used for recruiting in third-party tools anyway |

**Verdict:** none of these offers a *programmatic* data path, so none is worth buying for Signal Desk. If he wants to see who is engaging, Premium Career is the cheapest way to look at it manually.

---

## 7. Rate limits and the meaning of "automate posting"

**Rate limits** [V] ([rate-limits](https://learn.microsoft.com/en-us/linkedin/shared/api-guide/concepts/rate-limits)):
- Limits are per app and per member per 24h, reset at midnight UTC. Exceeding them returns a 429.
- Standard limits aren't published. Each endpoint's limit shows in the Developer Portal → Analytics tab after the first call.
- Admins get an email alert at 75% of the app-level limit.
- Share on LinkedIn: 150 requests/member/day and 100,000/app/day.
- CMA Development tier: 500/app and 100/member per day.

**API Terms of Use** (last updated 2022-12-13) [V] ([api-terms](https://www.linkedin.com/legal/l/api-terms-of-use)):
- §3.1(26) prohibits: "Use the Content or the APIs to **automate posting** on the LinkedIn Services."
- §3.1(20) prohibits: "Try to exceed or circumvent limitations… This includes **creating multiple Applications**." So he must not spin up extra apps to multiply quotas.
- §3.1(24) prohibits scraping, crawling and spidering.
- §4.1 says don't store Content beyond what's permitted.
- §1.4: the Self-Serve program is for apps that help Members "be more productive" and are "NOT expected to have more than 100,000 lifetime Users."

**How LinkedIn applies "automate posting"** [S], read from the terms together with LinkedIn's approved partners:
- Schedulers like Buffer, Hootsuite and Later are approved partners, and they publish posts a person wrote or approved, at a time that person picked. That is allowed.
- What's prohibited is the app deciding to post with no per-post human action: bots, auto-generated content pushed straight from a feed, mass or repetitive posting.

**Signal Desk design rule** [S]:
- Every publish must trace back to Bilal's explicit approval of that exact text.
- A scheduled post he approved is fine. An "autopilot" mode that drafts and publishes without review is not.
- Keep an audit row with approved_at, approved_by and the content hash, so he can show human review if questioned.

**Marketing API Terms** [V] ([marketing-api-terms](https://www.linkedin.com/legal/l/marketing-api-terms)):
- No access "unless approved by LinkedIn."
- Member data may not be exported or transferred to third parties, used for ads, sales or recruiting, or pooled from multiple unaffiliated accounts.
- Data must be deleted within 10 days or less on request or termination.
- LinkedIn can monitor and suspend access at any time.

---

## 8. Implications for Signal Desk (actionable)

1. **Now, free:**
   - Keep the self-serve publish flow.
   - Persist `x-restli-id` post URNs.
   - Add an **XLSX import** for LinkedIn's native analytics export. This covers most of the post-analytics value with no approval needed.
2. **Optional upgrade (~Rs 10–20k/yr + paperwork):**
   - Register an SECP SMC-Pvt Ltd.
   - Set up a domain email, website and privacy policy, and create the LinkedIn Page.
   - Create a **new app**, separate from the current one because CMA can't coexist with OIDC or Share, and apply for CMA Development tier with an honest consultancy "profile/executive management" use case.
   - If approved, build `memberCreatorPostAnalytics` and `memberFollowersCount` pulls within 100 calls a day, and use `r_basicprofile` instead of OIDC on that app.
3. **Plan for expiry:** without Standard tier, CMA ends after 12 months. Keep the XLSX import path as the fallback.
4. **Don't chase:** `r_member_social`, reading comment threads, newsletters by API, Sales Navigator data, MCP "official" servers (none exist), or cookie-based tools.

---

## Sources

**LinkedIn / Microsoft Learn (official)**
- Community Management App Review: https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review
- Increasing Access (tiers, permissions, limits): https://learn.microsoft.com/en-us/linkedin/marketing/increasing-access
- Marketing API FAQ (r_member_social closed, 12-month rule): https://learn.microsoft.com/en-us/linkedin/marketing/lms-faq
- Quick Start: https://learn.microsoft.com/en-us/linkedin/marketing/quick-start
- Community Management Overview (FAQ #3/#4/#6): https://learn.microsoft.com/en-us/linkedin/marketing/community-management/community-management-overview
- Member Post Statistics: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/members/post-statistics
- Member Follower Statistics: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/members/follower-statistics
- Comments API: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/comments-api
- Posts API: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
- Organization Share Statistics: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/share-statistics
- Data Storage Requirements: https://learn.microsoft.com/en-us/linkedin/marketing/data-storage-requirements
- Restricted Use Cases: https://learn.microsoft.com/en-us/linkedin/marketing/restricted-use-cases
- Recent Changes: https://learn.microsoft.com/en-us/linkedin/marketing/integrations/recent-changes
- Advertising getting started: https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads/getting-started
- Share on LinkedIn: https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin
- Rate limits: https://learn.microsoft.com/en-us/linkedin/shared/api-guide/concepts/rate-limits
- Verified on LinkedIn: https://learn.microsoft.com/en-us/linkedin/consumer/integrations/verified-on-linkedin/overview
- DMA hub: https://learn.microsoft.com/en-us/linkedin/dma/
- Pages Data Portability: https://learn.microsoft.com/en-us/linkedin/dma/pages-data-portability/pages-data-portability-overview
- Product catalog: https://developer.linkedin.com/product-catalog
- CMA product page: https://developer.linkedin.com/product-catalog/marketing/community-management-api
- Advertising API product page: https://developer.linkedin.com/product-catalog/marketing/advertising-api
- API Terms of Use: https://www.linkedin.com/legal/l/api-terms-of-use
- Marketing API Terms: https://www.linkedin.com/legal/l/marketing-api-terms
- Sales Navigator plans: https://business.linkedin.com/sales-solutions/compare-plans
- Premium: https://premium.linkedin.com/

**Open-source / community**
- Postiz #1680 (member analytics): https://github.com/gitroomhq/postiz-app/issues/1680
- Postiz #1582 (scope conflict): https://github.com/gitroomhq/postiz-app/issues/1582
- Postiz LinkedIn docs: https://docs.postiz.com/providers/linkedin
- Mixpost CMA guide: https://docs.mixpost.app/services/social/linked-in/community-management-api/
- n8n forum CMA scopes: https://community.n8n.io/t/issue-with-linkedin-community-management-scopes/61687

**Secondary**
- destinationCRM, Member Post Analytics launch: https://www.destinationcrm.com/Articles/CRM-News/CRM-Across-the-Wire/LinkedIn-Launches-Member-Post-Analytics-API-170402.aspx
- singhamandeep CMA guide: https://singhamandeep.com/linkedin-community-management-api-access/
- Blotato LinkedIn API pricing: https://www.blotato.com/blog/linkedin-api-pricing
- Scalekit, LinkedIn MCP vs API: https://www.scalekit.com/blog/linkedin-mcp-vs-api
- Cleverly, Sales Navigator export: https://www.cleverly.co/blog/export-leads-from-linkedin-sales-navigator
- gov.uk company registration: https://www.gov.uk/limited-company-formation/register-your-company
- Stripe Atlas: https://stripe.com/atlas
- SECP online registration press release (2018): https://www.secp.gov.pk/wp-content/uploads/2018/02/Press-Release-Feb-6-SECP-launches-single-online-procedure-for-swift-company-registration.pdf
- Pakistan Premium pricing (reseller, low quality): https://allpremiumtools.com/linkedin-premium-price-in-pakistan/
