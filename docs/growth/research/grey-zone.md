# C. LinkedIn grey-zone data access: landscape and risk assessment

Prepared 2026-10-07 for Bilal Taha (individual AI engineer, Karachi) / Signal Desk.

**Scope and policy.** This is a risk landscape, not a how-to. It documents what exists, what it does, and what has happened to the people who used or sold it, so Bilal can choose with his eyes open. It deliberately contains **no** instructions for evading authentication, bot detection, rate limits, or for using proxies, fake accounts or someone else's cookies.

**Labels.** [V] verified in this session from a primary or first-party source (LinkedIn's own pages and robots.txt, court/official docs, vendor's own site, GitHub API). [S] supported by secondary sources (law-firm alerts, press, vendor blogs about competitors) or by well-established background knowledge, but not re-verified against a primary source today. [U] unverified, conflicting, or inferred. Treat it as a lead, not a fact.

**Method caveat (important).** The session-wide WebSearch budget ran out after 8 searches, well short of the 40 requested. The rest of the evidence comes from about 55 direct fetches of primary pages: LinkedIn's robots.txt (downloaded in full, 4,862 lines), LinkedIn's User Agreement and help pages, logged-out LinkedIn surfaces, vendor pricing and docs pages, the GitHub API, Wikipedia and law-firm alerts. Gaps that came from the search limit are marked [U], mainly agentic-browser policy statements, the details of X Corp v. Bright Data, and Amazon v. Perplexity.

---

## 0. Bottom line

1. **What has actually been sued is the industrial model: fake accounts plus resale of logged-in data.** hiQ (2017-2022), Proxycurl/Nubela (Jan 2025 to July 2025 shutdown) and ProAPIs (Oct 2025 to consent judgment Sept 2026) were all businesses scraping at scale, and the last two used hundreds of thousands to millions of fake accounts. No reported case involves LinkedIn suing an individual for reading his own feed. For an individual, the realistic sanction is **account restriction**: losing his LinkedIn presence, which is the asset Signal Desk exists to grow. [V/S]
2. **Logged-in automation on his own account is clearly prohibited by the User Agreement (UA)**, including "browser plugins and add-ons". LinkedIn restricts accounts for it as a matter of routine. In 2026 LinkedIn has also been reported to fingerprint installed extensions (BrowserGate, 6,000+ extension IDs). Account risk is the dominant risk here, not legal risk. [V]
3. **Logged-out public data has the strongest legal footing in the US** (hiQ on the CFAA; Meta v. Bright Data on contract). But LinkedIn's robots.txt ends with `User-agent: * / Disallow: /` and explicitly disallows `Claude-User`, `ChatGPT-User`, `GPTBot`, `PerplexityBot` and others. Robots.txt is not law, but ignoring it weakens any "good faith" position and can conflict with the UA if the operator is also a member. [V]
4. **Buying from third-party vendors moves the scraping risk onto the vendor** but leaves Bilal with (a) vendor-continuity risk (Proxycurl died overnight), (b) data-protection exposure if he stores other people's personal data, and (c) for cookie or "linked account" vendors such as Unipile and PhantomBuster, the full account-restriction risk on his own account. [V/S]
5. **Recommendation for Bilal:** stay with official and own-data channels (LinkedIn data export, native post analytics export, the Share API for posting), manual or human-in-the-loop reading of his feed, and LinkedIn's own public logged-out pages only as links a human opens. Do not wire any cookie-based tool or any scraper into Signal Desk's cron. If he insists on one grey option, the least-bad is a small, occasional, logged-out third-party actor on public posts by named public figures, with no storage of reactor or commenter identities. Even that is a UA/robots conflict, and it should be his decision, not a default.

---

## 1. Third-party vendors ("unified APIs", scrapers, data brokers)

Key architectural split: **(A) linked-account/cookie model.** The vendor drives *your* LinkedIn session, so *your* account carries the risk. **(B) vendor-infrastructure model.** The vendor scrapes logged-out or with its own accounts and sells you the output; *the vendor* carries the scraping risk, *you* carry continuity and data-protection risk. **(C) licensed/aggregated datasets.** Bulk "public data" profiles, mostly profiles and jobs, increasingly posts.

| Vendor | Model | LinkedIn data | Price / free tier | Incidents / notes |
|---|---|---|---|---|
| **Unipile** | A: you connect your account by username/password or cookie through hosted auth [V] | Posts (create/list), comments, reactions, post search, profiles, messaging, invitations, InMail [V] | €49/mo minimum for up to 10 accounts, then about €5 per account (falling to €3); 7-day free trial, no card [V] | Its own docs warn that exceeding limits returns 429/500 and recommend ~100 profile fetches/day and ≤100 other actions/day [V]. It markets itself as the "account-based" model that avoided Proxycurl's fate [V], but your account bears the UA risk (UA bans "unauthorized automated methods") [V]. No vendor lawsuit found [U: search budget]. |
| **PhantomBuster** | A: uses your stored LinkedIn session cookie [S] | Profile/activity extractors, post likers/commenters, Sales Navigator exports, outreach [S] | 14-day trial (2 execution hours), then a free plan with 30 min/mo; paid $69-$439/mo [S] | Reviews document LinkedIn warnings even below the vendor's suggested limits (a warning after 50 enrichments) [S]. A widely repeated "15-45% of automation users restricted within 6 months" figure traces to a vendor blog (GigRadar), not LinkedIn: treat as [U]. |
| **Apify "HarvestAPI" actors** (profile posts, post comments, post reactions) | B: advertised as "No cookies or account required" [V] | Posts with text, media and engagement counts; comments with up to 5 nested replies; reactions; author info [V] | About $1.50-2 per 1k results, pay-per-event; Apify free plan gives $5/mo credit, no card [V] | Disclaimer "not affiliated with… LinkedIn" [V]. *How* it gets reactions and comments without an account is not disclosed. Reactor lists are normally login-gated (see §4), so the infrastructure may involve accounts the vendor controls [U]. That is the exact pattern LinkedIn sued ProAPIs over, so there is continuity risk. |
| **Bright Data** (LinkedIn datasets plus scraper APIs) | B/C: logged-out public scraping [S] | Profiles, companies, jobs, posts (dataset and scraper) [S]; product pages would not load (ECONNRESET) [U] | Per-record pricing; free trial credits [S] | Won Meta v. Bright Data (Jan 2024) and X Corp v. Bright Data (dismissed May 2024) on logged-off public scraping [V/S]. No LinkedIn suit against Bright Data found [U]. |
| **Coresignal** | C | 907M+ employee profiles, 70M companies, 482M job postings, **"Social Posts: company and employee posts (new offering)"** [V] | API free 7-day trial with 2,000 credits; $49-5,000/mo; datasets from $1,000/mo [V] | Claims "only publicly available" data, no logged-in scraping, and EWDCI certification [V]. |
| **People Data Labs** | C | Profile fields including linkedin_url, job history. Posts not confirmed [U] | Free tier exists (historically ~100 lookups/mo) [S]; pricing page did not render [U] | No incidents found [U]. |
| **Crustdata** | B/C | People/company search, **Posts API**, Jobs API, real-time "signals" (job changes) [V] | "Free sandbox key"; pricing by demo [V] | Claims it indexes the public web [V]. |
| **Proxycurl (Nubela)**, now dead | B with fake accounts (alleged) | Profiles and more | n/a | LinkedIn sued in Jan 2025 and Proxycurl shut down on 4 July 2025. The founder says "~50% of revenue came from scraping LinkedIn," settled, and wound down rather than "pass legal liability to customers"; a permanent injunction followed [V]. Successor is **NinjaPear**, which does "no LinkedIn scraping" and uses public-web sources [V]. |
| **Enrich Layer** | B/C | People, company and jobs records with LinkedIn-style job history, skills and contacts [V] | Pay-as-you-go $10-1,000 (1-46k credits); subscriptions $588-22,788/yr [V] | Search snippets called it Nubela's relaunch; the founder's own posts name only NinjaPear. The relationship is **[U]**. Treat it as a Proxycurl-style API with the same risk class. |
| **RapidAPI "Fresh LinkedIn Profile Data"** | B | Profile, posts, comments, reactions endpoints; free tier exists [S] (page rendered poorly) | Freemium [S] | Third-party marketplace API: the same continuity risk as Proxycurl. |
| **ScrapIn** | B | "Real-time" B2B/LinkedIn data [V] | $30 paid 7-day trial; pay-as-you-go from $500 [V] | No free tier [V]. |
| **Lix (lix-it)** | A: Chrome extension on your account [S] | Search exports to CSV, emails; API [V] | Free 50 credits/mo; API $49 per 500 credits, 10 free trial credits [V] | Extension-on-own-account, the category BrowserGate says LinkedIn scans for [S]. |
| **Evaboot** | A: extension on your Sales Navigator account [V] | Sales Navigator lead exports plus emails [V] | $29-99/mo [V]; requires a paid Sales Navigator subscription [V] | Not relevant to posts. |
| **Clay** | Aggregator over many providers; some LinkedIn enrichments [S] | Person/company enrichment; post data through providers [S] | Free tier with limited credits [S] | Docs URL now 404 [U]. |
| **Relevance AI LinkedIn tools** | Wraps third-party providers [S] | Profile/post lookups [S] | Credits [S] | Not verified [U]. |
| **HeyReach** (context: automation vendor) | A | Outreach | — | **25 Mar 2026: LinkedIn removed HeyReach's company page and restricted the profiles of its CEO, CTO, CRO and CMO** without notice. The vendor says customer accounts were not affected [V, vendor's own blog]. Shows LinkedIn now targets vendors' own presence. |
| **ProAPIs** (context) | Fake-account farm (alleged) | Profiles, posts, reactions, comments | Up to $15k/mo [S] | Sued 2 Oct 2025 (N.D. Cal., 5:25-cv-08393). Settlement in principle Feb 2026; **final consent judgment Sept 2026**: permanent bar on access via fake accounts, bots or circumvention, plus certified destruction of data and code [S]. The date is reported as 16 or 21 Sept 2026 [U on exact date]; Judge P. Casey Pitts per one source [U]. |

---

## 2. Open-source libraries

| Library | How it works | Status (checked 2026-10-07) | Risk evidence |
|---|---|---|---|
| **tomquirk/linkedin-api** (Voyager) | Logs in as you and calls LinkedIn's internal `/voyager/api` | **GitHub repo returns 404 (gone or private) [V via GitHub API]**. Last PyPI release 2.3.1 on 7 Nov 2024 [V]. Reason for removal unknown; no DMCA notice found [U] | README warned it "might violate LinkedIn's Terms of Service" [V]. robots.txt explicitly disallows `/voyager/api` [V]. Historic issue threads reported challenges and restrictions [S]. |
| **joeyism/linkedin_scraper** | Browser automation (v3.0 rewritten to Playwright), requires login | Active; last push 10 Apr 2026; ~4.6k stars [V] | "Educational purposes only" disclaimer [V]. |
| **cullenwatson/StaffSpy** | Logged-in; staff lists, profiles, **post comments**, connections export | Not archived; last push 17 Jun 2025, so likely stale against 2026 LinkedIn changes [V/U] | FAQ: account ban "is a possibility, although there are no recorded incidents"; it stops when rate-limited [V]. |

**LinkedIn's anti-automation measures (high level, no evasion detail).**
- The UA (effective 3 Nov 2025) bans software, scripts, crawlers and "browser plugins and add-ons" that scrape or copy the Services, bots that access the Services or engage with posts, copying information obtained "directly or through third parties (such as… data aggregators)", and circumventing "access controls or use limits" [V].
- Help article a1340567: "we don't allow the use of third-party software or browser extensions that scrape, modify the appearance of, or automate activity," which may also be "a violation of privacy legislation". Restricted accounts are re-enabled after the tool is disabled, per the notice [V]. Escalation as commonly reported: warnings, CAPTCHA or re-login, ID verification, temporary restriction, permanent ban [S].
- **Extension fingerprinting**: Fairlinked e.V.'s "BrowserGate" report (Feb-Apr 2026) says LinkedIn's page script probes for installed extensions. The list reportedly grew from ~461 (2024) to 6,000+ (2026) and covers sales tools and job-search extensions [V that the report says this; the technical claim itself is S]. Lawsuits that followed were reportedly dismissed on 8 Sept 2026 for lack of demonstrated harm [U].
- Fake-account scale (Community Report, Jul-Dec 2025): 99.7% of fake accounts were stopped proactively, before any member report [V]. Secondary sources put it at 88.9M blocked at registration and 24.4M restricted proactively [S].
- Verification push: 115M+ verified members by Sept 2026 [S]. This makes "unusual activity" escalation into ID checks easier to impose.
- Reported frequency of restriction for automation users: no LinkedIn-published number exists. Vendor-blog figures (15-45% within 6 months) are not reliable [U].

---

## 3. Legal landscape

| Matter | Outcome | Relevance |
|---|---|---|
| **hiQ v. LinkedIn** (N.D. Cal. / 9th Cir., 2017-2022) | The 9th Circuit (2019, reaffirmed 2022 after *Van Buren*) held that scraping *public* pages is likely not "without authorization" under the CFAA. **But Nov 2022: LinkedIn won summary judgment on breach of contract** (the UA bans scraping; hiQ also used "turkers" with fake profiles). **Dec 2022 consent judgment: $500k, permanent injunction, deletion of code and data.** The CFAA stipulations have no precedential value [V/S]. | The CFAA is weak against public scraping. **Contract (the UA) is strong against anyone who is a member, or who acts through members.** |
| **Meta v. Bright Data** (N.D. Cal., Judge Chen, 23 Jan 2024) | Summary judgment for Bright Data: Meta's terms govern "use" by logged-in account holders, and **logged-off scraping of public data is not a breach**. CAPTCHAs ≠ login gate; a survival clause cannot bind post-termination scraping [V/S]. Meta later dropped the remaining claims [S]. | Strongest authority for *logged-out* collection, but it turns on Meta's wording. LinkedIn's UA is drafted differently and can be rewritten [S]. |
| **X Corp v. Bright Data** (N.D. Cal., Judge Alsup) | Dismissed May 2024: claims were preempted or not viable; the judge warned against "information monopolies" [S]. Later amendment or appeal status [U]. | Same direction as Meta. |
| **LinkedIn v. Nubela/Proxycurl** (filed Jan 2025) | Settled; permanent injunction; service shut down 4 Jul 2025 [V]. | Vendor risk: customers lost their API overnight. |
| **LinkedIn v. ProAPIs** (filed 2 Oct 2025, N.D. Cal. 5:25-cv-08393) | Settlement in principle Feb 2026 [V]; final consent judgment Sept 2026 with permanent ban and data/code destruction [S]. | Confirms LinkedIn's litigation targets: fake accounts plus resale, including **posts, reactions and comments**. |
| **HeyReach page removal** (Mar 2026) | Platform enforcement, not litigation [V]. | LinkedIn punishes automation vendors' own member accounts. |
| **Amazon v. Perplexity** (Comet agent shopping, filed ~Nov 2025) | Reported CFAA/computer-fraud claims against an AI browser agent acting in a user's logged-in session [U: not verified this session]. | The first test of "the user authorized my agent" versus "the platform did not." Watch it. |
| **2026 rulings on public scraping generally** | None verified beyond the above [U]. | — |

**Contract vs public data.** If you are a LinkedIn member and you automate *while logged in*, you are bound by the UA. Breach of contract is then easy for LinkedIn to establish, as hiQ shows, and account termination needs no court at all. Logged-out collection of genuinely public pages is on much firmer US legal ground (Meta, X). Even then LinkedIn's robots.txt and Crawling Terms say permission is required [V], and if the operator is also a member LinkedIn can argue the UA follows him [S].

**EU/GDPR.** Posts, reactor lists and commenter identities are personal data. Scraping public LinkedIn data is not exempt from GDPR: the CNIL fined **Kaspr €240k (Dec 2024)** for a Chrome extension that harvested LinkedIn contact details [S; the CNIL page URL 404'd]. Bilal is not in the EU, but GDPR applies if he monitors the behaviour of EU residents (Art. 3(2)(b)) [S]. Storing a list of who engaged, including EU people, would be "monitoring." **DMA**: LinkedIn's official Member Data Portability API (posts, comments, reactions, both snapshot and 28-day changelog) exists **only for EEA/Swiss members**, so Bilal in Pakistan cannot use it [V].

**Pakistan.** PECA 2016 criminalises unauthorised access to information systems or data (s.3 and following), and the 2025 amendments focus on "false information" [S]. There is no reported PECA prosecution for scraping a foreign site. Practical risk is negligible, but logging in with someone else's credentials or cookies would map onto "unauthorised access" [S/U]. Pakistan's Personal Data Protection Bill was still not enacted as of the last check [U].

**Realistic risk for Bilal.**
- *Own account, own feed, any automation:* legal risk is very low, since there is no case law against an individual reading his own feed. **Account risk is medium to high** and grows with volume. The downside is losing the LinkedIn presence he is trying to grow.
- *Buying third-party data:* personal legal risk is low; the vendor is the defendant. Continuity risk is high (Proxycurl). There is a GDPR/ethics question if he stores engagers' identities. If the vendor uses *his* account (Unipile, PhantomBuster, Lix), the account risk is the same as automating it himself.
- *Fake accounts, others' cookies, circumvention:* this is the exact conduct in every LinkedIn win. Out of scope; do not do it.

---

## 4. LinkedIn's public, logged-out surfaces

robots.txt facts [V, downloaded 2026-10-07]:
- Header: "The use of robots or other automated means to access LinkedIn without the express permission of LinkedIn is strictly prohibited." Permission is requested at whitelist-crawl@linkedin.com, subject to the Crawling Terms, which limit use to "search indexing for display in a publicly available search engine," with no resale and no bulk transfer [V].
- **`User-agent: *` → `Disallow: /`** (everything, for any unnamed bot) [V].
- Explicit full blocks for AI agents and crawlers: `Google-Extended`, `anthropic-ai`, `ClaudeBot`, `Claude-Web`, **`Claude-User`**, **`ChatGPT-User`**, `GPTBot`, `PerplexityBot`, **`Perplexity-User`**, `cohere-ai`, `Meta-ExternalAgent/Fetcher`, `CCBot`, `Diffbot`, `Bytespider`, **`Scrapy`** and others [V]. `Claude-SearchBot` and `OAI-SearchBot` get search-engine-style partial access [V].
- Search engines (e.g. Googlebot) may crawl most public pages (`/in/`, `/posts/`, `/pulse/`, `/company/`, `/top-content/` are *not* disallowed) but are disallowed from `/feed/update/`, `/embed/feed/update/`, `/voyager/api`, `/search*`, `/groups/`, `/jobs-guest/`, `/organization-guest/`, `/topic/`, `/newsArticle*`, `/learning/...` (several), `/analytics/` [V].

| Surface | Logged-out? | What's there | Freshness | robots (generic bot) | ToS |
|---|---|---|---|---|---|
| Public post page `/posts/<slug>-activity-<id>` | **Yes** [V] | Full text, author, reaction and comment counts, some top comments [V] | As fresh as the post | Disallowed (`*`); allowed for Googlebot | UA bars scraping/copying; fine for a human to open |
| Embed iframe `/embed/feed/update/urn:li:share:…` | Works for real posts; a test ID 404'd [V] | Post render | Live | Disallowed even for Googlebot [V] | Intended for display embedding, not harvesting |
| Public profile `/in/<handle>` | **Yes, partial**, with "Join to view profile" walls [V] | Headline, about, **an "Activity" section with recent posts (6 days to 2 months old for Nadella)** [V] | Recent but partial | Disallowed (`*`) | Same |
| `/in/<handle>/recent-activity/all/` | **No**, authwall [V] | — | — | — | — |
| Company `/company/<x>/posts/` | Could not confirm, the page returned only chrome [U] | — | — | Disallowed (`*`) | — |
| Hashtag feed `/feed/hashtag/<tag>/` | **No**, login wall [V] | — | — | `/feed/` paths disallowed | — |
| **Top Content** `/top-content/` (and `/pulse/topics/…` now leads there) | **Yes** [V] | 43 topic categories, each with subtopics. Each subtopic page lists ~10 curated posts with author, follower count, full text, engagement and `/posts/` links [V] | **Stale-ish**: hub posts 3 weeks to 5 months old; a subtopic (AI agent features) 7 months to 1 year old [V] | Not disallowed for search engines; disallowed for `*` | SEO surface; a human browsing is fine |
| Pulse articles `/pulse/<slug>` and newsletters | Article pages are public [S] | Long-form articles | Live | Allowed for search engines; disallowed for `*` | — |
| Newsletter RSS | **No native RSS** [S]; `/newsletters/` 404'd [V] | — | — | — | — |
| LinkedIn News (`/news/` → `/today` → redirects to a Talent Solutions marketing page) | Not a usable logged-out surface now [V] | — | — | `/newsArticle*` disallowed | — |
| LinkedIn Learning | Course landing pages public; much is disallowed [V] | — | — | Many `/learning/*` disallowed | — |
| Member Data Portability API (DMA) | Official, OAuth | Own posts, comments, reactions, snapshot plus 28-day changelog [V] | Near-live | n/a | **EEA/Swiss members only**, so not available to Bilal [V] |

**Takeaway.** The logged-out surfaces are mostly SEO previews: Top Content plus public post and profile pages. They are useful for *a human* to click from Signal Desk. They are a poor and stale feed of "fresh posts by people I follow," because that requires login. Fetching them with a bot conflicts with robots.txt (`*` and every AI-agent UA are blocked).

---

## 5. Browser-side, user-driven options

| Option | What it is | Risk evidence |
|---|---|---|
| **Fully manual** (Bilal reads, copies a post URL or text into Signal Desk) | Human use | No risk. This is ordinary use. |
| **Native exports** (Settings → *Get a copy of your data*; post-analytics export in the creator dashboard) | Official | No risk. Covers his own shares, comments, reactions and analytics, not other people's feeds [S]. |
| **AI browser agent reading his feed in his session while he watches** (Claude in Chrome, Comet, Atlas) | An agent drives his real logged-in browser | The UA's ban on "bots or other unauthorized automated methods to access the Services" and on "browser plugins and add-ons" that scrape has no carve-out for user-supervised agents [V]. robots.txt blocks `Claude-User`, `ChatGPT-User` and `Perplexity-User`, the user-initiated agent UAs [V]. That signals LinkedIn's stance even though robots.txt mainly binds crawlers. No LinkedIn public statement specifically on agentic browsers was found [U: search budget]. BrowserGate suggests extension presence is detectable [S]. Assessment: **low-to-medium account risk at a human pace with occasional use; it rises with frequency and with any scheduled or unattended runs.** Legal risk is low; Amazon v. Perplexity is the case to watch [U]. |
| **DOM-reading or "save post" extensions** (Lix, Kaspr, AuthoredUp-style tools) | Extension on his account | Explicitly named in the UA ("browser plugins and add-ons") [V]. Reported extension scanning [S]. CNIL fined Kaspr under GDPR [S]. Account restrictions are lifted once the tool is disabled, per LinkedIn help [V], so this is usually recoverable at first offence. |
| **Headless or scheduled automation on his session** (Playwright with his cookies, StaffSpy, the old linkedin-api) | Bot | Squarely prohibited. robots.txt blocks `/voyager/api` [V]. The highest account risk of any option that uses his real account. |

---

## 6. Risk matrix

Account risk is the risk to Bilal's own LinkedIn account. Legal risk is realistic exposure *for an individual in Pakistan*, not theoretical maximums.

| # | Option | Data gained | Account risk | Legal risk | Cost | Verdict for Bilal |
|---|---|---|---|---|---|---|
| 1 | Manual reading plus pasting URLs/text into Signal Desk | Anything he sees | None | None | Free | **Do. This is the baseline.** |
| 2 | Native data export plus post-analytics export (own data) | Own posts, comments, reactions, impressions/engagement | None | None | Free | **Do.** Build an importer for the export files. |
| 3 | Official APIs (Share on LinkedIn to post; DMA portability is EEA-only) | Posting only, for him | None | None | Free | **Do (posting).** DMA is not available. |
| 4 | Links to logged-out public pages (Top Content, /posts/, /in/) for a human to open | Curated, mostly stale top posts | None | None | Free | **OK as links.** Do not crawl. |
| 5 | Bot-fetching logged-out public pages (own code) | Public post text and counts, stale Top Content | None (logged out) | Low (Meta/X/hiQ precedent), but it violates robots.txt and Crawling Terms; UA arguable since he is a member | Free | **Avoid.** Poor data for the policy cost. |
| 6 | Vendor B, no-cookie actors (Apify HarvestAPI, RapidAPI, Enrich Layer, ScrapIn, Crustdata posts) | Posts by named people, comments, reactions | None directly | Low for him; vendor is exposed (Proxycurl/ProAPIs pattern); GDPR if he stores EU engagers | $0-5/mo on the Apify free tier; others $30-500+ | **Grey.** Acceptable only for small, occasional pulls of public figures' posts, with no stored reactor identities and an expectation that the vendor may vanish. |
| 7 | Vendor C, licensed datasets (Coresignal, PDL, Bright Data datasets) | Profiles, jobs, some posts, in bulk | None | Low | Trials; then $49-1,000+/mo | **Overkill** for a personal tool. |
| 8 | Vendor A, linked-account APIs (Unipile, PhantomBuster) | Feed-like data, his post analytics, engagers | **Medium-High** (his account drives the automation) | Low | €49/mo minimum (Unipile); $69+/mo (PB) | **Not recommended.** Pays to put his main asset at risk. |
| 9 | Data extensions on his account (Lix, Evaboot, etc.) | Exports, contacts | **Medium** (scanned; named in the UA) | Low (GDPR if EU data) | Free-$99/mo | **Not recommended.** |
| 10 | AI browser agent in his session, supervised, human pace | Feed reading, summaries | **Low-Medium** | Low | Free-ish | **Possible as an ad-hoc assistant**, never on a schedule. His informed call. |
| 11 | Open-source logged-in libraries or headless automation with his cookie | Feed, engagers, analytics | **High** | Low-Med (UA breach) | Free | **Do not build.** |
| 12 | Fake accounts, someone else's cookies, circumvention | Everything | n/a | **High** (every LinkedIn lawsuit win) | — | **Out of scope; refuse.** |

---

## Sources

Primary / first-party
- LinkedIn robots.txt (downloaded 2026-10-07): https://www.linkedin.com/robots.txt
- LinkedIn Crawling Terms: https://www.linkedin.com/legal/crawling-terms
- LinkedIn User Agreement (eff. 3 Nov 2025): https://www.linkedin.com/legal/user-agreement
- LinkedIn Help, prohibited software and extensions: https://www.linkedin.com/help/linkedin/answer/a1341387
- LinkedIn Help, automated activity restriction: https://www.linkedin.com/help/linkedin/answer/a1340567
- LinkedIn Community Report: https://about.linkedin.com/transparency/community-report
- LinkedIn Top Content: https://www.linkedin.com/top-content/ ; https://www.linkedin.com/top-content/artificial-intelligence/ ; https://www.linkedin.com/top-content/artificial-intelligence/ai-agent-features/
- Public post example: https://www.linkedin.com/posts/satyanadella_any-pursuit-of-superintelligence-has-to-be-activity-7504986609365352448-n718
- Public profile and authwalled activity: https://www.linkedin.com/in/satyanadella/ ; https://www.linkedin.com/in/satyanadella/recent-activity/all/
- Hashtag feed (login wall): https://www.linkedin.com/feed/hashtag/artificialintelligence/
- Member Data Portability API (EEA/CH only): https://learn.microsoft.com/en-us/linkedin/dma/member-data-portability/member-data-portability-member/
- Proxycurl shutdown (founder): https://nubela.co/blog/goodbye-proxycurl/ ; https://nubela.co/blog/what-is-proxycurl-api-now-in-2026-im-the-founder/
- HeyReach page removal: https://www.heyreach.io/blog/heyreach-ban
- Unipile pricing, limits and architecture: https://www.unipile.com/pricing-api/ ; https://developer.unipile.com/docs/provider-limits-and-restrictions ; https://www.unipile.com/proxycurl-alternative/ ; https://www.unipile.com/how-linkedin-api-pricing-works/ ; https://developer.unipile.com/v2.0/docs/posts
- Apify actors and pricing: https://apify.com/harvestapi/linkedin-profile-posts ; https://apify.com/harvestapi/linkedin-post-comments ; https://apify.com/harvestapi/linkedin-post-reactions ; https://apify.com/pricing
- Coresignal pricing: https://coresignal.com/pricing/
- Crustdata: https://crustdata.com/
- Enrich Layer: https://enrichlayer.com/
- ScrapIn pricing: https://www.scrapin.io/pricing
- Lix pricing: https://lix-it.com/pricing
- Evaboot pricing: https://evaboot.com/pricing
- RapidAPI Fresh LinkedIn Profile Data: https://rapidapi.com/freshdata-freshdata-default/api/fresh-linkedin-profile-data
- linkedin-api on PyPI: https://pypi.org/project/linkedin-api/ (GitHub https://github.com/tomquirk/linkedin-api returns 404)
- linkedin_scraper: https://github.com/joeyism/linkedin_scraper
- StaffSpy: https://github.com/cullenwatson/StaffSpy
- BrowserGate (Fairlinked e.V.): https://browsergate.eu/

Secondary / legal analysis / press
- hiQ wrap-up (ZwillGen): https://www.zwillgen.com/alternative-data/hiq-v-linkedin-wrapped-up-web-scraping-lessons-learned/
- hiQ settlement (Proskauer): https://newmedialaw.proskauer.com/2022/12/08/hiq-and-linkedin-reach-proposed-settlement-in-landmark-scraping-case/
- hiQ (Wikipedia): https://en.wikipedia.org/wiki/HiQ_Labs_v._LinkedIn
- Meta v. Bright Data (Farella): https://www.fbm.com/post/102kqw7/ ; (Quinn Emanuel): https://www.quinnemanuel.com/the-firm/news-events/client-alert-what-does-the-meta-v-bright-data-summary-judgment-ruling-mean-for-web-scraping/ ; (Zyte): https://www.zyte.com/blog/california-court-meta-ruling
- Bright Data lawsuits incl. X Corp (Wikipedia): https://en.wikipedia.org/wiki/Bright_Data
- ProAPIs: https://technewsday.com/linkedin-sues-proapis-for-using-one-million-fake-accounts-to-scrape-user-data/ ; https://cybernews.com/news/linkedin-sues-firm-for-scraping-millions-of-linkedin-member-profiles/ ; https://news.bloomberglaw.com/artificial-intelligence/linkedin-battles-online-scrapers-in-perpetual-struggle-over-data ; https://thelinkedblog.com/2026/linkedin-reaches-deal-in-data-scraping-lawsuit-against-proapis-3857/ ; https://sigmalawgroup.com/blog/2026-09-18-linkedin-proapis-scraping-consent-judgment/ ; https://www.gblock.app/articles/linkedin-proapis-scraping-injunction-2026 ; https://proxycove.com/en/blog/linkedin-proapis-sud-zapret-skrapinga-2026
- 2026 enforcement roundup: https://herohunt.ai/blog/ethical-linkedin-sourcing-2026-10-account-safe-methods
- PhantomBuster reviews: https://www.cleverly.co/blog/phantombuster-review ; https://www.hyperclapper.com/blog-posts/phantombuster-review-2026-safe-linkedin-or-too-risky
- Scraping legality overview (vendor, facts only): https://linkedapi.io/guides/how-to-scrape-linkedin
- PECA 2016 (Wikipedia): https://en.wikipedia.org/wiki/Prevention_of_Electronic_Crimes_Act,_2016
