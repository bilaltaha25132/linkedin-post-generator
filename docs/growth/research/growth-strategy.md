# 05 — LinkedIn Growth Strategy for Bilal Taha (research, 2026-10-07)

Scope: how the feed ranks posts in 2025–2026, timing across PK/UAE/UK/US, content strategy for AI engineers, analytics learning loop, profile optimization, networking, and a weekly routine a tool (Signal Desk) can orchestrate. Ends with concrete suggestion rules and sources.

**Evidence labels used below**
- **[PRIMARY]** LinkedIn itself (engineering blog, arXiv papers by LinkedIn staff, Help Center, official announcements).
- **[DATA]** Third-party study with a stated sample (van der Blom, AuthoredUp, Buffer, Socialinsider, Hootsuite).
- **[SECONDARY]** Reported by a blog/aggregator citing a study I could not open directly.
- **[UNVERIFIED]** Widely repeated but no traceable method or primary source. Do not hard-code these as truths.

Research note: the web-search budget for the session ran out after ~45 searches; a few planned checks (build-in-public case studies, LinkedIn's 30k connection cap page) were filled from well-established knowledge and are labelled.

---

## 1. How the feed ranks posts (2025–2026)

### 1.1 The actual architecture (what LinkedIn has published)

| Claim | Evidence |
|---|---|
| Feed now runs a **two-stage system**: (1) an LLM-based **dual-encoder retrieval** (fine-tuned LLaMA 3) that embeds members and posts *from text* and pulls ~2,000 candidates from hundreds of millions; (2) a **Generative Recommender / Feed SR** — a causal sequential transformer that ranks those candidates against **1,000+ of the member's past interactions**. | [PRIMARY] LinkedIn Engineering, "Engineering the next generation of LinkedIn's Feed" (12 Mar 2026); arXiv 2510.14223 (Oct 2025); arXiv 2602.12354 (Feb 2026, CIKM 2026) |
| Feed SR in production: **+2.10% time spent, +3.52% likes/comments/reshares** vs the old DCNv2 ranker; serves the majority of feed traffic for 1.2B members. | [PRIMARY] arXiv 2602.12354 |
| Inputs for posts: **post text, author profile (headline, company, industry), engagement counts (as percentile buckets), recency**. Inputs for members: profile, skills, work history, chronological engagement history. | [PRIMARY] LinkedIn Eng blog Mar 2026 |
| Ranker predicts multiple actions (clicks, likes, comments, shares; secondary sources add "long dwell" and skip). Dwell time has been a documented feed signal since 2020 (skip-prediction model). | [PRIMARY] Eng blog; [SECONDARY] fast-growth.fr summary of Hertel et al. |
| Interaction data "loses half its influence every ~60 days"; model memory ~1,000 posts over ~1 year. | [SECONDARY] fast-growth.fr reading of the Feed SR paper |
| **360Brew** is real — a 150B-parameter decoder-only model handling 30+ ranking/recommendation tasks via prompts (arXiv 2501.16450, Jan 2025). But **LinkedIn's March 2026 feed post does not mention it**; claims that "360Brew is the feed algorithm since 2025/March 2026" are **[UNVERIFIED]**. The *practical implications* (text is read semantically, author profile and topic matter) are true either way because the retrieval layer is itself an LLM over text. | [PRIMARY] arXiv 2501.16450; [PRIMARY] Eng blog (absence) |
| LinkedIn deliberately pushes **"knowledge and advice"** content from outside your network; reported ~40% increase in people viewing knowledge content from out-of-network authors; "suggested posts" can resurface good posts for weeks/months. | [PRIMARY-reported] Dan Roth & Tim Jurka interview, Entrepreneur (2024) |

**Implication for Bilal:** your *post text* and your *profile text* are embedded into the same semantic space as readers' interests. Consistent topics (AI engineering, LLM systems, agents, evals, shipping AI products) make your posts retrievable for AI-interested readers worldwide; off-topic posts dilute that. This is the mechanistic basis of "topical authority" — not folklore.

### 1.2 Reach decline and the interest graph [DATA]

- **Van der Blom Algorithm InSights 2025** (~1.8M posts): views ~-50% YoY, engagement ~-25%, follower growth ~-59% (another reading: -47% / -39% / -42%).
- **Van der Blom 2026** (~1.3M posts, ~50k creators): reach **-60% over two years** for active creators; engagement only -20–25% (so engagement *rate* per view rose). Feed composition: ~**31% first-degree**, ~25% 2nd/3rd-degree, ~10% Suggested. "Top creator" share of visibility rose 15% → 31% since 2022; "other creators" fell 57% → 28%.
- Socialinsider 2026 (company pages, 1.3M posts): overall engagement rate 5.20%, +8% YoY — consistent with "fewer views, higher engagement per view".

### 1.3 Signals and their weights

| Signal | What the data says | Label |
|---|---|---|
| **Comments vs reactions** | Comments roughly **2x** a like (AuthoredUp, 621,833 posts); other analyses claim 5–15x. Threaded replies to comments associated with up to **2.4x** more reach. "15x" is untraceable. | [DATA] 2x; [UNVERIFIED] 5–15x/15x |
| **Comment length/quality** | "Comments of 15+ words carry ~2–2.5x weight" — repeated everywhere, no primary method. The Hootsuite controlled test (40 comments/week) found long, specific comments → **24 vs 14 profile views, 14 vs 6 replies, 10 vs 8 connection requests** vs short generic ones. | [UNVERIFIED] weights; [DATA, small n] Hootsuite |
| **Saves / sends** | AuthoredUp: saves ~2x a meaningful comment; others: save ≈ 5x a like. Saves and sends are tracked per post (API metrics POST_SAVE, POST_SEND). Van der Blom: "design every post for saves and meaningful comments instead of likes." | [DATA/SECONDARY] |
| **Dwell time** | Confirmed signal [PRIMARY]. Specific bucket numbers ("15.6% engagement beyond 60s", "Depth Score") are **not in any LinkedIn publication**. | [PRIMARY] signal; [UNVERIFIED] numbers |
| **External links** | No LinkedIn policy says links are demoted. Measured: van der Blom 2025 median **-18.8%** for one body link, updated 2026 to **~-11%**; AuthoredUp/other 900k-post analysis **-26.5%**; LinkPost 358k posts 448 vs 705 median impressions (-36%); Ordinal: big loss for company pages, "almost none" for personal profiles; Metricool: links +13.6% interactions. The "60% link penalty" is **[UNVERIFIED]**. | Mixed [DATA] |
| **First hour ("golden hour")** | Van der Blom: first hour is crucial; "engage your network before and after publishing" (claimed up to ~20% lift). "70% of reach decided in 60–90 min" and "shown to 2–5% of network first" are **[UNVERIFIED]**. Practical rule stands: be available to reply for 60 min after posting. | [DATA] direction; [UNVERIFIED] percentages |
| **Hashtags** | AuthoredUp (8-month study): **no reach impact**; 3–5 slightly negative; 6+ clearly harmful. Van der Blom 2026: no-hashtag posts +5–10%. Profile hashtags were removed Feb 2024. Bilal's no-hashtag rule is correct. | [DATA] |
| **Tagging** | Tagging 1 person +35% engagement, 2–3 +76%, 4+ +126% (correlational — tagged posts are often wins/events where tagged people engage). Tagging people who don't engage, or unrelated people, reads as bait. | [SECONDARY], correlational |
| **Editing after posting** | No evidence of a penalty for small edits; a large rewrite may trigger re-scan. "Never edit in first hour" is **[UNVERIFIED]** folklore. | [SECONDARY] |
| **Engagement pods / AI comments** | Van der Blom: pods detected with high accuracy; "80% of comments I get in first 5 minutes are AI-written." LinkedIn (30 Jul 2026) added a **"Seems like AI slop"** report button, blocks "hundreds of thousands of automated comment attempts daily" and "billions" of automation attempts in recent months; classifiers target "comments with little or no human involvement" and comments that restate the post. User Agreement 8.2 bans bots that create/comment/like/share. Shield Analytics shut down May 2026 (cookie-based extension). | [PRIMARY] TechCrunch/The Register reporting LinkedIn; [DATA] van der Blom |

### 1.4 Formats [DATA]

**Personal profiles — AuthoredUp, 3M+ posts, Mar 2025–Feb 2026 (median reach multiplier vs baseline):**

| Format | Reach | Median reach | Median engagements |
|---|---|---|---|
| Document / PDF carousel | **1.39x** | 1,198 | 35 |
| Poll | 1.24x (engagement 0.37x) | – | – |
| Image | 1.20x | 1,031 | 36 |
| Text | 1.07x | 921 | 21 |
| Video | 0.86x (median video reach **-36% YoY**, engagement -26%) | – | – |
| Article | 0.69x | – | 12 |

- Video length: 3+ min videos did best (1.21x reach) among videos; under 60s ~0.95x.
- Van der Blom 2026 priority: **text + image, carousels, newsletter editions**; text-only "needs a hell of a copywriter"; polls declining; forced video hurts. Standalone articles ~0.4x; **newsletter editions** get far more reach, and LinkedIn auto-invites new followers (≈60% conversion claimed); 80% of his paid conversions come from newsletters.
- Company pages (Socialinsider 2026, 16,645 pages): documents 7.00%, multi-image 6.45%, video 6.00%, image 5.30%, text 4.50%, poll 4.20%, link 3.25% engagement rate. Not personal-profile data — directional only.
- Buffer (2M+ posts): carousels 278% more engagement than video, 303% more than images, ~600% more than text. (Engagement rate is inflated for carousels because swipes/clicks count — Socialinsider caveat.)
- Carousel length: 8–12 slides is common guidance; completion matters (dwell). [SECONDARY]

**Post length:** AuthoredUp (372,126 personal posts, Sep 2025–Feb 2026): highest engagement rate (2.61–2.67%) at **1,301–2,500 characters**; other AuthoredUp guidance: reach peaks 800–1,000 chars, engagement 1,000–1,200. Bilal's 180–320 words (~1,100–2,000 chars) sits in the sweet spot. Carousel captions shorter (800–1,000 chars).

### 1.5 Posting frequency [DATA]

- **Buffer** (2M+ posts, 94k accounts, fixed-effects regression): vs posting once/week, 2–5 posts/week **+1,182 impressions/post**; 6–10 → +5,001; 11+ → +16,946. Effect holds across account sizes. Recommends 2–5/week as sustainable.
- **Van der Blom 2026:** optimal **2–4 posts/week** (down from 5–6); moving 1 → 2–4/week adds ~1,234 impressions/post; **daily posting → -26% average reach per post** (fatigue). Less-active creators saw +10–15% reach.
- Reconciling: Buffer measures *per-account* gain (includes heavy professional publishers); van der Blom measures *per-post* fatigue. For a solo engineer with quality constraints: **3 posts/week**, never two on the same day, ~48h gaps.

---

## 2. Best times and time zones

### 2.1 What the datasets say (they disagree)

| Source | Sample | Best window (poster's local time) |
|---|---|---|
| Buffer 2026 | 4.8M posts | **3–8 pm weekdays**; Wed 4 pm best, Fri 3–4 pm; Wed > Thu > Fri; Mon/Tue weakest. Big shift from 2025 (was working hours). |
| Hootsuite (Nov 2025) | 1M+ posts | 8–9 am Tue/Wed (internally inconsistent page) |
| Sprout Social (Mar 2026) | 2B engagements, cross-platform | Tue 11 am–5 pm |
| AuthoredUp | 25k profiles / 3M posts | **Personal profiles: <10% spread between best and worst day**; Tue–Thu marginally best; company pages vary 1.7x more |

**Conclusion:** for personal profiles, timing is a second-order effect. Content-topic fit and the first hour of replies matter far more. Use timing mostly to (a) be online for replies, (b) land in the waking hours of the audience segment you want.

### 2.2 Time-zone math for Bilal (PKT = UTC+5, no DST)

| PKT | UAE (UTC+4) | UK (BST until 25 Oct / GMT after) | US East (EDT until 1 Nov / EST after) | US West |
|---|---|---|---|---|
| 1:00 pm | 12:00 pm | 9 am / 8 am | 4 am | 1 am |
| 3:00 pm | 2:00 pm | 11 am / 10 am | 6 am / 5 am | 3 am |
| **6:00 pm** | **5:00 pm** | **2 pm / 1 pm** | **9 am / 8 am** | 6 am / 5 am |
| 7:30 pm | 6:30 pm | 3:30 pm / 2:30 pm | 10:30 am / 9:30 am | 7:30 am |

- **Default slot: 5:30–7:30 pm PKT, Tue–Thu.** It hits PK/UAE in the Buffer evening window, UK early afternoon, US East morning feed check — the only window touching all four markets — and Bilal is awake for the golden hour.
- **Regional slot: ~1 pm PKT** when a post targets Pakistan/Gulf (local hiring, Urdu-market news).
- **US-recruiter/client push:** 7:30–8:30 pm PKT.
- A tool should read the **DEMOGRAPHICS → Locations** sheet of the creator analytics export and weight the slot by audience share; re-check every ~90 days. Store DST transition dates (UK last Sunday of Oct/Mar; US first Sunday Nov / second Sunday Mar).

---

## 3. Content strategy for an AI engineer

### 3.1 Frameworks that hold up against the 2026 algorithm

1. **Topic fingerprint / pillars.** Van der Blom: keep ~**80% of posts on 2–3 core topics**; ask an LLM "what are the two main topics of my last 20 posts" and fix drift; align the profile to those topics. He reported a profile redesign (Feb 2026) lifted profile visits and reach within ~3 weeks. [DATA/anecdotal]
2. **Content matrix** (Justin Welsh): pillars × formats (actionable tip, framework, observation, contrarian take, story, list, comparison, prediction) → dozens of ideas per pillar. Good for an idea generator. [practitioner framework]
3. **Format rotation.** AuthoredUp: "posting the same format every week flattens your reach"; plan Mon–Thu, rotate formats. [DATA, method not public]
4. **Design for saves and comments**: reference value (checklists, architectures, eval rubrics, cost tables) gets saved; a specific, debatable claim gets comments. Engagement bait ("comment YES") is penalised. [PRIMARY on bait; DATA on saves]
5. **Series.** Recurring named formats ("Shipped this week", "What the paper actually says", "Prod notes") build expectation and make the topic fingerprint obvious. [practitioner consensus, UNVERIFIED as a reach factor]
6. **Build in public.** Posting real builds, numbers, failures and architecture of your own projects is the most credible signal to recruiters/clients (proof of work) and is naturally on-topic. [practitioner consensus; search budget prevented collecting case data]
7. **Newsletter** once the post cadence is stable: van der Blom's strongest conversion channel. [DATA, single source]

### 3.2 What successful AI/ML practitioner-creators do (observational)

Follower counts and styles below come from bios/lists found in research or from public profiles as generally known; post-mix descriptions are **observational, not measured** — verify before quoting.

| Creator | Positioning | Typical mix / signature |
|---|---|---|
| Aurimas Griciūnas (SwirlAI) — 120k+ LI followers | AI engineering, LLMOps, RAG, agents; "production-first, no hype" | Hand-drawn **architecture diagrams** + numbered explanation; newsletter-driven; teaching > news |
| Paul Iusztin (Decoding ML) | LLM systems, MLOps, end-to-end builds | Diagram + long teaching post, frequent open-source course/project posts (build in public) |
| Aishwarya Srinivasan — ~460–500k | AI careers + industry | Career guidance, AI news explainers, personal milestones, events; multi-platform |
| Brij Kishore Pandey (Principal Eng, ADP) — top-15 Favikon AI educators | System design/AI infographics | Very visual: cheat-sheet infographics and carousels; high save-rate content |
| Philipp Schmid (Google DeepMind DevRel, ex-Hugging Face) | Open models, agents | Short, dense posts on new model releases/papers + code links; fast news reaction with engineer's take |
| Maxime Labonne (Liquid AI) | Post-training, fine-tuning | Release notes of own models/courses, technical diagrams |
| Sebastian Raschka | LLM internals | Paper explainers, figures from his own articles, book/code posts |
| Eugene Yan (Amazon) | Applied ML, evals | Links to long-form essays with a crisp summary |
| Chip Huyen | AI engineering (book author) | Low frequency, high-depth essays/observations |
| Hamel Husain / Shreya Shankar | Evals, LLM judges | Practical lessons from consulting/research, course promos |
| Andrew Ng | AI education | Diagrams + plain-language explanations (The Batch) |
| Ethan Mollick | AI at work research | Research findings + personal experiments; screenshots |
| Allie K. Miller | Business AI | Checklists, ROI frameworks for leaders |
| Armand Ruiz (IBM), Rakesh Gohel, Pascal Biese (LLM Watch) | Enterprise AI / agent explainers / paper digests | Infographic carousels and paper roundups |

**Common pattern among engineer-creators who grew on LinkedIn:** (1) a narrow, named technical lane; (2) a visual signature (diagram/carousel style) that is recognisable in-feed; (3) teaching posts dominate (roughly 60–70%), news-with-a-take ~20%, personal/career/build-in-public ~10–20%; (4) a newsletter or course as the conversion endpoint. [observational synthesis]

**Bilal's edge vs these:** he is a *full-stack builder* in a lower-cost market serving global clients. "AI news, read by someone who ships it" — news + his own engineering judgment + proof from his builds — is a lane most news-aggregator accounts can't occupy.

---

## 4. Learning loop: analytics → recommendations

### 4.1 Data available (without scraping)

1. **Creator analytics export (.xlsx)** — Posts and Audience tabs, up to 365 days. Sheets: **DISCOVERY** (impressions, members reached), **ENGAGEMENT** (daily impressions & engagements), **TOP POSTS** (top 50 by engagements and by impressions; post URL + publish date), **FOLLOWERS** (daily new followers, total), **DEMOGRAPHICS** (job titles, locations, industries, seniority, company size, companies). [PRIMARY] LinkedIn Help a704175
2. **Single-post export** — impressions, reactions/comments/reposts, views, top viewer demographics. Since May 2025, post analytics also show **profile viewers from this post** and **followers gained from this post** (all users); saves and sends are shown in post analytics. [SECONDARY reporting LinkedIn]
3. **Member Post Analytics API** (`memberCreatorPostAnalytics`, scope `r_member_postAnalytics`, API versions ≥202506): IMPRESSION, MEMBERS_REACHED, REACTION, COMMENT, RESHARE, POST_SAVE, POST_SEND, LINK_CLICKS, FOLLOWER_GAINED_FROM_CONTENT, PROFILE_VIEW_FROM_CONTENT; `q=entity` per post, `q=me` aggregate. Part of the **Community Management API**, which requires a vetted app (verified organisation/LinkedIn Page, business email, use-case review). Realistic for a product, heavy for a personal tool → **the xlsx export (manual upload) is the zero-cost path.** Do not use cookie-based scraping (Shield was killed for that; User Agreement 8.2).

### 4.2 Metrics and formulas

- **Engagement rate (ER)** = (reactions + comments + reposts) / impressions. Optionally add saves + sends when available ("deep ER").
- **Weighted engagement score** (tool-internal, tunable): `1·reactions + 2·comments + 2·saves + 2·sends + 1.5·reposts`, divided by impressions. Weights follow the AuthoredUp ordering (save ≥ comment ≈ 2× like); keep them configurable since exact weights are unpublished.
- **Reach multiplier** = post impressions / author's trailing-90-day median impressions (removes account-growth drift; mirrors AuthoredUp's multiplier method).
- **Follower conversion** = followers gained from post / members reached (×1,000). This is the best single metric for "grow followers/reputation".
- **Profile-view rate** = profile views from post / members reached — the best proxy for recruiter/client interest.
- **Comment depth** = comments / reactions; and author-reply share.
- **Audience quality** = share of viewers/followers matching target titles (AI/ML engineer, CTO, founder, recruiter/talent) and target locations (UAE, UK, US) from DEMOGRAPHICS.

Benchmarks for sanity checks: personal-profile median ER ~2–3%; AuthoredUp 2.6% for 1,300–2,500-char posts; documents 6–7% (company pages).

### 4.3 Insight computations a tool can run

1. **Topic clustering:** embed every past post (pgvector already exists), cluster (k-means/HDBSCAN, k≈5–8), label clusters with an LLM. For each cluster: n, median reach multiplier, median follower conversion. Recommend the top 2–3 clusters as pillars; flag "drift" when >20% of the last 10 posts fall outside pillars.
2. **Hook analysis:** classify first line (question, number/stat, contrarian claim, story opener, news lead "X just shipped Y", "I built…"); length of first line; compare median reach multiplier per hook type (require n≥5 per bucket).
3. **Format × topic table:** reach multiplier by (format, cluster). Recommend under-used high-performing cells.
4. **Timing:** median reach multiplier by weekday and by PKT hour bucket — only report if ≥3 posts per bucket; otherwise default to the 6 pm PKT rule.
5. **Trend fit:** cosine similarity between monitored news items and Bilal's pillar centroids × freshness (hours since publication) × item score → "what to post next".
6. **Follower attribution:** join FOLLOWERS daily gains to posts published within the prior 0–3 days (or use per-post "followers gained" when exported).
7. **Small-n discipline:** with ~12 posts/month, use medians, minimum bucket sizes, and show confidence ("weak signal: 4 posts").

---

## 5. Profile optimization for an AI engineer (recruiters + clients)

**How recruiter search works:** LinkedIn Recruiter is keyword + filter search over headline, current/past titles, skills, About and experience; skills are hard filters (listed or not). Hiring Assistant / AI-assisted search (2024–2026) adds semantic matching using profile and activity; members have added 787M skills (+56% YoY). [PRIMARY-reported / SECONDARY] The feed ranker also reads author headline/company/industry, so the profile shapes both recruiter search *and* post distribution. [PRIMARY]

| Element | Recommendation | Evidence |
|---|---|---|
| **Headline** (220 chars; ~first 70 visible on mobile) | `Role | what you build | stack | proof`. Front-load "AI Engineer". E.g. *"Full Stack AI Engineer | LLM apps, RAG & agents in production | Next.js, Python, Postgres/pgvector | Building Signal Desk"* | [SECONDARY] recruiter-keyword guides |
| **About** | First 2–3 lines visible: who you help + outcome. Then: 3 shipped systems with numbers, stack keywords in natural sentences, how to engage (hire full-time / project work / remote), contact. No buzzword soup. | practitioner consensus |
| **Featured** | Pin: best-performing carousel, a build-in-public post with a demo, GitHub/portfolio link, services page. | practitioner consensus |
| **Skills** | Up to 100; put the 5 that match target roles first (LLMs, RAG, AI agents, Python, TypeScript/Next.js, PostgreSQL, vector databases, prompt engineering, evals). LinkedIn: members with 5+ skills get up to **17x more profile views**, up to 33x more messages. | [PRIMARY-reported, old stat] |
| **Photo / verification** | Photo → **21x more profile views, 9x more connection requests** (old LinkedIn stat). **Verified members: 60% more profile views, 50% more engagement on average.** Verify ID (free). | [PRIMARY] Help 140551 |
| **Creator mode** | Toggle removed March 2024; its features (follow button, newsletter, Live, analytics, custom profile link) are available to all. Use "Make Follow primary" only if the goal is audience; keep **Connect** primary while network is small and recruiter/client-focused. | [SECONDARY] multiple |
| **Open to Work** | Use **"Recruiters only"** visibility (no green frame). LinkedIn data: Open to Work → ~40% more recruiter InMails; positive response 14.5% vs 4.6%. | [SECONDARY reporting LinkedIn] |
| **Services page** | Free "Providing services" page (AI integration, LLM app development, RAG/chatbot development, automation). Clients can send a request-for-proposal without connecting; supports reviews. 82% of buyers prefer network referrals. | [PRIMARY] Help a550345; LinkedIn survey |
| **Custom URL** | linkedin.com/in/bilaltaha (or closest). | standard |
| **Banner** | One line value prop + proof (e.g. "I build LLM products that ship — RAG, agents, evals") + subtle stack logos/URL. | practitioner consensus |
| **Location** | Keep Karachi but state "Remote — open to UAE/UK/US" in headline/About; recruiter filters use location. | reasoning |
| **Newsletter** | Once cadence is stable (8+ weeks), start a biweekly newsletter from the strongest pillar. | [DATA] van der Blom |

---

## 6. Networking

- **Invite limits:** ~**100 invitations per rolling 7 days** for most accounts (soft, behaviour-based; can be lower if acceptance is poor; some mature/high-SSI accounts report up to ~200). LinkedIn doesn't publish the number. Max **30,000 connections** (long-standing LinkedIn limit; followers unlimited). [SECONDARY; 30k from LinkedIn Help, not re-fetched]
- **Personalized notes on free accounts:** limited per month — sources report **3 to ~10 personalized invites per month**, notes up to **200 characters** (Premium: 300 chars, unlimited). Treat as scarce. [SECONDARY]
- **Notes vs blank:** across 20M+ requests acceptance was **26.42% with note vs 26.37% without** — notes don't raise acceptance, but they roughly double reply rates; shallow personalization ("we have mutual connections") can reduce acceptance ~10%. [DATA, vendor] → send blank requests to people who already know you from comments; save notes for high-value people (hiring managers, potential clients).
- **Who to connect with:** (1) people who commented on your posts or whose posts you commented on (warm), (2) AI/ML engineers and founders in your topic cluster (2nd-degree), (3) recruiters/talent partners hiring AI engineers in UAE/UK/US, (4) CTOs/founders at AI startups and agencies that outsource. Keep acceptance rate high (>40%) to avoid throttling.
- **Follow vs connect:** follow high-profile creators (Top Voices) rather than requesting connection; their feed exposure trains your interest graph. Connect with peers/potential clients.
- **Commenting as a growth lever:**
  - LinkedIn's own creator guidance: commenting (even once a week) can **triple profile views**. [PRIMARY-reported]
  - Van der Blom routine: **25–30 min/day** — reply to own comments in first 15 min; 5–10 comments on peers in your topic cluster; 5–10 on 2nd/3rd-degree discussions; daily check of clients' posts. Only comment on-topic (off-topic comments dilute your interest graph). [DATA/practitioner]
  - Vendor "10 comments/day for a month → +40% profile views, +25% engagement, +20% followers" (200 clients) and "+146% profile views over 60 days" — **[UNVERIFIED vendor claims]**, directionally consistent.
  - LinkedIn now shows impressions on comments; comments are a distribution surface in their own right.
  - **Never automate commenting.** LinkedIn is actively blocking automated comments and flags "comments that restate the post". A tool may *suggest* angles; Bilal writes the comment.
- **DM etiquette:** no pitch in the first message; reference something specific (their post/build); one ask, low friction; follow up once after ~5–7 days; move to a call only after a reply. For recruiters: short note + link to Featured portfolio. [practitioner consensus]
- **Use bookmarks/saved searches** to build curated feeds of 20 people each (top creators, clients, prospects, recruiters) — van der Blom's compliant alternative to third-party engagement tools.

---

## 7. Weekly growth routine (orchestrated, human-executed)

Evidence-based targets for a solo AI engineer with a day job:

| Cadence | Action | Evidence |
|---|---|---|
| **3 posts/week** (Tue, Wed, Thu ~6 pm PKT; ≥48h apart where possible) | 1 teaching/explainer (often PDF carousel), 1 AI-news-with-a-take (text + image or paper-figure carousel), 1 build-in-public / opinion / career lesson | Buffer 2–5/wk; van der Blom 2–4/wk, daily −26%; AuthoredUp format rotation |
| Format share over a month (~12 posts) | ~40% document/carousel, ~35% text+image, ~20% text-only, ≤5% poll; video only if he wants it | AuthoredUp multipliers; van der Blom priority list |
| **60 min after each post** | Reply to every comment with a substantive reply (adds threaded depth) | van der Blom; AuthoredUp 2.4x threaded |
| **15 min before posting** | 3–5 thoughtful comments in his topic cluster (warm-up) | van der Blom "before and after" |
| **Daily, 20–30 min** | 5–10 on-topic comments (≥2–3 sentences, add a fact/experience) on peers + 2nd-degree creators; 2–3 on target recruiters/clients | van der Blom; LinkedIn creator guidance; Hootsuite test |
| **Connections** | ~10/day on weekdays (≈50/week, half the soft cap), mostly warm; 2–3 personalized notes/month for top prospects | invite-limit data; acceptance-rate data |
| **Weekly (Sun/Mon, 20 min)** | Upload analytics export; review: top post, follower conversion, topic drift, next week's 3 slots | learning loop §4 |
| **Monthly** | Profile check (headline/About/Featured updated with newest proof); pin best post; review DEMOGRAPHICS for audience mix | van der Blom profile-redesign result |
| **Quarterly** | Re-cluster topics; re-evaluate pillars and posting slot; consider newsletter | |

Time budget ≈ 4–5 h/week including writing (posts are drafted by the tool).

---

## 8. Recommended playbook for Bilal

1. **Positioning (one sentence):** "Full Stack AI Engineer who ships LLM products — I read the AI news so builders know what actually matters." Pillars:
   - **P1 AI engineering in practice (40%)**: RAG, agents, evals, cost/latency, pgvector, Next.js + LLM patterns, failures.
   - **P2 AI news with an engineer's take (35%)**: model releases, papers, tooling — what it changes for builders, tested where possible.
   - **P3 Build in public & career (25%)**: Signal Desk and client builds (anonymised), numbers, lessons; working remotely from Karachi for global teams.
2. **Cadence:** 3/week, Tue–Thu, 5:30–7:30 pm PKT; guard the golden hour.
3. **Formats:** carousel for teaching and paper breakdowns (8–12 slides, one idea per slide, summary slide at end to encourage saves); text + one strong image/figure for news; text-only for short candid opinions. No hashtags, no em dashes, no emojis — consistent with data and his voice.
4. **Links:** for personal profiles the measured penalty is ~0–27% (≈11% in van der Blom 2026). Put the link in the body only when it is the point (a repo, a paper); otherwise describe and offer it in replies.
5. **Each post ends with a specific question or a saveable takeaway**, never an engagement-bait ask.
6. **Profile overhaul now** (headline, About, Featured, Services page, verification, Recruiters-only Open to Work if job-seeking).
7. **Comment daily on-topic**, connect ~50/week warm, notes only for top targets.
8. **Measure** follower conversion and profile-view rate per post, not likes.
9. **After 8–12 weeks** of stable cadence: start a biweekly LinkedIn newsletter from P1/P2.

---

## 9. Suggestion rules a tool can implement

Notation: `pillar_share(n)` = share of last n posts in pillars; `mult` = impressions / trailing-90-day median; thresholds are tunable defaults.

**What to post next**
1. **Trend-fit pick:** rank candidate items by `score × freshness × cos(item, nearest pillar centroid)`; suggest top 3 with suggested format. Drop items with similarity below pillar threshold (protect topic fingerprint).
2. **Freshness window:** news items lose priority after 48h unless the angle is "deep dive / what it means a week later".
3. **Pillar balance:** if the last 6 posts contain 0 from a pillar whose target share ≥25%, suggest one from that pillar next.
4. **Drift alarm:** if `pillar_share(10) < 0.8`, warn "topic drift" and suggest on-pillar items only.
5. **Winner follow-up:** if a post has `mult ≥ 1.5` or follower conversion in top 20%, suggest a follow-up within 7 days (deeper dive, carousel version, or "part 2" series).
6. **Repurpose:** a text post with `mult ≥ 1.3` and ≥5 saves → suggest a carousel version 3–6 weeks later; a strong carousel → newsletter section.
7. **Series detection:** if ≥3 posts share a cluster and format and beat the median, propose naming it a recurring series.
8. **Build-in-public quota:** at least 1 in every 4 posts should reference Bilal's own work (proof for recruiters/clients).

**When and how often**
9. **Cadence guard:** target 3/week; warn at >4/week or two posts within 24h (fatigue −26% per van der Blom); nudge if 7 days without a post.
10. **Slot picker:** default Tue/Wed/Thu 18:00 PKT; shift ±1.5h by audience location shares (UK+US > 50% → later; PK+UAE > 60% → 13:00–15:00 PKT). Recompute DST automatically.
11. **Golden-hour check:** only schedule when Bilal marks himself available for 60 min after; send a reminder at T+0 and T+30 to reply to comments.
12. **Personal timing model:** after ≥24 posts, compare medians per weekday/hour bucket (min 3 per bucket); switch slot only if the difference is >20%.

**Format and copy**
13. **Format rotation:** never suggest the same format 3 times in a row; monthly mix target ~40/35/20/5 (carousel/text+image/text/poll).
14. **Length check:** text posts 1,100–2,200 characters; carousel captions 600–1,000; flag outside range.
15. **Hashtags:** suggest 0; hard warn at ≥3.
16. **Link check:** if body contains an external link and the link is not the subject, suggest moving it; never auto-move silently.
17. **Hook check:** first line ≤ ~120 characters and contains a concrete noun/number/claim; compare hook type against his historical hook-performance table.
18. **Engagement-bait lint:** flag "comment YES", "agree?", "like if", "repost to help"; replace with a specific question.
19. **Tagging:** suggest tags only for people/orgs directly involved (≤3); never tag for reach.
20. **Saveability:** teaching posts should end with a compact takeaway list / checklist; carousels end with a summary slide.

**Learning loop**
21. **Primary KPI per post:** follower conversion per 1k reached; secondary profile-view rate; tertiary weighted ER. Rank "best posts" by these, not reactions.
22. **Hook / topic / format tables** recomputed weekly from the analytics export; display n and confidence; suppress buckets with n < 5.
23. **Audience-quality alert:** if share of viewers with target titles (AI/ML/software/eng leadership/recruiting) falls >20% vs prior 90 days, warn that recent topics attract the wrong audience.
24. **Edit freely** for typos; warn only on full rewrites after publishing.

**Networking and profile**
25. **Daily commenting queue:** surface 5–10 recent, on-pillar posts from a curated list (creators, peers, recruiters, prospects) with a one-line *angle* suggestion; Bilal writes the comment himself (no auto-drafted full comments that read as AI; never auto-post).
26. **Connection queue:** ~10/day weekdays, prioritise people who engaged with his posts in the last 14 days; keep weekly total ≤60; suggest a personalized note only for top-tier targets (budget ~3–5/month on free).
27. **Acceptance-rate guard:** if acceptance <30% over the last 50 invites, pause new invites and tighten targeting.
28. **Profile audit monthly:** check headline contains top 3 pillar keywords and "AI Engineer"; Featured contains a post from the last 60 days; skills top-5 match pillar keywords; verification done; Services page present.
29. **Compliance rule:** never scrape LinkedIn, never automate likes/comments/invites/messages, never use cookie-session extensions. Inputs come only from manual exports, user paste, or the official API.

---

## 10. Sources

**LinkedIn primary**
- LinkedIn Engineering, "Engineering the next generation of LinkedIn's Feed" (Mar 2026): https://www.linkedin.com/blog/engineering/feed/engineering-the-next-generation-of-linkedins-feed
- Hertel et al., "An Industrial-Scale Sequential Recommender for LinkedIn Feed Ranking" (arXiv 2602.12354): https://arxiv.org/abs/2602.12354
- "Large Scale Retrieval for the LinkedIn Feed using Causal Language Models" (arXiv 2510.14223): https://arxiv.org/abs/2510.14223v1
- "360Brew: A Decoder-only Foundation Model for Personalized Ranking and Recommendation" (arXiv 2501.16450): https://arxiv.org/abs/2501.16450v1
- 360Brew talk, AI Engineer World's Fair 2025: https://www.ai.engineer/talks/U0S6CfzAY5c-360brew-llm-based-personalized-ranking
- LinkedIn Help — verification benefits: https://www.linkedin.com/help/linkedin/answer/140551
- LinkedIn Help — prohibited software and extensions: https://www.linkedin.com/help/linkedin/answer/a1341387
- LinkedIn Help — creator analytics: https://www.linkedin.com/help/learning/answer/a704175
- LinkedIn Help — service provider: https://www.linkedin.com/help/lms/answer/a550345
- LinkedIn Member Post Analytics API docs: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/members/post-statistics
- Community Management API app review: https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review?view=li-lms-2023-11
- LinkedIn Hiring Assistant / Recruiter 2025 updates: https://business.linkedin.com/hire/product-update/wave2-2025
- Entrepreneur interview with Dan Roth & Tim Jurka (knowledge/advice, suggested posts): https://www.entrepreneur.com/science-technology/with-this-linkedin-algorithm-change-your-best-posts-could/470219
- TechCrunch, "LinkedIn adds a button to report AI-generated 'slop'" (30 Jul 2026): https://techcrunch.com/2026/07/30/linkedin-adds-a-button-to-report-ai-generated-slop/
- The Register on the same: https://www.theregister.com/ai-and-ml/2026/07/30/linkedin-realizes-its-users-have-been-bathing-in-ai-slop-offers-a-shower/5281436
- Social Media Today, LinkedIn limiting visibility of automated comments: https://www.socialmediatoday.com/news/linkedin-limit-visibility-of-comments-made-via-automation-tools
- Lindsey Gamble, LinkedIn: commenting can triple profile views: https://www.lindseygamble.com/blog/linkedin-shares-commenting-can-triple-profile-views
- Lindsey Gamble, new post analytics (profile views/followers from post): https://www.lindseygamble.com/blog/linkedin-adds-new-post-analytics-to-help-creators-understand-how-their-posts-drive-outcomes
- Lindsey Gamble, single-post analytics export: https://www.lindseygamble.com/blog/linkedin-introduces-exportable-single-post-analytics

**Data studies**
- Richard van der Blom on Creator Science (2026 report, 1.3M posts): https://podcast.creatorscience.com/richard-van-der-blom-2/
- Melanie Goodman summary of van der Blom 2026: https://melaniegoodmanlinkedinconsultant.substack.com/p/linkedin-algorithm-2026-reach-topic-authority
- meet-lea.com compilation with source attribution (AuthoredUp 621,833 posts; LinkedIn papers): https://meet-lea.com/en/blog/linkedin-algorithm-explained
- fast-growth.fr, proven vs invented claims: https://fast-growth.fr/linkedin-algorithm-2026-proven-invented/
- AuthoredUp video/format data (3M+ posts): https://authoredup.com/blog/linkedin-video-posts
- AuthoredUp content-mix planner (967,450 posts): https://authoredup.com/tools/linkedin-weekly-content-mix-planner
- AuthoredUp best days: https://authoredup.com/blog/best-days-to-post-linkedin
- AuthoredUp post length (UpLogic): https://authoredup.com/newsletter/uplogic-issue-4-finding-the-right-balance
- Buffer best time (4.8M posts, 2026): https://buffer.com/resources/best-time-to-post-on-linkedin/
- Buffer frequency (2M+ posts): https://buffer.com/resources/how-often-to-post-on-linkedin/
- Socialinsider LinkedIn benchmarks 2026: https://www.socialinsider.io/social-media-benchmarks/linkedin
- Socialinsider 2025 PDF: https://www.socialinsider.io/data-geeks/linkedin_benchmarks_2025.pdf
- SocialCrawl comparison of best-time studies: https://www.socialcrawl.dev/blog/best-time-to-post-on-linkedin
- Ordinal link-penalty comparison: https://www.tryordinal.com/blog/linkedin-link-penalty-study
- Hootsuite long vs short comments experiment: https://blog.hootsuite.com/long-vs-short-linkedin-comments/
- Expandi algorithm guide (aggregates AuthoredUp multipliers): https://expandi.io/blog/linkedin-algorithm/
- LeadMagic algorithm summary: https://leadmagic.io/gtm-skills/linkedin-algorithm

**Networking / profile**
- Invitation limits: https://www.topo.io/blog/linkedin-invitation-limit-guide ; https://contentin.io/glossary/weekly-invitation-limit/ ; https://help.dripify.io/en/articles/8490987-limited-personalized-connection-request-notes-for-free-linkedin-accounts
- Note vs no-note acceptance: https://lagrowthmachine.com/should-i-add-a-note-to-my-linkedin-connection-request/
- Creator mode retired: https://socialk.it/en/blog/linkedin-creator-mode-retired ; https://www.guidingtech.com/you-cant-activate-creator-mode-on-linkedin-anymore-heres-what-you-can-do-instead
- Recruiter search mechanics: https://atsverification.com/blog/how-to-optimize-linkedin-profile-for-recruiters/ ; https://eeihr.com/employment-expert/top-secret-how-recruiters-actually-search-linkedin/
- AI-engineer headline keywords: https://careery.pro/blog/personal-branding/personal-brand-keywords-for-ai-ml-engineers
- Open to Work stats: https://talentally.com/resources/should-you-use-open-to-work-on-linkedin
- Skills stat (17x views): https://www.themuse.com/advice/surprise-linkedin-endorsements-do-matter-heres-what-you-need-to-know
- Time zones / Pakistan: https://magicpost.in/de/blog/best-time-to-post-on-linkedin-pakistan ; https://contentin.io/blog/schedule-linkedin-posts-across-time-zones/
- Shield shutdown: https://useorsana.com/shield-alternative ; https://scripe.io/blog/shield-analytics-alternatives

**Creators**
- AI Accelerator Institute, 25 AI engineers to follow 2026: https://www.aiacceleratorinstitute.com/25-ai-engineers-you-should-be-following-in-2026/
- DataNorth, top AI influencers on LinkedIn 2026: https://datanorth.ai/blog/top-10-ai-influencers-to-follow-on-linkedin-in-2026
- Aurimas Griciūnas bio: https://www.oreilly.com/people/aurimas-griciunas/ ; https://substack.com/@swirlai
- Favikon AI educators ranking: https://www.favikon.com/blog/top-ai-educators-social-media
- Decoding ML: https://decodingml.substack.com/p/dml-new-year-the-new-and-improved
- Justin Welsh content matrix overview: https://thewayup.beehiiv.com/p/how-justin-welsh-built-1-5m-followers-with-a-content-system
