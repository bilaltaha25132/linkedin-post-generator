# 04 — Engage feed and client-post discovery (no LinkedIn scraping)

Research date: 2026-10-07. Scope: how Signal Desk can (a) surface AI posts on LinkedIn worth a
thoughtful comment from Bilal and draft that comment, and (b) surface "client posts" (people or
companies hiring AI engineers or AI contractors), without scraping LinkedIn, without automating any
LinkedIn action, and on a zero-cost budget.

Legend: **[V]** verified against a primary or official source during this research.
**[R]** reported by a secondary source (marketing blog, vendor comparison) and not independently
verified. **[U]** my own inference or knowledge, unverified.

---

## TL;DR

1. **Search engines index LinkedIn posts, but late.** Google/Bing-backed APIs return
   `linkedin.com/posts/...` URLs, yet fresh (<6h) posts are essentially absent. My test searches
   returned posts that were 10 to 22 months old; an August 2026 study of 9,805 LinkedIn URLs found
   the median *ranking* feed post was 300 days old and only 10% were under three months [R].
   Search APIs are therefore fine for **client posts** (a 1 to 7 day old hiring post is still
   useful) but **cannot deliver "hot" posts** for commenting.
2. **"Hot" posts must come from Bilal himself** (user-initiated capture): paste a link/text,
   an Android PWA share target, or a desktop bookmarklet. This is the only fully compliant way to
   get a post that is 0 to 6 hours old. Signal Desk adds value by (a) a watchlist "rounds" page that
   links him straight to each creator's activity page, and (b) drafting the comment.
3. **Every LinkedIn post URL carries its own timestamp.** The activity/share ID's top 41 bits are
   Unix ms [V via multiple tools + my own decode]. `ms = id >> 22`. Use it to drop stale search hits
   and to compute "age" for the hot score without fetching anything.
4. **Free search tiers in Oct 2026:** Tavily 1,000 credits/month recurring (best fit), Exa $10/month
   recurring credit plus $20 signup, Serper 2,500 one-time, SerpApi 250/month, Firecrawl search
   2 credits per 10 results (spends the small Firecrawl budget), Jina search ~1,000 searches from
   10M one-time tokens (non-commercial). **Brave dropped its free tier (Feb 2026), Bing Search API
   retired (Aug 2025), Google Custom Search JSON API closed to new customers and shuts down
   1 Jan 2027.**
5. **Do not build a Chrome extension that reads LinkedIn's DOM.** LinkedIn's prohibited-software
   page bans extensions that "scrape, modify the appearance of, or automate activity" [V]; Kleo's
   free extension was killed by a LinkedIn cease-and-desist in 2025 [R]. A bookmarklet that only
   sends the current URL plus the text Bilal highlighted is the lowest-risk desktop path.
6. **LinkedIn now suppresses automated / generic AI comments** (policy text added Aug 2025 [V]).
   Drafts must be specific, carry a first-hand data point, and always be edited and posted by hand.

---

## 1. Discovering LinkedIn posts without scraping LinkedIn

### 1.1 Provider matrix

| Provider | Free tier (Oct 2026) | Freshness filter | LinkedIn post coverage | Notes / ToS |
|---|---|---|---|---|
| **Tavily** | 1,000 credits/month, resets monthly, no card [V docs/FAQ]. Basic search = 1 credit, advanced = 2 [R] | `time_range` = day/week/month/year, `start_date`/`end_date` [V] | Generic web index; `include_domains: ["linkedin.com"]` (max 300, `restrict`/`prefer` mode) [V]. Coverage of fresh posts unknown [U] | Best recurring free budget: ~33 searches/day. |
| **Exa** | $20 signup credit + **$10/month** recurring; search with contents $7/1k [R: Exa changelog + tinyfish] | `startPublishedDate` / `endPublishedDate` (ISO) [V] | No LinkedIn-specific category in current docs (categories: company, publication, news, personal site, financial report, people) [V]. `includeDomains` accepts paths, e.g. `linkedin.com/posts` [V: "hostnames, paths"] | Semantic queries ("someone hiring a contractor to build a RAG chatbot") are a strength [U]. Its `people` category targets profiles, not posts. |
| **Serper.dev** (Google SERP) | 2,500 queries **one-time**, no card [R] | Google `tbs=qdr:h/d/w` [U, standard Google param] | Google's index of LinkedIn posts; lag of days [R] | Cheapest paid fallback ($1/1k). Scraping Google's SERP is the vendor's risk, not ours. |
| **SerpApi** | 250 searches/month, 50/hr [R] | Google `tbs` [U] | As Google | Stable free tier; small. |
| **Firecrawl /search** | Uses Firecrawl credits: 2 credits per 10 results without scraping [V docs] | `tbs` qdr:h/d/w/m/y, `sbd:1` sort-by-date, custom ranges [V] | Returns Google-style results; `includeDomains` adds `site:` [V]. **Firecrawl scrape blocks LinkedIn** ("This website is no longer supported") [R] — so only use the search snippet, never scrape the result | Spends the same small credit pool the wire uses; low priority. |
| **Jina s.jina.ai** | 10M tokens one-time per key, ≥10k tokens/search → ≤1,000 searches; non-commercial [R] | Not documented [U] | Generic | Key required. |
| **Brave Search API** | **Free tier removed Feb 2026**; $5/month credit (~1,000 req) only with public attribution, card required [R: implicator.ai, agentdeals] | `freshness=pd/pw` [U] | Independent index | Not zero-cost-safe (card on file). |
| **Google Custom Search JSON API** | **Closed to new customers; shutdown 1 Jan 2027**; "search the entire web" removed for new engines (2026) [R: brave.com, addsearch, parallel.ai] | — | — | Do not build on it. |
| **Bing Search API** | **Retired 11 Aug 2025**; replacement "Grounding with Bing" ~$35/1k, LLM chunks only [R: windowscentral, neowin] | — | — | Dead. |

### 1.2 Freshness test (done during this research)

- `site:linkedin.com/posts hiring "AI engineer" remote` → mostly profiles and job boards, not posts.
- `site:linkedin.com/posts "looking for" "AI developer" contract freelance agentic` → real posts,
  newest decoded to **2025-11-12** (11 months old).
- `site:linkedin.com/posts agents RAG this week` → posts from 2023-12 to 2025-12.
- Restricting to `linkedin.com` with "October 2026" → newest post decoded to **2025-12-08**.

Caveat: the tool I used is not a raw Google `qdr:d` query, so a paid SERP API with `tbs=qdr:d`
will do better. But the Indie Hackers study [R] (1,260 searches, Aug 2026: median ranking feed post
300 days old, 10% under 3 months) points the same way. **Expect search APIs to surface posts that
are 1 day to several weeks old, sparsely.** Good enough for leads, not for "comment in the first hour".

### 1.3 Post timestamp from the URL (free, no fetch)

Every post URL contains `activity-<19 digits>` or `urn:li:activity|share|ugcPost:<id>`.
`createdAtMs = BigInt(id) >> 22n`. Checked: `7394293508917944321 → 2025-11-12T08:42Z`,
`7403795573482610688 → 2025-12-08T14:00Z`. Tools such as trevorfox.com's date extractor use the
same rule [V]. In TypeScript:

```ts
const m = url.match(/(?:activity[-:]|share:|ugcPost:)(\d{18,20})/);
const postedAt = m ? new Date(Number(BigInt(m[1]) >> 22n)) : null;
```

### 1.4 Can a post's text be fetched without logging in?

Tested with WebFetch on a public post found via search:
- `https://www.linkedin.com/posts/<slug>_...-activity-<id>-xxxx` → full post text, author, headline,
  relative date, reaction count were visible; comment count hidden; a login wall overlay present.
- `https://www.linkedin.com/embed/feed/update/urn:li:activity:<id>` → same text via the official
  embed iframe (works only for public posts; supports `share`, `activity`, `ugcPost` URNs) [V].

**Compliance note [U]:** LinkedIn's User Agreement forbids scraping "by any means", including
server-side fetching. A single fetch triggered by Bilal for a post he is looking at is very low
volume and uses LinkedIn's own public embed, but it is still automated access. The cleanest path is
to have Bilal's capture action send the text he highlighted, and to use the embed fetch only as an
opt-in fallback when he pasted a bare URL. Never fetch search results in bulk.

---

## 2. Who to watch

### 2.1 How the commercial tools do it

- **Taplio "Engage"**: pre-built influencer lists by niche (AI is one) plus "Custom lists" of people
  whose latest posts appear in a feed with a "Smart Reply" generator [V: Taplio help center].
  Taplio gets that data through its Chrome extension and a LinkedIn session cookie, which Taplio's
  own docs concede LinkedIn treats as an automation tool [R: magicpost].
- **Engage AI / Kleo**: in-page extension button in the comment box that generates a comment the
  user edits and posts [R]. **Kleo's free extension was removed after a LinkedIn cease-and-desist
  (reported June 2025, ~70k users), relaunched as a $99/mo web app** [R: magicpost, contentin].
- **LinkedIn v. ProAPIs (Oct 2025)**: LinkedIn sued a scraping-API vendor that used ~1M fake
  accounts and resold posts/comments data [V: therecord.media, securityaffairs]. Third-party
  "LinkedIn post search" APIs are built on exactly this; avoid them.

Takeaway: the "list of creators → feed of their latest posts" UX is right; the data plumbing those
tools use is what we cannot copy. Our substitute is a **rounds page**: the watchlist with one-click
links to `https://www.linkedin.com/in/<slug>/recent-activity/all/` (or the company's
`/company/<slug>/posts/`), which Bilal opens in his own logged-in browser. Signal Desk tracks only
"last visited" and his own notes. Zero automated access.

### 2.2 "Hot" signal (score when a post is captured or found)

| Signal | Weight idea [U] | Source |
|---|---|---|
| Age from URL ID: <2h best, 2–6h good, 6–24h weak, >24h skip for comments | high | §1.3 |
| Author tier (watchlist tier A/B/C) | high | watchlist |
| On Bilal's beat (RAG, agents, LangGraph, evals, pgvector, LLM infra, AI hiring) — embedding similarity vs. his voice profile/pgvector corpus | high | existing pgvector |
| He has a first-hand angle (matches something he shipped) | high | voice profile |
| Comment count still low relative to reactions (room to be seen) | medium | visible on page; Bilal can type it |
| Topic is also trending on HN / arXiv / lab blogs today (§3) | medium | wire |

Note: van der Blom's data says commenting once on a creator raises the odds you see their next post
(~80%) [R: mercermackay summary], so repeated, useful comments on the same 10–20 people compound.

### 2.3 Watchlist (seed, 48 entries)

URL provenance: **[L]** = URL printed in a public listicle (tryordinal 2025 or magicpost 2026) or
returned by search; **[U]** = from my knowledge, verify before seeding. Tier A = big reach and on
beat, B = on beat practitioners (best comment ROI: smaller threads, technical audience), C = reach but
off beat (comment rarely).

**Founders / lab and company leaders**

| Name | Why | URL | Tier |
|---|---|---|---|
| Andrew Ng | Agentic workflows, education | https://www.linkedin.com/in/andrewyng/ [L] | A |
| Demis Hassabis | Google DeepMind CEO | https://www.linkedin.com/in/demishassabis/ [L] | A |
| Mustafa Suleyman | Microsoft AI CEO | https://www.linkedin.com/in/mustafa-suleyman/ [L] | B |
| Arthur Mensch | Mistral CEO, open models | https://www.linkedin.com/in/arthur-mensch/ [L] | B |
| Fidji Simo | OpenAI Applications CEO | https://www.linkedin.com/in/fidjisimo/ [L] | B |
| Anton Osika | Lovable, AI app builders | https://www.linkedin.com/in/antonosika/ [L] | B |
| Matt Garman | AWS CEO (Bedrock, agents infra) | https://www.linkedin.com/in/mattgarman/ [L] | C |
| Satya Nadella | Microsoft CEO | https://www.linkedin.com/in/satyanadella/ [L] | C |
| Sundar Pichai | Google CEO | https://www.linkedin.com/in/sundarpichai/ [L] | C |
| Harrison Chase | LangChain / LangGraph CEO (his exact stack) | https://www.linkedin.com/in/harrison-chase-961287118/ [U] | A |
| Jerry Liu | LlamaIndex CEO, RAG / document agents | https://www.linkedin.com/in/jerry-liu-64390071/ [U] | A |
| Clem Delangue | Hugging Face CEO, open source | https://www.linkedin.com/in/clementdelangue/ [U] | B |
| Sarah Guo | Conviction VC, AI startups | https://www.linkedin.com/in/sarahxguo/ [L] | B |

**Researchers / educators**

| Name | Why | URL | Tier |
|---|---|---|---|
| Yann LeCun | Meta chief AI scientist, debates | https://www.linkedin.com/in/yann-lecun/ [L] | B |
| Sebastian Raschka | LLM internals, from-scratch | https://www.linkedin.com/in/sebastianraschka/ [L] | A |
| Chip Huyen | *AI Engineering* author | https://www.linkedin.com/in/chiphuyen/ [L] | A |
| Andriy Burkov | Contrarian LLM takes, big threads | https://www.linkedin.com/in/andriyburkov/ [L] | B |
| Gary Marcus | Skeptic, high-comment threads | https://www.linkedin.com/in/gary-marcus-b6384b4/ [L] | C |
| Cassie Kozyrkov | Decision intelligence | https://www.linkedin.com/in/kozyrkov/ [L] | C |
| Lex Fridman | Podcast | https://www.linkedin.com/in/lexfridman/ [L] | C |
| Ethan Mollick | AI at work, research-backed | https://www.linkedin.com/in/emollick/ [U] | B |
| Maxime Labonne | LLM fine-tuning, LLM course | https://www.linkedin.com/in/maxime-labonne/ [U] | A |

**AI engineers / practitioners (highest comment ROI for Bilal)**

| Name | Why | URL | Tier |
|---|---|---|---|
| Aurimas Griciūnas | SwirlAI, agents/LLMOps, Top Voice in AI | https://www.linkedin.com/in/aurimas-griciunas/ [U] | A |
| Paul Iusztin | Decoding AI, *LLM Engineer's Handbook* | https://www.linkedin.com/in/pauliusztin/ [L] | A |
| Damien Benveniste | The AI Edge, ML/LLM systems | https://www.linkedin.com/in/damienbenveniste/ [U] | A |
| Hamel Husain | Evals | https://www.linkedin.com/in/hamelhusain/ [U] | A |
| Eugene Yan | RecSys, evals, LLM patterns | https://www.linkedin.com/in/eugeneyan/ [U] | B |
| Shubham Saboo | Awesome LLM Apps, agents | https://www.linkedin.com/in/shubhamsaboo/ [U] | A |
| Philipp Schmid | Google DeepMind DevRel, ex-HF | https://www.linkedin.com/in/philipp-schmid-a6a2bb196/ [U] | A |
| Logan Kilpatrick | Google AI Studio / Gemini | https://www.linkedin.com/in/logankilpatrick/ [U] | B |
| Alex Xu | ByteByteGo, system design | https://www.linkedin.com/in/alexxubyte/ [L] | B |
| Rakesh Gohel | Agent diagrams, very active | https://www.linkedin.com/in/rakeshgohel01/ [L, from post URL] | B |
| Abhishek Thakur | Hugging Face, Kaggle GM | https://www.linkedin.com/in/abhishekthakur/ [L] | B |
| Brij Kishore Pandey | Agent/RAG explainers, large reach | https://www.linkedin.com/in/brijpandeyji/ [U] | B |
| Armand Ruiz | IBM AI platform, enterprise AI | https://www.linkedin.com/in/armand-ruiz/ [U] | B |
| Aishwarya Srinivasan | AI advisor, large audience | https://www.linkedin.com/in/aishwarya-srinivasan/ [L] | B |
| Greg Coquillo | AI product | https://www.linkedin.com/in/greg-coquillo/ [L] | B |
| Steve Nouri | AI community | https://www.linkedin.com/in/stevenouri/ [L] | C |
| Pascal Bornet | Automation/agents for business | https://www.linkedin.com/in/pascalbornet/ [L] | C |
| Allie K. Miller | AI GTM / adoption | https://www.linkedin.com/in/alliekmiller/ [L] | B |
| Vin Vashishta | AI strategy | https://www.linkedin.com/in/vineetvashishta/ [L] | C |
| Ishan Sharma | Tech creator, South Asian audience | https://www.linkedin.com/in/ishansharma7390/ [L] | C |

**Recruiters / hiring signal (for client posts)**

| Name | Why | URL | Tier |
|---|---|---|---|
| Adam Broda | Posts AI hiring data ("top 25 companies hiring AI roles") | https://www.linkedin.com/in/adamrbroda/ [L, from post URL] | B |
| Frederik Weulen Kranenberg | Computer Futures, freelance AI/LLM roles (NL) | https://www.linkedin.com/in/frederik-weulen-kranenberg-31801b1a7/ [L] | B |
| Brian Johnson | Forward Role Recruitment | https://www.linkedin.com/in/briangwjohnson/ [L] | C |
| Meera Lakhani | AI-startup recruiter (Moveworks, Tecton) | https://www.linkedin.com/in/meeralakhani/ [U] | B |

**Company pages (follow for launches; comment from personal account)** — slugs [U], verify:
`/company/openai/`, `/company/anthropicresearch/`, `/company/googledeepmind/`,
`/company/huggingface/`, `/company/langchain/`, `/company/llamaindex/`, `/company/supabase/`,
`/company/vercel/`.

Recommendation: seed ~25 (all tier A + best B), cap the rounds page at 10 per day ordered by
"not visited longest" and topic match with today's wire. Add local names over time (Pakistan
tech voices such as Saad Hamid / Usman Asif appear in Favikon's Pakistan list [R]) since a Karachi
network converts better for contracts [U].

---

## 3. Off-LinkedIn signals that predict LinkedIn AI conversation

| Source | Free access in 2026 | Use |
|---|---|---|
| **Hacker News (Algolia API)** | Free, no key. `search_by_date`, `tags=front_page|story|show_hn`, `numericFilters=points>100,created_at_i>X` [V] | Best free leading indicator. Also the monthly "Who is hiring?" thread (`tags=comment,story_<id>`) for client leads. |
| **Signal Desk wire** (lab blogs, arXiv, HF, model cards) | Already built | Same-day launches become LinkedIn takes within ~12–48h [U]. |
| **X / Twitter** | **No free tier for new devs since Feb 2026**; pay-per-use $0.005 per post read [R] | Skip. |
| **Reddit** | OAuth required; new tokens need manual approval (2–4 weeks); unauthenticated `.json` returns 403 since 30 May 2026 [R] | Skip unless he already has an approved app. RSS (`/r/LocalLLaMA/top/.rss`) may still work [U]. |
| **Bluesky** | Public AppView reads free; post *search* requires auth (app password) [R] | Optional, small AI-research crowd. |
| **GitHub trending / HF trending** | Public pages / HF API | Detect tools that will be "the thing everyone posts about" this week. |

Bridge pattern (what creators and tools informally do [U]): spot a launch or paper early → open the
watchlist rounds to find who is posting about it → comment with a hands-on angle, or write his own
post. Signal Desk can show "trending today: X, Y" at the top of the rounds page and sort watchlist
people by how often they post about X.

---

## 4. User-initiated capture ("Share to Signal Desk")

| Option | How | LinkedIn ToS risk | What similar tools do |
|---|---|---|---|
| **Paste link or text** into Signal Desk | Textarea + URL field; parse ID → timestamp; draft | **None** | Kleo V3 (web app), most "comment generator" sites |
| **Android PWA share target** | `manifest.json` `share_target: { action: "/share", method: "GET", params: { title, text, url } }`; LinkedIn app's "Share via…" sends the post URL [V Chrome docs; Chrome 76+ Android, 89+ desktop]. **iOS Safari does not support Web Share Target** [U] → iOS Shortcut that opens `/share?url=` | **None** (OS share sheet, nothing touches LinkedIn) | Paul Kinlan's "modern mobile bookmarklets" pattern |
| **Desktop bookmarklet** | `javascript:` that opens `https://<app>/share?url=${location.href}&text=${getSelection()}`; Bilal highlights the post text first | **Very low**: no installed software, sends only URL + what he selected, no DOM traversal [U] | Classic read-later bookmarklets (Pocket, Instapaper) |
| **Chrome extension with `activeTab`** | Popup/context-menu click → read the open tab | **Medium-high**: LinkedIn bans extensions that "scrape, modify the appearance of, or automate activity" [V]; reading DOM is scraping; injecting a button into LinkedIn modifies appearance; Kleo got a C&D [R] | Engage AI, Taplio X, Kleo (old) |
| Extension that only sends URL + selection via context menu (no content script) | `contextMenus` "Send selection to Signal Desk" | **Low** in practice (same as bookmarklet) but more build effort and a store listing | — |

`activeTab` grants temporary access only after a user gesture (action click, context menu, shortcut)
and shows no install warning [V], but that does not change LinkedIn's rule on what an extension may do.

**Recommendation:** ship paste + PWA share target + bookmarklet. Skip the extension.

---

## 5. What makes a high-impact comment

### 5.1 Evidence

- **LinkedIn policy (Aug 2025)**: "If we detect excessive comment creation or use of an automation
  tool, we may limit the visibility of those comments." [V: Social Media Today quoting LinkedIn help]
  Later reporting says flagged comments drop out of "Most Relevant" sorting, and LinkedIn says AI
  help is fine if comments "represent your voice and perspectives" [R: vulse, linkedcamp, Yahoo].
  2026: an "AI slop" report button and classifiers for generic AI posts [R: mmm-online, Forbes Aug 2026].
- **360Brew**: LinkedIn's 150B-parameter decoder-only ranking model that reads text, not just counts
  [V: arXiv 2501.16450]. Reported live in the feed from March 2026 [R]. Implication: the *content*
  of the comment and its topical match matter; "Great post!" carries nothing [R].
- **Van der Blom, Algorithm Insights 2025 (1.8M posts)**: organic reach down ~50%; first ~90 minutes
  matter; posts with discussion stay visible up to days; commenting on a creator once ≈ 80% chance
  you see their next post [R: mercermackay summary of the report]. The "A3 (Add → Ask → Anchor)"
  structure is attributed to him by one secondary source [R, weak].
- **Length and weight**: "comments over 15 words ≈ 2x weight", "comments ≈ 15x likes", "golden
  hour replaced by a 3–8h momentum window" all come from marketing blogs citing each other [R, low
  confidence]. Directionally consistent: substantive, multi-sentence comments early in a post's life.
- **Creators**: Justin Welsh — 5–10 thoughtful comments/day on niche posts, each good enough to
  stand alone; "CEA" = Compliment (specific), Expand, Ask [R]. Jasmin Alić — write for everyone
  reading the thread, not just the author; give a mini-lesson; never pitch [R]. Lara Acosta — less
  about comments, but stresses a single niche and writing for an "ideal follower" [R].

### 5.2 Rubric (Signal Desk should score each draft 0–2 per line; ship ≥ 9/12)

1. **Specific anchor**: references one concrete claim/line from the post (not the topic in general).
2. **Adds something new**: a first-hand data point, number, failure, or tool detail from Bilal's own
   work (RAG, LangGraph, pgvector, FastAPI, Next.js). No restating the post.
3. **One idea**: 2–4 sentences, ~25–70 words. Under 15 words fails; over ~90 reads like a post.
4. **Respectful friction allowed**: a caveat, edge case, or counterpoint ("this held for us until…").
5. **Ends with a sharp question or an open loop** the author can actually answer, *or* a clear
   takeaway — never both stacked.
6. **Human, his voice**: plain English, no em dashes, no "Great post!", no "As an AI engineer…",
   no hashtags, no emojis, no links, no pitch. Readable by the whole thread.
Hard fails (score 0 overall): generic praise, self-promotion, factual claim he can't back, more than
one question, sounds templated.

Operational rules: comment within ~2h of posting when possible (age from URL ID); max ~5–10
comments/day; always edited and posted by Bilal; reply to replies (threads are what get weighted).

### 5.3 Three comment shapes (examples are illustrative)

**A. Field note (adds a data point)**
> We hit the same wall with hybrid search. Swapping cosine-only pgvector retrieval for BM25 plus
> vectors with reciprocal rank fusion lifted our answer accuracy on support tickets more than any
> prompt change did. Did you see the gain hold once the corpus passed a few hundred thousand chunks?

**B. Respectful counterpoint (edge case)**
> Agree on keeping agents to a small set of tools. The place it broke for us was long-running
> LangGraph flows: the planner was fine, but state drift after a tool timeout caused most of our
> failures. Checkpointing every node fixed more than trimming the tool list.

**C. Practitioner question (opens a thread)**
> The eval section is the part most teams skip. When you score retrieval separately from
> generation, how do you build the golden set: hand-labelled queries, or synthetic ones checked by
> a person?

---

## 6. Recommended architecture

```
                 ┌──────────── Lane A: Engage ────────────┐   ┌──── Lane B: Client posts ────┐
 Bilal (phone)  ─┤ PWA share_target  /share?url&text       │   │ GH Actions cron (2–4x/day)    │
 Bilal (laptop) ─┤ bookmarklet       /share?url&sel        │   │  Tavily (time_range=week,     │
 Bilal (any)    ─┤ paste box                               │   │   include_domains linkedin)   │
                 └───────┬─────────────────────────────────┘   │  Exa (startPublishedDate,     │
                         ▼                                     │   includeDomains linkedin.com/posts)
           parse activity ID → postedAt, author slug            │  HN "Who is hiring" (Algolia) │
           (optional opt-in: 1 fetch of /embed/ URL)           │  RemoteOK JSON (attribution)  │
                         ▼                                     └──────────┬────────────────────┘
           hot score = age × watchlist tier × beat similarity              ▼
                         ▼                                      drop if postedAt > 14d (ID decode)
           DeepSeek draft (rubric §5.2 + voice profile)         LLM classify: hiring FT / contract /
                         ▼                                      noise; extract role, stack, remote,
           UI: draft + "Open on LinkedIn" button               region; score fit to Bilal
           Bilal edits and posts by hand                                   ▼
                                                                Leads list → "Open on LinkedIn"
 Rounds page: watchlist sorted by staleness + today's wire topics, links to /recent-activity/all/
```

Details:
- **Tables**: `watch_people(slug, name, kind, tier, topics[], last_visited_at)`,
  `captured_posts(url, activity_id, posted_at, author_slug, text, source[share|bookmarklet|paste|search], hot_score)`,
  `comment_drafts(post_id, draft, rubric_scores jsonb, used bool)`,
  `leads(url, activity_id, posted_at, kind[ft|contract|agency], role, stack[], remote, region, fit_score, status)`.
  Follows the existing `queries.ts` / `actions.ts` split per domain [U: matches repo convention].
- **Budget**: Tavily 1,000/month → e.g. 8 queries × 3 runs/day = 720/month. Exa $10/month →
  ~1,400 searches at $7/1k; use for 2–3 semantic "contractor wanted" queries/day. Keep Firecrawl
  credits for the wire. Do not use the hourly cron for search; 2–4 runs/day is enough given index lag.
- **Query templates (leads)**: `"hiring" "AI engineer" (LangGraph OR RAG OR agents)`,
  `"looking for" ("AI developer" OR "AI engineer") (freelance OR contract OR consultant)`,
  `"we're hiring" "LLM" remote`, `"need help" building "AI agent"`, plus Pakistan/remote-friendly
  variants (`"remote" "Pakistan"`, `"EMEA" "contract"`).
- **Dedup** by activity ID; **staleness** by ID decode; never fetch result pages in bulk.
- **Comment timing**: only show "comment now" for captured posts < 6h old; older ones get a
  "reply in thread" or "skip" suggestion.

---

## Sources

Search APIs
- Brave free tier removal: https://www.implicator.ai/brave-drops-free-search-api-tier-puts-all-developers-on-metered-billing/ ; https://agentdeals.dev/vendor/brave-search-api
- Google CSE shutdown 2027: https://brave.com/learn/google-api-shutdown/ ; https://www.addsearch.com/blog/google-programmable-search-engine-alternatives/ ; https://dev.to/markhuang-ai/googles-custom-search-api-dies-in-2027-a-drop-in-isnt-a-migration-9b7 ; https://parallel.ai/articles/why-ai-agents-cant-just-use-google-search
- Bing retirement: https://www.windowscentral.com/software-apps/browsing/bing-search-apis-to-be-decommissioned-completely/ ; https://www.neowin.net/amp/microsoft-pulls-plug-on-bing-search-apis/ ; https://cloro.dev/blog/bing-search-api-key/
- Serper: https://apiserpent.com/blog/serper-pricing-credits-explained ; https://costbench.com/software/web-scraping/serper/free-plan/
- SerpApi: https://agentdeals.dev/vendor/serpapi ; https://costbench.com/software/web-scraping/serpapi/free-plan/
- Exa: https://exa.ai/docs/reference/search ; https://exa.ai/docs/changelog/pricing-update ; https://www.tinyfish.ai/blog/exa-pricing
- Tavily: https://docs.tavily.com/documentation/api-reference/endpoint/search ; https://docs.tavily.com/documentation/api-credits.md
- Firecrawl search: https://docs.firecrawl.dev/features/search ; LinkedIn blocked: https://scrapecreators.com/blog/firecrawl-social-scraping-restrictions ; https://syncgtm.com/blog/firecrawl-review-2026
- Jina: https://jina.ai/api-dashboard/pricing/ ; https://yangmao.ai/en/providers/jina-ai/free-tier/
- LinkedIn posts in Google: https://www.indiehackers.com/post/linkedin-seo-5-steps-from-1-260-searches-and-9-805-urls-319753c72c
- Post ID timestamp: https://trevorfox.com/2024/11/how-to-find-the-exact-date-of-a-linkedin-post/ ; https://github.com/codingmatheus/linkedin-timestamp-extractor
- Embed URL format: https://idukki.io/blog/embed-linkedin-feed-on-website ; https://flockler.com/blog/embed-linkedin-post-on-wordpress
- Test posts fetched: https://www.linkedin.com/posts/aaditya-choukade_ai-automation-freelance-activity-7394293508917944321-Q9Pq and https://www.linkedin.com/embed/feed/update/urn:li:activity:7394293508917944321

LinkedIn policy and enforcement
- Prohibited software and extensions: https://www.linkedin.com/help/linkedin/answer/a1341387
- Automated comment visibility (Aug 2025): https://www.socialmediatoday.com/news/linkedin-limit-visibility-of-comments-made-via-automation-tools/758207/ ; https://vulse.co/blog/linkedin-cracks-down-on-automated-comments-what-marketers-need-to-know ; https://www.linkedcamp.com/blog/linkedin-suppresses-automated-comments-engage-first-playbook
- AI content reach / slop button: https://tech.yahoo.com/social-media/articles/linkedin-wants-limit-reach-ai-150247815.html ; https://www.mmm-online.com/news/linkedin-automated-content-ai-slop-detection-button/ ; https://www.forbes.com/sites/jodiecook/2026/08/10/what-linkedins-ai-slop-crackdown-means-for-your-posts/
- LinkedIn v. ProAPIs: https://therecord.media/linkedin-sues-data-scraping-company ; https://securityaffairs.com/183001/security/linkedin-sues-proapis-for-15k-month-linkedin-data-scraping-scheme.html
- Kleo shutdown: https://magicpost.in/blog/kleo-review ; https://contentin.io/blog/kleo-alternatives/ ; Taplio risk: https://magicpost.in/blog/is-taplio-safe
- Top Voice changes: https://www.socialmediatoday.com/news/linkedin-updates-top-voice-badge/738428/

Engage tools
- Taplio Engage: https://intercom.help/taplio/en/articles/8807788-engage-influencers-tab ; https://intercom.help/TaplioAndTweetHunter/en/articles/8807850-engage-custom-feeds-tab
- Engage AI: https://chromewebstore.google.com/detail/hehmalnliolmeihafkomenpfkbidffon

Algorithm and comment craft
- 360Brew paper: https://arxiv.org/abs/2501.16450v1
- 360Brew commentary: https://pettauer.net/en/linkedin-360brew-semantic-visibility-2026/ ; https://www.socialpilot.co/de/blog/linkedin-algorithm
- Van der Blom report summaries: https://mercermackay.com/thinking/blog/a-leaders-guide-to-the-linkedin-algorithm-what-the-data-says/ ; https://rightangleagency.com/latest-linkedin-algorithm-report/ ; https://captureflow.ai/playbooks/richard-van-der-blom
- Weighting claims (low confidence): https://www.viralbrain.ai/blog/linkedin-algorithm-2026-what-changed ; https://expandi.io/blog/best-time-to-post-on-linkedin/
- Justin Welsh: https://joshspector.com/justin-welsh-linkedin-system/ ; Jasmin Alić: https://typeshare.co/yarawriting/posts/7-ways-to-comment-like-a-pro--according-to-jasmin-alic- ; https://socialmediatea.beehiiv.com/p/get-100-extra-comments-linkedin ; Lara Acosta: https://callummcdonnell.substack.com/p/meet-the-fastest-growing-creator

Watchlist sources
- https://www.tryordinal.com/blog/30-influential-ai-leaders-to-follow-on-linkedin
- https://magicpost.in/blog/top-linkedin-creators-ai
- https://www.aiacceleratorinstitute.com/25-ai-engineers-you-should-be-following-in-2026/
- https://www.favikon.com/blog/top-ai-experts ; https://www.favikon.com/blog/top-linkedin-influencers-pakistan
- https://datanorth.ai/blog/top-10-ai-influencers-to-follow-on-linkedin-in-2026
- https://www.oreilly.com/people/aurimas-griciunas/ ; https://ro.linkedin.com/in/pauliusztin

Off-LinkedIn signals and lead feeds
- HN Algolia API: https://hn.algolia.com/api
- X API pricing: https://opentweet.io/how-to/x-api-pay-per-use-explained
- Reddit API 2026: https://www.socialcrawl.dev/blog/reddit-api-key-limits-alternatives-2026
- Bluesky searchPosts: https://docs.bsky.app/docs/api/app-bsky-feed-search-posts
- RemoteOK API terms: https://dev.to/scrapemint/four-remote-job-boards-have-free-public-apis-here-is-one-schema-for-all-of-them-j1f
- Upwork RSS deprecation: https://support.upwork.com/hc/en-us/articles/52052528243731-RSS-deprecation

Capture
- Web Share Target: https://developer.chrome.com/docs/capabilities/web-apis/web-share-target ; https://paul.kinlan.me/modern-mobile-bookmarklets-with-the-sharetarget-api
- activeTab: https://developer.chrome.com/docs/extensions/develop/concepts/activeTab
