# LinkedIn growth tools for creators and individuals: competitor landscape (as of 2026-10-07)

Research for Signal Desk's move toward a "LinkedIn growth partner". About 50 web searches plus primary-source fetches (vendor pricing pages, LinkedIn/Microsoft API docs, press) and secondary reviews.

**Source caveat.** Much of the "review" content in this market is written by competitors: MagicPost, AuthoredUp, Supergrow, ContentIn, Postiv, Reepl, LinkedGrow, HyperClapper and Valley all publish "X alternatives" posts. Any claim that rests only on a competitor blog is marked *(competitor source)*. **UNVERIFIED** means I could not confirm it in a primary or neutral source.

---

## 1. The big picture: the 2025-2026 platform shift

The most important finding is about the platform, not any single product. **LinkedIn and Google have been removing the data-collection layer that most creator tools were built on.** Pulling data through the user's session (Chrome extensions that read the DOM or reuse the li_at cookie, cloud-proxy browser automation) is being closed off, while official APIs are opening slightly.

| Date | Event | Confidence |
|---|---|---|
| Mar 2025 | LinkedIn removed the company pages of **Apollo.io** and **Seamless.AI**. No reason was given; the widely assumed cause is Chrome-extension scraping of contact data. Apollo's page was reportedly live again by July 2026. | Multiple secondary sources (LeadGenius, Salesmotion) |
| 2025 | LinkedIn sued **Proxycurl** (a scraping API that used fake accounts). Proxycurl settled and shut down; founder Steven Goh: "there is no winning in fighting this". In Oct 2025 LinkedIn sued **ProAPIs** on similar grounds. | LinkedIn newsroom + Bloomberg Law |
| Jun 2025 | **Kleo** free extension (70,000+ users) shut down after a reported LinkedIn cease-and-desist. Relaunched Oct 2025 as a $99/mo web app. | Reported by AuthoredUp and MagicPost *(competitor sources)*. The C&D wording itself is UNVERIFIED (no primary statement found). |
| Jul 8, 2025 | LinkedIn launched the **Member Post Analytics API** (`memberCreatorPostAnalytics`, scope `r_member_postAnalytics`) with 11 launch partners: Hootsuite, Buffer, Sprinklr, Metricool, Oktopost, Zoho, mLabs, SocialPilot, Later, Publer, Vista Social. | Digiday + Microsoft Learn docs (primary) |
| Nov 6, 2025 | LinkedIn VP Product Gyanda Sachdeva: "Our goal is to make engagement pods entirely ineffective… We're going to crack down on any third party tools, like a browser extension or a plug-in, that's automating any kind of manipulation by commenting on a bunch of posts at the same time." | Social Media Today (primary quote) |
| Mar 25, 2026 | LinkedIn removed **HeyReach**'s company page (~16.4k followers) and restricted the profiles of its CEO, CTO, CRO and CMO. The software kept working. HeyReach says LinkedIn has done the same to "Apollo, Seamless, Evaboot, Lemlist, LGM". | HeyReach's own blog (primary) |
| Apr 6-7, 2026 | **Taplio X** Chrome extension (lempire, ~70k users, 4.3 stars) removed from the Chrome Web Store for a "Chrome Web Store policy violation". | Extension-tracker sites (chrome-stats / extpose). The page could not be fetched directly (403), so the exact reason is UNVERIFIED. |
| May 18, 2026 | **Shield Analytics** (Copenhagen, founded 2018) announced it was shutting down. Founders' statement: "Both Google and LinkedIn made it clear that we could not continue operating Shield as it was built." Fully offline by Sep 2026; years of user history lost. **Inlytics** also closed; its domain now redirects to DemandBird. | PublishFlow + several alternative-sites (secondary, consistent) |
| 2026 | **Lempod** (pod extension) gone from the Chrome Web Store and unmaintained. | HyperClapper *(competitor source)*. Exact date UNVERIFIED. |
| Jul 30, 2026 | LinkedIn CPO Hari Srinivasan launched a **"Seems like AI slop"** feedback button and retired the "enhance your post" rewrite feature in favour of voice-preserving proofreading: "Everyday we are now catching hundreds of thousands of automated comment attempts, and have blocked billions of other automation attempts." Over 1M clicks in about 2 weeks; views of content classed as slop reportedly down 40%. Originality.ai figure cited in coverage: 81% of 5,000 sampled posts that month looked AI-generated. | The Register, Gigazine (press) |
| 2026 | Several sources describe a **May 20, 2026** algorithm change that suppresses AI slop and automated comments beyond the first-degree network, with "94% detection accuracy" and "97% pod detection" figures. | UNVERIFIED: secondary blogs only; LinkedIn's own posts were not reachable. Treat the numbers as marketing. |

**Implication for Signal Desk.** In 2026 the survivors are (a) tools on official APIs (Buffer, Hootsuite, Typegrow and others for posting and analytics) and (b) tools that only *assist a human* on screen without harvesting or automating (AuthoredUp's formatter and editor, comment *suggesters* that the user posts by hand). Anything that auto-comments, auto-connects, harvests cookies or scrapes in bulk carries account risk and vendor-continuity risk. Shield and Kleo users lost their history overnight.

### Official data paths available to an individual

- **Posting.** "Share on LinkedIn" (`w_member_social`) is self-serve, which is how schedulers post to personal profiles. (Standard LinkedIn developer product; not re-verified in this session.)
- **Analytics API.** `memberCreatorPostAnalytics` returns, per post or aggregated: IMPRESSION, MEMBERS_REACHED, REACTION, COMMENT, RESHARE, and from API version 2026-04 also POST_SAVE, POST_SEND, LINK_CLICKS, PREMIUM_CTA_CLICKS, FOLLOWER_GAINED_FROM_CONTENT, PROFILE_VIEW_FROM_CONTENT. It supports DAILY or TOTAL aggregation and date ranges. **But** it sits in the Community Management API, which is "only available to registered legal organizations for commercial use cases": you need a business email, legal entity, privacy policy and a verified Company Page super-admin, plus a 1-4 week manual review. **A solo developer is very likely ineligible.**
- **Free workaround.** Connect Buffer's free plan, an official launch partner. Per Buffer, its free plan covers 3 channels and shows impressions, reactions, comments, shares and engagement rate per post for personal profiles.
- **Native export.** LinkedIn's combined post analytics exports to .XLSX for 7-365 days, and each post's analytics (impressions, engagements, viewer demographics) can be exported to Excel. Export is manual, one file per post for single-post data.
- **GDPR archive.** "Download your data" gives full post history (text and dates) but no impressions. AuthoredUp uses this import to backfill history.

---

## 2. Comparison table

Prices are USD/month (monthly billing unless noted) as reported in 2026.

| Product | Category | Price | LinkedIn data method | Standout feature | Traction signal | Status / risk |
|---|---|---|---|---|---|---|
| **Taplio** (lempire) | All-in-one creator + leads | Starter $39 (no AI), Growth $69, Pro $199 (annual $32/$49/$149) | Cookie-based Chrome extension (Taplio X) for analytics + web app; own API for users | 5M+ viral post library, AI writing "grounded" in it, Smart Reply, queue/re-queue scheduling | Acquired by lempire in summer 2022 (small 7-figure cash + earnout); grew from $1.5M to $8M ARR post-acquisition (founder podcast) | Taplio X pulled from Chrome store Apr 2026. Trustpilot about 2/5 (billing and cancellation complaints). Pro auto-DM/connect features are a ToS risk. |
| **Kleo** | Was: free inspiration/analytics extension. Now: writing app + coaching | $99/mo or $999/yr, no free tier or trial | Was a DOM-reading extension; now a web app (extension only clips web articles) | Was: browse any creator's top posts sorted by engagement | 70k+ extension users before shutdown; about 1,205 "creators" on the homepage now *(AuthoredUp)* | Shut down Jun 2025 after LinkedIn objection |
| **AuthoredUp** | Editor/formatter + analytics extension | Individual $19.95 ($16.63 annual); Business $14.95/profile | Chrome extension inside LinkedIn's composer; GDPR archive import for history | Native-composer formatting and preview, 300+ hooks, archive import | 30,000+ users (Jan 2026), 4.8 stars on Chrome store; used at Microsoft, SAP, Canon, EY (self-reported) | Still live; markets itself as "no automation, no cookie harvesting" |
| **Supergrow** | AI writing + carousels | Starter $19, Pro $39, Teams $139 (7-day trial) | Official posting; analytics on Pro only | "PostCast": 15-min AI interview gives 5-7 posts; "Content DNA" voice profile | Founder podcast: MVP to $100k revenue; Product Hunt Product of the Day (dates UNVERIFIED) | Analytics weak (rated 2/5 by one reviewer) |
| **EasyGen** | AI writer via extension | $59.99 ($599.88/yr); 3 free posts + 7-day trial | Chrome extension inside LinkedIn | Voice-note to post | n/a | Criticised as expensive, formulaic "broetry", no scheduling or analytics |
| **Shield Analytics** | Analytics only | Was about $15-30/account | Extension that centralised the LinkedIn session cookie and pulled data in the background | Long-term history beyond LinkedIn's 365 days, hour-by-hour tracking, post comparisons | Operated 2018-2026; G2 3.2/5 | **Shut down May 2026** (Google + LinkedIn) |
| **Engage AI** (formerly FILT Pod) | Comment suggester, then "Engagement Community" pod | Extension about $25-30 (legacy); Community $50 individual, $250 group | Extension reading posts in the feed | AI comment suggestions + "prospect" watchlist; now 15 human comments per post over 5 days | Capterra 4.8/5 (30 reviews) | Marketing has pivoted to a pod, a format LinkedIn explicitly targets |
| **Typegrow** | AI writer + scheduler | Free tier; paid about $20-29/seat | **Official LinkedIn API** for posting (personal + company pages) | 1M+ viral post library, carousel maker, free generator tools | n/a | Lower risk (API) |
| **ContentIn** | AI writer + scheduler + analytics | From about $24-29 | n/a (cloud) | Templates + industry-news-based ideas ("a week of posts in 1 hour") | Capterra 4.7 (82 reviews) | Live |
| **Brandled** | AI writer + comment assist (LinkedIn + X) | Starter $19 (early price; regular $29), Pro $29 (regular $49) | Web app + "Brandled Assist" Chrome extension | Daily personalised ideas, Comment Assist with 3 POVs, inspiration feed | Small/early | Live |
| **MagicPost** | AI writer + analytics | About $17-39 per user; free version | Cloud; partly extension | Viral library, analytics, heavy SEO/comparison content | Claims 100,000+ users (self-reported) | Live |
| **Postiv AI** | Premium ghostwriter platform | Pro $99, Team $229, Agency $99/workspace | n/a | Voice training, carousels, free **Profile Analyzer** and post generator | n/a | Live |
| **Buffer** | Multi-network scheduler | Free (3 channels, 10 queued posts each); paid tiers | **Official API launch partner** (Member Post Analytics) | Free personal-profile post analytics | Public company-style transparency | Very safe |
| **Hootsuite** | Enterprise SMM | Standard $99/user, Advanced $249/user; Talkwalker listening enterprise-only | Official API (launch partner) | Listening (acquired Talkwalker 2024), OwlyGPT | Large incumbent | Safe, expensive, not creator-centric |
| **Reepl / LiGo / Scripe / LinkedGrow** | New 2025-26 entrants | Reepl free (10 AI comments/day) then $15+; LiGo from $9; Scripe $29-99; LinkedGrow $59 | Mostly extensions (Reepl, LiGo) or web apps | Comment generators; voice-memo to 10 posts (Scripe); "agent finds buyers among people your posts reach" (LinkedGrow) | n/a | Comment extensions sit in the gray zone LinkedIn named in Nov 2025 |
| **Waalaxy** | Outreach automation | Freemium €0; Pro €19, Advanced €49, Business €69 (reports of €99 for email + LinkedIn); Inbox add-on €20 | Extension + cloud automation | Easy prospecting sequences | Claims 200,000+ users | ToS risk; account restrictions if limits are exceeded |
| **Expandi** | Cloud automation | $99/seat ($79 annual) | Cloud with dedicated IPs | "Safer" cloud with dedicated IPs | n/a | ToS risk |
| **Dripify** | Cloud automation | From $39 (annual, upfront); Advanced $99 | Cloud | Drip campaigns | n/a | User reports of bans (mostly attributed to skipping warm-up) |
| **HeyReach** | Multi-sender automation (agencies) | About $79/sender | Cloud-proxy browser sessions | Rotating many sender accounts | Self-reported: 50M+ connection requests since Mar 2026, 21.3% acceptance | Company page and executives banned Mar 2026 |
| **Lempod** | Engagement-pod extension | n/a | Extension | Automated pod likes/comments | n/a | Gone from Chrome store, unmaintained |
| **Teal** | Job search | Free tracker + extension; Teal+ $13/wk, $29/mo, $79/quarter | Extension saves jobs from boards | Resume-to-JD match score, kanban tracker | n/a | Safe |
| **Huntr** | Job tracker | Free (100 jobs), paid about $40/mo | Extension | Kanban + autofill | n/a | Safe |
| **Simplify Copilot** | Autofill | Free forever; Pro $39.99 | Extension autofill on ATS forms (Workday, Greenhouse and others) | Autofill across 100+ ATS | n/a | Safe |
| **Jobright** | AI job copilot | About $24-49 (reported 33% price rise) | Aggregates job boards | Ranked matches + "insider" referral suggestions | 1.25M users (claimed); $7.7M raised incl. Series A Jun 2025 | Safe |
| **LinkedIn native** | Platform | Free / Premium | n/a | Creator analytics export, Job Match, Premium AI writing, Hiring Assistant for recruiters (GA Sep 2025) | n/a | Moving into the space itself |

n/a = not found or not public.

---

## 3. Per-product notes

### Taplio (lempire)
- **What it does.** AI post generator and hook writer, a 5M+ viral post library, calendar with queue and re-queue for evergreen posts, best-time suggestions, analytics, an engagement feed with Smart Reply (AI comment suggestions), and a lead database with automated outreach on Pro. Every plan includes a "LinkedIn Benchmark" (60,000+ posts analysed monthly).
- **Data.** Cookie-authenticated Chrome extension (Taplio X / "Taplio Stats") sends analytics to the app. The extension was removed from the Chrome Web Store on 6-7 Apr 2026 (~70k users). How analytics work now is UNVERIFIED (the help article returned 404).
- **Traction.** Founder Tibo Louis-Lucas sold Taplio and Tweet Hunter to lempire (Guillaume Moubeche) in summer 2022 for a small seven-figure cash amount plus a large earnout; ARR grew from $1.5M to $8M afterward (French podcast summary). lempire overall is reported at about $26-30M ARR.
- **Criticism.** Trustpilot about 2/5: surprise renewals, hard cancellation, bugs, AI output that "sounds like everyone else using Taplio". The entry price is misleading because AI starts at $69. AuthoredUp *(competitor source)* reports account warnings among Pro users during an April 2025 enforcement wave (UNVERIFIED).
- **Lesson.** The viral library plus AI writer plus scheduler bundle built an $8M ARR business, but the extension dependency and automation upsell are now liabilities.

### Kleo
- Free extension, loved for one thing: open any creator's profile and see their posts sorted by engagement, plus a clean feed reader. About 70k users. Shut down in June 2025 after LinkedIn objected; reports cite a cease-and-desist. Rebuilt as a $99/mo writing, design and scheduling web app with weekly coaching and no free tier.
- **Lesson.** The most-loved feature, competitive inspiration from other people's top posts, is exactly the one that requires reading LinkedIn content, and it got killed.

### AuthoredUp
- Chrome extension that lives in LinkedIn's own composer: Unicode bold and italic, bullets, mobile and desktop preview with the "see more" cut-off, 300+ hooks and endings, drafts, snippets, scheduling, and analytics (impressions per post, engagement over time, follower trends, format correlation plots). GDPR archive import loads full post history.
- 30k+ users, 4.8 stars. It survived the 2026 wave, presumably by avoiding automation and cookie harvesting, though it still reads the DOM for analytics, so it is not risk-free.
- **Lesson.** A formatting and preview tool inside the native composer is sticky and low-risk.

### Supergrow
- PostCast (a 15-minute AI interview that produces 5-7 posts), Content DNA voice profile from your past posts, carousels, repurposing from YouTube/PDF/audio. Cheap ($19). Analytics are gated to Pro and weak.
- **Lesson.** Interview-style extraction of the author's own experiences is a credible answer to "AI sameness".

### EasyGen
- Extension writer with a voice-note feature at $59.99. Criticised for formulaic hooks and missing scheduling and analytics. A cautionary example: writing alone does not justify a premium price.

### Shield Analytics
- The category's analytics standard for 7 years (long-term history, hour-by-hour data, comparisons, team dashboards). Killed in May 2026 because its architecture (centralising session cookies) was unacceptable to Google and LinkedIn. Users lost their historical data.
- **Lesson.** Own your data locally. A personal tool that snapshots its own metrics to Postgres avoids this failure mode.

### Engage AI (formerly FILT Pod)
- Started as a GPT-powered comment suggester extension with a prospect watchlist ("monitor posting activities of unlimited leads… 7-13+ touchpoints"). Now markets an "Engagement Community" pod at $50-250/mo (15 comments per post over 5 days, posts submitted Mon/Wed/Fri), which LinkedIn explicitly targets.
- **Lesson.** The watchlist feature (track specific people's new posts so you can comment early) is valuable. The pod is not.

### Typegrow
- Uses the official LinkedIn API for publishing to personal profiles and pages. Viral library (1M+), carousel maker, scheduling up to 50 days ahead, many free SEO tools (headline, hashtag, recommendation generators). About $20-29/seat with a freemium tier.

### ContentIn
- AI writing from templates and industry news, scheduling, analytics. Capterra 4.7 (82 reviews). Publishes heavy comparison content.

### Brandled
- Founder-focused (LinkedIn + X). Its "Ideation Hub" gives daily personalised ideas, and Comment Assist offers 3 POVs per comment. Brandled Assist extension. Credit-based ($19-29 early pricing).

### MagicPost
- Claims 100k+ users (unverified, self-reported). Viral library, AI writer, analytics, scheduler. Prolific publisher of competitor teardown posts; many of the Kleo, Taplio and Shield narratives online come from it.

### Postiv AI
- $99/mo premium positioning: voice training from multiple sources, carousels, white-label reporting. Notable lead magnets: a free LinkedIn Profile Analyzer and post generator.

### Buffer and Hootsuite (LinkedIn parts)
- Both were official launch partners for the Member Post Analytics API (Jul 2025). Buffer shows per-post impressions, reactions, comments, shares and engagement rate for personal profiles, with a free plan of 3 channels and 10 queued posts each.
- Hootsuite: $99-249/user plus enterprise Talkwalker listening. Neither offers creator-specific coaching, viral libraries or comment tools.
- **Lesson.** Buffer's free tier is a zero-cost, ToS-clean analytics source for a solo user who cannot get Community Management API access.

### Automation tools: Waalaxy, Expandi, Dripify, HeyReach
- They automate connection requests, messages and profile visits through extensions or cloud browsers. All violate LinkedIn's User Agreement prohibition on bots and automated access. Vendors manage risk with daily caps and warm-up periods; users who get restricted are usually over about 20-25 invites/day or sending templated spam.
- HeyReach's founder and executive accounts were banned in Mar 2026. Waalaxy claims 200k+ users.
- **Not appropriate for a personal brand account** of an AI engineer seeking jobs and clients: the downside (losing the account) is catastrophic.

### Lempod and pods
- Gone. LinkedIn has publicly committed to making pods "entirely ineffective" and suppresses their reach rather than removing posts.

### Job-search side: Teal, Huntr, Simplify, Jobright
- **Teal**: free tracker and extension; Teal+ $29/mo for match scoring, AI resume and cover letters, and LinkedIn profile optimisation.
- **Huntr**: kanban tracker, about $40/mo.
- **Simplify**: free autofill across 100+ ATS; Pro $39.99.
- **Jobright**: 1.25M users (claimed), $7.7M raised, AI job matching plus "insider connection" suggestions; $24-49/mo after a reported price increase.
- None of them connects job hunting to *content* strategy (posting to attract the recruiters at target companies). LinkedIn itself now offers Job Match for job seekers and Hiring Assistant (GA Sep 2025) for recruiters.

### New 2025-2026 entrants
- **Reepl**: comment generator extension, free 10/day.
- **LiGo**: "Post Lab" with 7 AI agents, from $9.
- **Scripe**: voice to 10 posts.
- **LinkedGrow** ($59): pitches an *agent* that finds buyers among the people your posts reach and opens conversations.
- **Extrovert** (Product Hunt, Oct 2026): "Run LinkedIn outreach from your agent".
- **Commently, LinkedTalk, LinkMate**: comment-automation extensions on the Chrome store.
- **Trend.** Products are moving toward "agentic" outreach and comment automation, the exact behaviour LinkedIn says it catches by the hundreds of thousands daily.

---

## 4. Patterns that consistently drive success

1. **Viral or inspiration post library** (Taplio 5M+, Typegrow 1M+, MagicPost, Kleo's creator browser). It was the most-loved feature of the most successful products. It needs LinkedIn content at scale, which is exactly what got Kleo shut down; Taplio's library predates the crackdown.
2. **Voice-matched AI drafting from the user's own past posts** (Supergrow Content DNA, Reepl voice profiles, Postiv training). This is now table stakes. Differentiation has moved to *input quality*: interviews (PostCast), voice notes (EasyGen, Scripe), news hooks (ContentIn).
3. **Native-composer formatting and preview** (AuthoredUp). Very sticky, low risk.
4. **Scheduling with queue, re-queue and best-time suggestions** (Taplio, Buffer, Typegrow). Commodity, but expected.
5. **Analytics with long-term history and post comparison** (Shield, AuthoredUp). Users value history beyond LinkedIn's 365 days, and losing it on Shield's shutdown was the main complaint.
6. **Comment assistant plus watchlist of target people** (Taplio engage feed, Engage AI, Brandled 3 POVs, Reepl). Commenting on the right people's posts early is widely seen as the top growth lever for small accounts. The safe form is suggest, then a human edits and posts.
7. **CRM of engaged people / "who engaged" lead lists** (Taplio Pro, LinkedGrow). Valuable for client acquisition, but usually built on scraping engagers (risky).
8. **Free micro-tools as SEO lead magnets** (profile analyzer, headline generator, best-time tool). This drives acquisition, not retention.
9. **Coaching and community bundles** (Kleo V3, Engage AI). Used to justify $50-99/mo pricing once the tooling became commoditised.

## 5. Gaps a personal AI-engineer tool could fill

1. **Grounded, news-driven, expert drafting.** Competitors generate from templates or viral posts and get "sounds like everyone else". Signal Desk already starts from real AI news, research papers and model cards scored for relevance, a source pipeline no creator tool has. Combined with LinkedIn's Jul 2026 slop crackdown, *substance-first* posts with real figures from papers are a structural advantage.
2. **ToS-clean learning loop.** Nobody closes the loop "my metrics, then what topic, format, hook and time worked, then next suggestions" without scraping. Buffer and the official API show numbers but give no advice; Taplio and Shield advise but scrape. A personal tool could ingest Buffer's free analytics, LinkedIn's .XLSX exports, or manual entry, keep history forever in its own Postgres (the gap Shield's shutdown exposed), and use embeddings to correlate topic clusters with outcomes.
3. **Comment opportunities without automation.** Find fresh, relevant posts from a curated list of AI people and companies (from RSS, newsletters, the people's own blogs and X, or links the user pastes), then draft 2-3 POV comments that are *grounded in the source paper or news*. The human posts them. Competitors' comments are generic because they only see the post text.
4. **Job and client radar connected to content.** Job tools (Teal, Jobright) ignore content, and content tools ignore jobs. An AI-engineer-specific feed of roles, freelance and contract requests and "hiring AI engineers" posts (from ATS boards like Greenhouse, Lever and Ashby with public JSON, HN "Who's hiring", RemoteOK, and similar), plus "post about X to get noticed by company Y", is unoccupied.
5. **Weekly report and strategist.** A weekly digest (what shipped in AI, what you posted and how it did, what to post next, people to engage, open roles) is something no competitor offers holistically. Most offer dashboards, not narrative advice.
6. **Profile review that is role-aware.** Free profile analyzers are generic lead magnets. A reviewer tuned to AI-engineer hiring signals (headline keywords recruiters search for, featured projects, GitHub links) is a gap.
7. **"Who to connect with" without scraping.** Derive candidates from authors of papers and repos Signal Desk already ingests, speakers and lab researchers, and people the user manually logs as engaging. The user sends requests by hand.
8. **Zero vendor-continuity risk and zero cost.** Every paid tool here costs $19-199/mo, and several died. A self-hosted, export-based personal tool cannot be "shut down" by LinkedIn.

**What to avoid** (based on the evidence above): auto-posting comments, auto-connect/DM, pods, cookie-based background scraping, and reading other people's LinkedIn feeds through the session. This is the behaviour behind every 2025-2026 takedown, and LinkedIn now suppresses reach for it.

---

## 6. Unverified or gaps in this research
- The exact Kleo cease-and-desist text and the Kleo founder's statement were not found.
- The Taplio X removal reason comes from tracker sites only; whether Taplio analytics still work without it is unknown.
- The "May 20, 2026 algorithm change", "94% / 97% detection" and "8,500 to 340 impressions shadow-ban" figures come only from secondary blogs.
- Supergrow, Typegrow, ContentIn, Brandled and Postiv user and revenue counts were not found.
- MagicPost "100k+ users", Waalaxy "200k+", AuthoredUp "30k+" and Jobright "1.25M" are self-reported.
- Self-serve availability of `w_member_social` for individuals is assumed from common knowledge and was not re-verified in this session.
- No Reddit threads were directly retrieved; Reddit sentiment is reported second-hand via review aggregators.

---

## Sources
- Taplio pricing (vendor): https://taplio.com/blog/taplio-pricing
- Taplio acquisition, ARR (podcast/SaaS Club): https://podcast.ausha.co/soloquest/moment-tibo-louis-lucas-comment-vendre-sa-boite-10m-tweet-hunter-taplio ; https://saasclub.io/?p=6016085
- Taplio X Chrome listing / trackers: https://chromewebstore.google.com/detail/taplio-x/dfpbcakpogbfaohnnjlgghdjkgaoiaik ; https://chrome-stats.com/d/dfpbcakpogbfaohnnjlgghdjkgaoiaik ; https://extpose.com/ext/dfpbcakpogbfaohnnjlgghdjkgaoiaik
- Taplio API / analytics help: https://intercom.help/TaplioAndTweetHunter/en/articles/15806126-how-to-access-and-use-the-taplio-api ; https://intercom.help/taplio/en/articles/8808316-understanding-how-to-use-analytics-in-taplio
- Taplio review (competitor): https://authoredup.com/blog/taplio-review
- Taplio Trustpilot: https://ca.trustpilot.com/review/taplio.com
- Kleo reviews (competitors): https://authoredup.com/blog/kleo-review ; https://magicpost.in/blog/kleo-review
- AuthoredUp pricing: https://authoredup.com/pricing ; https://authoredup.com/blog/authoredup-pricing-plans
- AuthoredUp alternatives (30k users): https://contentin.io/alternatives/authoredup/
- Supergrow: https://authoredup.com/blog/supergrow-review ; https://connectsafely.ai/articles/supergrow-review-linkedin-content-tool-2026 ; https://prohance.substack.com/p/going-from-0-to-1-with-supergrow-ce1
- EasyGen: https://connectsafely.ai/articles/easygen-review-linkedin-ai-content-tool-2026
- Shield shutdown: https://publishflow.io/blog/shield-analytics-winding-down ; https://postiv.ai/blog/shield-alternatives ; https://linkhub.gg/en/alternative/shieldanalytics
- Engage AI: https://engage-ai.co/ ; https://engage-ai.co/pricing/ ; https://www.capterra.com/p/218978/FILT-Pod ; https://www.commentify.co/alternatives/engage-ai
- Typegrow: https://www.capterra.in/software/1187810/Typegrow ; https://www.saasworthy.com/product/typegrow
- ContentIn: https://www.capterra.com/p/276290/ContentIn/
- Brandled: https://alternativeto.net/software/brandled/about/ ; https://peerpush.com/p/brandled
- MagicPost: https://www.capterra.com/p/10043920/magicpost/
- Postiv: https://postiv.ai/pricing ; https://contentin.io/vs/postiv-ai/
- Buffer LinkedIn profile analytics: https://buffer.com/resources/linkedin-profile-analytics/ ; https://support.buffer.com/article/560-using-linkedin-with-buffer
- Hootsuite: https://postiv.ai/blog/hootsuite-alternatives ; https://www.g2.com/products/talkwalker/pricing
- LinkedIn Member Post Analytics API docs: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/members/post-statistics
- Digiday on API launch: https://digiday.com/media/linkedin-makes-it-easier-for-creators-to-track-performance-across-platforms/
- Community Management API eligibility: https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review
- LinkedIn native analytics export: https://www.linkedin.com/help/linkedin/answer/a701208 ; https://lindseygamble.com/blog/linkedin-introduces-exportable-single-post-analytics
- Apollo/Seamless page removals: https://salesmotion.io/blog/linkedin-removed-apollo-brand-page-2025-alternatives ; https://www.leadgenius.com/resources/linkedins-b2b-data-crackdown-what-changed-by-2026
- Proxycurl lawsuit: https://news.linkedin.com/2025/LinkedInWinsLegalBattleToProtectMemberData ; https://news.bloomberglaw.com/artificial-intelligence/linkedins-war-against-bot-scrapers-ramps-up-as-ai-gets-smarter
- HeyReach ban: https://www.heyreach.io/blog/heyreach-ban ; https://joinvalley.co/blog/linkedin-automation-safety-2026 ; https://linkedinsider.blog/linkedin-automation-crackdown-2026
- Engagement pods statement: https://www.socialmediatoday.com/news/linkedin-vows-to-take-action-against-engagement-pods-fake-engagement/804970/
- Lempod: https://www.hyperclapper.com/blog-posts/lempod-alternative-best-linkedin-pod-tools
- AI slop button: https://www.theregister.com/a/5281436 ; https://gigazine.net/gsc_news/en/20260824-ai-slop-button-million/
- Waalaxy: https://hackceleration.com/waalaxy-review/ ; https://lagrowthmachine.com/waalaxy-pricing/
- Expandi/Dripify/HeyReach pricing: https://www.joinvalley.co/blog/expandi-pricing-explained-2026 ; https://leadhaste.com/blog/dripify-pricing-2026 ; https://leadhaste.com/blog/expandi-vs-heyreach
- Dripify/Expandi safety: https://getfuzzy.ai/blog/dripify-vs-expandi-vs-phantombuster-safety
- Jobright: https://atsverification.com/blog/jobright-ai-review-2026/ ; https://getlatka.com/companies/jobrightai
- Teal/Huntr/Simplify: https://blog.loopcv.pro/teal-hq-review/amp/ ; https://resumeoptimizerpro.com/blog/huntr-alternative ; https://jobshinobi.com/compare/best-job-tracking-app-2026
- LinkedIn Hiring Assistant: https://techcrunch.com/2024/10/29/linkedin-launches-its-first-ai-agent-to-take-on-the-role-of-job-recruiters ; https://newsletter.ere.net/p/inside-linkedin-s-hiring-assistant-rollout
- New entrants: https://reepl.io/blog/best-linkedin-comment-generators-2026 ; https://ligosocial.com/compare/ligo-vs-scripe ; https://linkedgrow.ai/use-cases/personal-branding ; https://posteverywhere.ai/blog/21-best-ai-tools-for-linkedin
