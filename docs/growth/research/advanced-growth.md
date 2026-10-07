# E. Advanced LinkedIn growth levers (round 2)

Prepared 2026-10-07 for Bilal Taha (Full Stack AI Engineer, Karachi). This covers what round 1 missed.

**Labels**
- **[DATA]**: a number or fact from a named source (LinkedIn itself, an arXiv paper, or a third-party study with a stated sample).
- **[S]**: secondary claim from a vendor or blog without primary data.
- **[U]**: unverified. This means my own background knowledge (cutoff mid-2026) or an inference. Check it before relying on it.

**Coverage caveat (read this first).** The session's shared web-search budget (200 calls) ran out after 9 searches in this pass. The target was 40 or more. I then fetched about 30 known primary and secondary pages directly. Sections 1, 2 and 4 are reasonably well sourced. Sections 3 (Pakistan) and 5 (creator examples) rely heavily on [U] background knowledge. Treat all follower counts as approximate and re-check them on the profiles.

---

## 0. The single most important finding: how the feed now works

- **[DATA]** LinkedIn's feed ranking is now an LLM. **360Brew** is a 150B-parameter decoder-only model. It "verbalizes" member profiles, behaviour and connections as text and handles 30+ ranking tasks without hand-built features (arXiv 2501.16450). Third parties say it went live in early 2026 and that the feed was rebuilt in March 2026 [S].
- **[DATA]** Retrieval is text-only too. LinkedIn fine-tuned LLaMA 3 as a dual encoder that embeds members and posts from text. It picks about 2,000 candidates out of hundreds of millions. The biggest gains were for newer members with small networks (arXiv 2510.14223).
- **[S]** In practice, the model reads your **profile and your post together** and predicts whether *this* reader will find it worth their time. Profile-to-post alignment is now a ranking input (Zoomsphere; SocialPilot).

**What this means for Bilal [U, inference]:**
1. His headline, About section and Experience entries are effectively part of every post's ranking prompt. A profile that says "RAG, LangGraph, agents, pgvector" makes his RAG and agents posts rank better for AI-engineer readers. Posts outside that lane get less of that boost.
2. Hashtags and keyword stuffing are irrelevant. Semantic clarity matters.
3. The tool could run a **"profile/post alignment score"**: embed the profile and each draft, then flag drafts that drift off-lane.

The reach baseline has also collapsed. Views are down about 47-50% year on year, engagement down 25-39%, and follower growth down 59% (Van der Blom; Dataslayer, March 2026) [S]. Top-creator share of visibility rose from 15% to 31% since 2022, while "other creators" fell from 57% to 28% (Van der Blom, 1.8M posts) [S]. Benchmark against peers, not against 2024 numbers.

---

## 1. LinkedIn product changes, 2025-2026

| Change | Date | Opportunity | Label |
|---|---|---|---|
| **Saves, Sends and in-network vs out-of-network reach** added to post analytics | Jun 2026 | Optimize for saves and sends, and track out-of-network share as the "is the algorithm testing me with strangers" metric | [DATA] SocialPilot, Breakout Insights |
| **Send button** next to react/comment/repost (one-tap DM share) | Jun 2026 | DM shares are among the heaviest signals. Write posts people forward to a colleague. | [S] |
| **Collab posts** (co-authored; shows in every collaborator's feed) | Beta Jun 2026 (Cannes Lions), wider rollout "over the next few months" | Co-author with a bigger AI creator or a Gulf/UK client to borrow their audience. Watch for access. | [S] Metricool, HeyOrca |
| **"Seems like AI slop" report button** | 30 Jul 2026 | Over 1M clicks; flagged content gets about **40% fewer views**. Generic AI-sounding drafts are now a measurable risk. | [S] SocialPilot |
| **AI content suppression statement** (VP Laura Lorenzetti) | 20 May 2026 | AI-assisted is fine if it is the author's own voice and view. A "94% detection" figure circulates but is unverified. | [S] Social Media Today via All In |
| **Post Proofreader** replaces "rewrite with AI" | Aug-Sep 2026 | Native tool is now light-touch. Fine as a final pass. | [S] |
| **AI clips and chapters for LinkedIn Live replays** | Aug 2026 | One Live session can yield several clips | [S] |
| **Newsletters open to all members**, with video covers and email open-rate metrics | Early 2026 (email metrics since Feb 2025) | See 1a | [S] |
| **Vertical video feed** plus CapCut two-tap export | Early 2026 | Video views up 36% YoY (about 154B). A 30-90s demo of his own agent is a fit. | [S] |
| **Verification expansion**, plus colleague vouching | Sep 2026 | Verified badge shows in search results and is a trust signal for recruiters. Free to do (needs ID; no sign-up done here). | [S] AlmCorp, SocialPilot |
| **Conversational / AI people search** | US Premium Nov 2025, wider in 2026; non-US availability unclear | See 1b | [DATA] TechCrunch |
| **Clickable links on images/videos** | "Coming weeks" (late 2026) | A possible legitimate way to link without the body-link penalty. Unconfirmed. | [S] SocialPilot |
| Collaborative Articles **read-only**; gold Community Top Voice badge retired 8 Oct 2024 | 2024 | Dead channel. Ignore. | [DATA] LinkedIn Help a6245087 |
| **Games** (Pinpoint, Crossclimb etc.) | ongoing | No growth value | [U] |
| GIFs in comments; "connected apps" in Skills (e.g., showcase GitHub) | Jun 2026 | Connected apps could display GitHub proof on the profile | [S] HeyOrca |

### 1a. Newsletters

- **[S]** Each edition triggers an email, a push notification and an in-app alert to every subscriber. Normal posts reach roughly 5-7% of an audience (Moburst).
- **[S]** At launch, LinkedIn sends **one invite to the whole network** and never re-invites. The first 2-3 editions get the most exposure, so they must be the strongest (LinkedInPreview).
- **[S]** New followers are auto-invited to subscribe.
- **[S]** About 60% of top newsletters publish weekly. Max one edition per 24h. Google indexes newsletters. Company newsletters see about a 40% "open" rate. 150+ followers are recommended to start.
- **[U] Recommendation:** launch a newsletter only when connections plus followers reach about 3-5k, since the one-time invite is a scarce asset. A weekly or biweekly "AI Engineer's Wire" fits him, built from Signal Desk's scored items. Each edition should be a deeper take on one paper, release or benchmark, with his build notes. Time the launch with a strong carousel week.

### 1b. AI people search: how to be found

- **[DATA]** Queries look like "co-founded a productivity company in NYC". The results are inconsistent, for example "YC" and "Y Combinator" give different results (TechCrunch, Rohan Rajiv).
- **[S]** Write the About and Experience sections in descriptive natural language: what you build, for whom, with what result. Keep skills accurate and get verified. Descriptive posts are also easier for retrieval systems to match (AlmCorp).
- **[U]** Write the queries a hiring manager would type, and make sure the profile literally answers them. Examples: "AI engineer in Pakistan who has built RAG with pgvector", "LangGraph agent developer available for remote contract", "FastAPI + Next.js full stack AI engineer". The tool can run a "**query-coverage check**" that scores the profile text against 20 synthetic recruiter or client queries with embeddings.

### 1c. Top Voice (blue) in 2026

- **[DATA]** Invite-only and decided by editors. There is no follower threshold. LinkedIn checks five things: platform presence (consistent), quality and originality, subject-matter expertise in one lane, safety and professionalism, and discretionary "prominence", including **local-market influence**. Reviewed twice a year; the badge lasts at least six months (LinkedIn Help; Blendin; SocialMediaToday).
- **[U]** The local-market clause is a real opening. A consistent, original AI-engineering voice from Pakistan competes against a far smaller pool than in the US or India.

### 1d. Follow vs Connect, Creator Mode

- **[U]** Creator Mode was folded into default profiles in 2024. Setting the primary profile button to "Follow" is still available in settings. For his stage, keep **Connect** as primary: connections feed newsletter invites and a 2nd-degree network for recruiters. Switch to Follow once he hits the connection cap or his inbound requests become mostly noise.

---

## 2. How recruiters and clients find AI engineers (2026)

- **[DATA]** **Hiring Assistant** (agentic recruiter) runs dozens of searches across LinkedIn for each role. It learns from that recruiter's past Recruiter activity and their feedback on candidates. It applies "LinkedIn fit signals ... beyond stated qualifications" and screens thousands of LinkedIn and ATS applicants against the recruiter's criteria (business.linkedin.com).
- **[U]** Because it learns from recruiter feedback, being *messaged and replied to* matters. Recruiter has long shown "more likely to respond" style signals (Open to Work, past InMail responsiveness, engaged with the company's page or posts).
- **[U, practical]** Things that likely help:
  1. **Open to Work set to recruiters only.** Hidden from his network but visible in Recruiter.
  2. Remote job preferences set explicitly, with locations including UAE, UK, US and "Remote".
  3. Verification.
  4. Following target companies and engaging with their posts. The "engaged with your company" talent pool exists in Recruiter.
  5. Replying to every InMail, even with a no. Response rate likely feeds candidate ranking.
- **[S]** Sales Navigator has a "**Posted on LinkedIn in past 30 days**" filter, so posting makes him visible to people looking for active members (ConnectSafely). Recruiter has comparable activity filters [U]. **So posting activity does matter for discovery, not just reach.**
- **[U] Skills.** Skills listed under each Experience entry feed skills-based matching ("You're a top applicant", "skills match X/10"). Put RAG, LangGraph, pgvector, FastAPI and LLM evaluation into the Experience entries, not just the Skills list. The 100-skill cap and top-three endorsements display are confirmed [DATA] (LinkedIn Help a568120).
- **[U] Easy Apply vs external.** Easy Apply roles draw hundreds of applicants and AI screening. External roles plus a direct note to the hiring manager or recruiter, found via the job poster or "people you can reach out to", convert better.
- **[U] Services page / marketplace.** Free Services page with up to 10 services. Clients send "request for proposal" leads, and reviews from past clients show on the page. Ranking is believed to weight relevance, reviews, response rate and Premium Business status.
  - Fetches of the official help and business pages returned 404, so none of this is verified.
  - Action: set up a Services page ("AI/ML engineering", "chatbot development", "application development") and collect 3-5 reviews from past clients.

---

## 3. Pakistan / South Asia specifics

- **[DATA]** Wise can send USD to PKR bank accounts: about $8-13 fee per $1,000, most arriving within a day (wise.com). **[U]** Wise does *not* let Pakistan residents open personal multi-currency accounts. Treat Wise as a client-side rail ("pay me via Wise to my PKR account"), not a holding account.
- **[U]** **Payoneer** is the de facto receiving rail for Pakistani freelancers: USD/EUR/GBP receiving accounts, withdrawal to local banks. Others in use: **SadaPay/NayaPay** for smaller inflows, and direct SWIFT to a **Roshan Digital / freelancer FCY account** (an SBP freelancer account exists). Deel and Remote pay contractors in Pakistan via bank transfer or Payoneer.
- **[U]** **Remote talent platforms that hire in Pakistan:** Turing, Arc.dev, Toptal (very selective), Andela (expanded beyond Africa in 2024), X-Team, Crossover (high pay with strict monitoring), Upwork and Contra. Many US startups hire via Deel or Remote as EOR or contractor.
  - Arc lists freelance rates of $15-110+/h and India at $10-80/h [DATA] (arc.dev). No Pakistan-specific figure was retrieved.
  - **[U] Recent wave:** "AI trainer / RLHF" contract work (Turing, Outlier/Scale, Mercor, micro1) is heavily marketed on LinkedIn to South Asian engineers. It pays OK, but it is a weak career signal compared with shipping agents.
- **[U] Time zones.** PKT (UTC+5) overlaps fully with the Gulf (UTC+4; a one-hour difference) and has a 4-5 hour overlap with UK mornings and afternoons. US overlap is evenings only.
  - Pitch Gulf and UK clients on "same-day overlap at offshore rates".
  - The UAE and Saudi Arabia are funding large AI programmes (e.g., Saudi HUMAIN, UAE G42) and hire Pakistani engineers in person and remotely.
  - LinkedIn content written for a Gulf CTO audience (Arabic-English bilingual enterprises, data residency, cost) is an underserved niche.
- **[U] LinkedIn Premium** has regional (purchasing-power) pricing. Pakistan prices are much lower than US prices. Exact current PKR prices were not verified (the page requires login).
  - Premium is required for some AI search features.
  - Recommendation: buy only Premium Career, and only if job hunting is the near-term goal. Otherwise stay free (zero-cost preference).
- **[U] Patterns from Pakistani developers who land remote AI work via LinkedIn:**
  - Public build logs with demos.
  - Open-source repos linked in Featured.
  - Commenting on posts by founders who are hiring.
  - DMs referencing a specific shipped artifact.
  - Local community visibility (e.g., GDG Kolachi / Karachi, PyData Karachi, Build with AI events, LUMS/NUST/FAST alumni networks, "Pakistani techies" groups).
  - No quantified case studies were retrieved this round.

---

## 4. Advanced content tactics, with evidence

### Format numbers (2026)
- **[S]** Document/PDF carousel 6.60% engagement; native video 5.60%; image 3.20%; text 2.00%. Polls 0.07% (Dataslayer, Feb 2026).
- **[S]** Another dataset (Expandi) puts polls at 1.78x reach but 0.37x engagement, and reshares-with-light-commentary at **0.29x reach**.
- Conclusion: skip polls except as a rare conversation starter, and rarely "repost with thoughts". Write a native post instead.

### Carousels
- **[S]** Optimal length is disputed: 5-10 slides (Dataslayer: engagement drops after slide 10) versus 8-12 (SocialPilot). Use **7-10**. Use 1080x1350 portrait, one idea per slide, and a final slide that is worth saving: a checklist, table or decision tree.

### Saves and sends are the target metric
- **[S]** Saves are about 5x a like and about 2x a 15+ word comment (AuthoredUp, about 620k-995k posts).
- **[S]** Thresholds: save rate above 1% of impressions means "retention value"; above 2% means "reference-quality". Send rate above 0.5% means "private circulation" (All In).
- **What gets saved:** named frameworks, comparison tables, checklists.
- **What gets sent:** evidence-backed positions and case studies with numbers.
- **For him:** "RAG eval checklist", "LangGraph vs plain function-calling: when each wins", and a "model release card" comparing benchmarks against price.

### Dwell
- **[S]** One vendor example: a post with 100 likes and 10s dwell travelled further than one with 500 likes and 2s dwell. Posts with 61s+ dwell reach about 15.6% engagement (SocialPilot; Meet-Lea).
- Paper figures and benchmark charts in carousels increase dwell [U].

### Links
- **[S]** One body link means an 18.8% median reach drop (Van der Blom, 1.3M posts). Others report about 60%.
- **[S]** The first-comment link workaround reportedly no longer avoids the penalty ("bridge behaviour" detection). Put links in the comments only when needed, or wait for the image-link feature. Better still, make the post self-contained.

### Reply speed
- **[S]** Replying within 15-30 minutes is associated with about 64% more comments and 2.3x views (Van der Blom via Dataslayer).
- **[S]** Threaded replies give up to 2.4x reach (Meet-Lea). Top 1% creators reply about 741% more often than average (SocialPilot).
- **[S]** Only about 5% of posts that underperform in the first hour recover (Dataslayer).
- Note: Meet-Lea says no verified percentage exists for reply speed. Treat these as directional.

### Comments as a growth engine
- **[S]** Comments of 15+ words count; generic ones count for nothing.
- **[S]** Engagement pods are detected with a claimed 97% accuracy; flagged accounts saw a 96% reach cut, with 60-90 days to recover (ConnectSafely). **Never join pods.**

### Tagging
- **[S]** Tag only people the post is about and who are likely to reply. An ignored tag is a negative signal; mass-tagging is suppressed.

### Hashtags
- **[S]** No effect up to about 2. 3-5 slightly reduce reach, and 6+ hurt (AuthoredUp, eight-month study). This matches his no-hashtag voice.

### Edit, delete, repost
- **[U]** Small edits after the first hour are generally considered safe. Heavy edits in the first minutes may reset or confuse distribution.
- **[U]** Deleting and reposting the same content is risky. It may be treated as a duplicate and loses the original engagement. Instead, re-cut the idea with a new hook 4-8 weeks later.

### Series and recurring formats
- **[U, strong practitioner consensus]** Named recurring formats build expectation and repeat dwell, and the LLM ranker learns a consistent author lane. Examples: "Paper of the Week", "What I'd build with X", "Model card in 8 slides", and a monthly "AI engineer job-market notes from Karachi".

### Hooks
- **[S]** The first ~150 characters before "see more" decide the click, and "see more" clicks are a signal.
- **[U]** Hooks that work for technical audiences: a specific number, a counterintuitive claim tied to evidence, or "I built X; here's what broke".

### Video and demos
- **[S]** Video sweet spot is 30-90s and under 3 minutes. Native beats a YouTube link.
- **[U]** A screen-recorded agent demo with captions (most watch muted) is the strongest proof-of-work format for an AI engineer.

### Open-source posts
- **[U]** "I opened a PR to LangGraph / pgvector / LlamaIndex, here's what I learned about the internals" pulls practitioner saves and recruiter credibility. Maintainers often reshare it, which brings out-of-network reach.

### Collab posts and newsletter cross-promotion
- **[U]** When collab posts reach him, pair with complementary creators (an MLOps person, a Gulf CTO).
- **[U]** Cross-promote by posting a 3-slide teaser carousel the day an edition drops. Do not just share the newsletter link, because of the link penalty.

---

## 5. AI-engineering creators: patterns to copy

All follower counts are **[U]**: approximate, from memory, as of 2025-mid 2026. Verify on the profiles.

| Creator | Base | Approx. followers | What / cadence | Pattern |
|---|---|---|---|---|
| Akshay Pachaar (Daily Dose of DS) | India | 200k+ | Daily diagram-heavy explainers (RAG, agents, MCP), clean visuals | One visual per concept; reusable diagrams |
| Avi Chawla (Daily Dose of DS) | India | 150k+ | Same studio; technique explainers plus newsletter funnel | Newsletter as the owned asset |
| Shubham Saboo (Unwind AI, awesome-llm-apps) | India-origin, US | 100k+ | Open-source agent app templates, release takes | **OSS repo as growth engine** (repo stars and LinkedIn feed each other) |
| Rakesh Gohel | India | 100k+ | Agent and AI-workflow carousels, near-daily | Grew fast mainly through carousels |
| Brij Kishore Pandey | India-origin, US | 1M+ (reported) | Architecture and AI cheat-sheets | Cheat-sheet style "save bait" |
| Aishwarya Srinivasan | India-origin, US | 600k+ | AI careers plus tech, frequent | Career-plus-tech blend |
| Aurimas Griciunas (SwirlAI) | Lithuania | 150k+ | LLMOps/agents diagrams, newsletter | Grew from a few thousand to six figures in about two years via diagrams plus newsletter |
| Paul Iusztin (Decoding ML) | Romania | 50-100k | Production LLM/RAG courses, open-source courses | Free open-source course as lead magnet |
| Pau Labarta Bajo (Real-World ML) | Spain | 100k+ | Building real ML systems, build-along | "Build with me" series |
| Damien Benveniste (The AiEdge) | US | 150k+ | Deep ML explainers, courses | Depth over volume |
| Eduardo Ordax (AWS) | Spain | 200k+ | GenAI news plus diagrams, daily | News-take cadence |
| Philipp Schmid (Hugging Face, then Google DeepMind) | Germany | 100k+ | Model releases, how-to-run, benchmarks | **Speed on releases plus hands-on notebook** (closest to Bilal's news-take lane) |
| Maxime Labonne (Liquid AI) | France | 100k+ | Model merging, LLM course, papers | Signature open-source asset (LLM Course repo) |
| Sebastian Raschka | US | 150k+ | Paper breakdowns, figures, book | **Paper figures plus own commentary** |
| Chip Huyen | US | 200k+ | Infrequent long-form, book | Rare but high-signal |
| Armand Ruiz (IBM) | US | 200k+ | Enterprise AI frameworks, daily | Enterprise buyer lens |
| Allie K. Miller | US | 1.5M+ | AI business news/takes | News-take at scale (business, less technical) |
| Hamza Farooq (Traversaal.ai) | Pakistani-origin, US | tens of thousands | LLM/RAG teaching, startup | Teaching plus cohort courses |

### Repeatable patterns [U, synthesized]

1. **A visual signature.** Consistent diagram or carousel style that can be recognized at a glance.
2. **One owned asset.** An OSS repo, free course or newsletter that posts point to, and that compounds.
3. **A narrow lane.** RAG/agents/LLMOps, not "AI everything", which matches the LLM ranker's profile alignment.
4. **Speed on releases plus a hands-on angle.** "I ran it; here's what it actually does" rather than restating the announcement.
5. **Near-daily cadence for the fastest growers.** Bilal's 3 per week is sustainable. Growth will be slower but steadier. Comments fill the gaps.
6. **Comment early on larger creators' posts in the same lane.** Their audience is his target audience.

**Gap:** very few visible AI-engineering creators are *based in* Pakistan. The local-market Top Voice angle and Gulf client positioning are both under-supplied [U].

---

## 6. Feature ideas no existing tool offers

All ideas are grounded in the findings above. None requires automation of LinkedIn actions.

1. **Profile-post alignment score.** Embed the profile (headline, About, Experience) and each draft in pgvector. Warn when a draft is off-lane, or suggest a profile tweak when he deliberately expands his lane. This mirrors 360Brew's profile-plus-post input.
2. **Recruiter-query coverage test.** Generate 20-30 realistic natural-language queries from target job descriptions (e.g., "remote LangGraph engineer Pakistan", "RAG engineer UAE contract"). Score the profile text against them and show which queries he would not match, plus a suggested sentence for each gap.
3. **Skill-demand driven content.** Scrape (Firecrawl, public pages only) job postings for AI engineers in UAE, KSA, UK and remote. Extract skill frequencies, and compare them with skills he has *demonstrated in posts*. Output: "MCP appears in 34% of postings; you've never posted about it. Here are three post ideas from your wire."
4. **Save-worthiness predictor.** Before publishing, an LLM rubric checks: is there a reusable artifact (table, checklist, framework)? Is the hook under 150 characters? Is there a link in the body (penalty)? Is it generic or AI-slop-like (now reportable, about 40% fewer views)? Target saves above 1% and sends above 0.5%.
5. **Manual analytics ledger with the new metrics.** He pastes impressions, saves, sends and in/out-of-network reach after 48h. The tool tracks save rate, send rate and out-of-network share per format and series, and learns his own best formats instead of using industry averages.
6. **Reply-time SLA timer.** When he marks a post published, the tool starts a 60-minute window with nudges at 10, 30 and 60 minutes. It drafts replies to the comments he pastes in, aiming for multi-turn threads. It also logs his median reply time, given the evidence on the first-hour window and replying within 30 minutes.
7. **Comment target queue ("borrowed audiences").** A curated list of 30-50 creators and hiring founders in his lane, together with fresh public posts surfaced by the wire. It drafts 15+ word substantive comments that add a data point from Signal Desk's scored items. It tracks which comments led to profile views or connection requests, which he logs manually.
8. **Proof-portfolio auto-builder.** From his GitHub (public API), shipped demos and best posts, build Featured-section candidates and a one-page proof site. It also produces "case-study cards" (problem, stack, metric) he can attach to DMs and Services RFP replies.
9. **Hiring-manager network map.** From public job posts and company pages, map who posts AI roles in target regions (Gulf, UK, remote US). Mark relationship states (not connected, connected, commented, conversed) and suggest the next human action. For example: "comment on X's post about their agent launch before sending a connect note".
10. **Release-day playbook.** When the wire detects a major model or paper release, auto-assemble a carousel skeleton (figure slots, benchmark table, "what it means for RAG/agent builders") so he can publish within hours. Speed on releases is what the Philipp Schmid style of creator does.
11. **Series manager.** Track named recurring series, flag when one lapses, and pre-fill the next edition from the wire.
12. **Newsletter launch readiness meter.** Because the network-wide invite happens once, track connections and followers plus a backlog of three strong editions. Recommend the launch date only when both are ready.
13. **Gulf/UK positioning lens.** A variant of each post with a business framing for Gulf and UK decision-makers: cost, data residency, Arabic support. Plus a time-zone note for scheduling: post at Gulf morning, which is also good for PKT.
14. **AI-slop and voice guard.** A check against his voice profile and a no-em-dash rule. It flags phrases common in generic LLM output, since the report button now carries a reach cost.
15. **Pod and risk guard.** Warn if he engages with the same small group in a pod-like pattern (detection is claimed at 97%, with 60-90 day recovery). Also warn about connection-request bursts.
16. **Top Voice readiness tracker.** Map his activity against the five editorial criteria: consistency streak, lane focus percentage, originality (share of posts containing his own build or data), community engagement count, and local prominence (Pakistan mentions and events).

---

## Sources

- 360Brew paper: https://arxiv.org/abs/2501.16450
- LLM dual-encoder feed retrieval: https://arxiv.org/abs/2510.14223
- LinkedIn Help, Top Voices: https://www.linkedin.com/help/linkedin/answer/a6245087
- LinkedIn Help, endorsements/skills: https://www.linkedin.com/help/linkedin/answer/a568120
- Hiring Assistant: https://business.linkedin.com/talent-solutions/hiring-assistant
- TechCrunch, AI people search: https://techcrunch.com/2025/11/13/linkedin-adds-ai-powered-search-to-help-users-find-people
- AlmCorp, conversational search: https://almcorp.com/blog/linkedin-ai-powered-conversational-search/
- ConnectSafely, people search: https://connectsafely.ai/articles/linkedin-people-search
- SocialPilot features (Sep 2026): https://www.socialpilot.co/blog/new-linkedin-features-and-updates
- SocialPilot algorithm (Sep 2026): https://www.socialpilot.co/blog/linkedin-algorithm
- All In, 2026 algorithm changes: https://media-all.in/en/blog/linkedin-fall-2026-algorithm-changes/
- All In, saves and sends: https://media-all.in/en/blog/linkedin-saves-sends-hidden-metrics/
- Dataslayer, Feb 2026: https://www.dataslayer.ai/blog/linkedin-algorithm-february-2026-whats-working-now
- Meet-Lea, algorithm data: https://meet-lea.com/en/blog/linkedin-algorithm-explained
- Expandi, algorithm: https://expandi.io/blog/linkedin-algorithm/
- Zoomsphere, 2026 algorithm: https://www.zoomsphere.com/blog/linkedin-algorithm-2026-why-generic-ai-content-kills-your-organic-reach
- Breakout Insights, three features: https://thebreakoutinsights.substack.com/p/linkedin-just-rolled-out-3-new-features
- HeyOrca, monthly news: https://www.heyorca.com/blog/linkedin-social-news
- Metricool, collab posts: https://metricool.com/linkedin-collaborative-posts/
- Moburst, newsletters: https://www.moburst.com/the-best-linkedin-newsletter-strategies-for-business-growth-in-2026/
- LinkedInPreview, newsletter growth: https://linkedinpreview.com/blog/linkedin-newsletter-growth-2026
- Blendin, Top Voice 2026: https://blendin.ai/blog/linkedin-top-voice-2026
- SocialMediaToday, Top Voice: https://www.socialmediatoday.com/news/linkedin-updates-top-voice-badge/738428/
- SocialMediaToday, collaborative articles: https://www.socialmediatoday.com/news/linkedins-removing-top-voice-badges-collaborative-articles/728247/
- Wise, send to Pakistan: https://wise.com/us/send-money/send-money-to-pakistan
- Arc.dev rates: https://arc.dev/hire-developers/pakistan
