# D. Fresh LinkedIn discovery: round 2 (2026-10-07)

Labels: **[V]** I checked it myself this session (fetched the doc, page or endpoint). **[S]** Supported by a secondary source or by well-established prior knowledge, but not re-checked today. **[U]** Unverified or conflicting.

**Method caveat.** The session's shared WebSearch budget ran out after 7 searches, well short of the 40 planned. The rest of the work used ~55 direct WebFetch calls to primary docs, pricing pages and public endpoints. Two consequences:
- Task 6 (find a LinkedIn post about this week's AI release through a search index and decode its age) could not be run. Querying search engines through fetch would have broken the budget rule.
- Some LinkedIn UI parameter names are marked [S] because LinkedIn search sits behind a login wall.

---

## 1. Ranked recommendation

| Rank | Approach | Freshness | Cost | ToS risk | Verdict |
|---|---|---|---|---|---|
| 1 | **Deep-link generator.** The app builds LinkedIn content-search and job-search URLs. Bilal opens them himself while logged in. | Real-time (LinkedIn's own index) | $0 | None. It is a link, and the human browses | **Build first** |
| 2 | **Trend radar → topic deep links.** Pull today's AI topics from HN Algolia, Techmeme RSS, TLDR AI, The Rundown, Ben's Bites and HF trending (all free, keyless, [V]), extract 3–6 entity phrases (e.g. "Mistral Large 4"), then emit LinkedIn "past-24h, latest" search links per topic | Same day | $0 | None | **Build second.** This is how you find posts *worth commenting on* |
| 3 | **Index search APIs + ID decode filter.** Firecrawl search (already in stack, `tbs=qdr:d`) / Tavily (`time_range:"day"`) / Linkup / You.com on `linkedin.com/posts`. Then drop any URL whose `activity id >> 22` is older than 72h | Mostly days to weeks; a few <24h | Free tiers | Low (search-provider data, link plus snippet only) | Optional "bonus" lane. Never the primary feed |
| 4 | LLM-grounded search (Gemini 2.5 Flash grounding 500 RPD free; Anthropic/OpenAI/Perplexity paid) | Same as the underlying index | Free (Gemini 2.5 only) or $5–14/1k | Gemini grounding has display rules | Skip. No better freshness, more cost and opacity |
| 5 | Alerts (Google Alerts RSS, Talkwalker, F5Bot) | Google Alerts rarely surfaces LinkedIn posts; others don't cover LinkedIn | $0 | None | F5Bot/Talkwalker are fine for Reddit/HN/X, not LinkedIn |
| 6 | Social listening (Brand24, Awario, Mention, Brandwatch) | Public LinkedIn only, mostly brand-page scoped | $199+/mo after trial | None | Not viable at zero cost |

**Bottom line.** No free API gives reliable <24h LinkedIn post discovery. The freshest legitimate source is LinkedIn's own search, opened by Bilal. The app's job is to tell him **what to search for today** and to build the exact URL. The search APIs are a supplement, gated by the ID-decode freshness check.

---

## 2. Deep-link URL templates (the core deliverable)

### 2a. Post (content) search: needs Bilal logged in

Base: `https://www.linkedin.com/search/results/content/?`

| Param | Values | Label |
|---|---|---|
| `keywords` | URL-encoded Boolean query. LinkedIn supports `"quotes"`, `AND`, `OR`, `NOT`, `()` | [V] (Boolean help article a524335) |
| `datePosted` | `%22past-24h%22`, `%22past-week%22`, `%22past-month%22` (JSON-quoted strings) | [S]. The URL was accepted and preserved through LinkedIn's login `session_redirect` [V], but I could not see the filtered results |
| `sortBy` | `%22date_posted%22` (Latest) or `%22relevance%22` (Top match) | [S] |
| `contentType` | `%22jobs%22` (posts tagged as job posts), `%22videos%22`, `%22photos%22`, `%22documents%22` | [S] |
| `postedBy` | `%5B%22first%22%5D` (1st connections), `%5B%22following%22%5D` (people you follow), `%5B%22me%22%5D` | [S] |
| `authorJobTitle` | `%22founder%22`, `%22CTO%22`, `%22recruiter%22` | [S] |
| `authorIndustry`, `authorCompany`, `fromMember`, `mentionsMember`, `mentionsOrganization` | JSON arrays of numeric IDs / URNs | [S]. Needs IDs; skip in v1 |
| `origin` | `FACETED_SEARCH` (harmless; what the UI adds) | [S] |

**Robustness tip.** If LinkedIn renames a facet, the page still loads with `keywords` only. Generate the full URL, and also show a "plain search" fallback link.

**Templates.**

Trending topic, fresh, latest first:
```
https://www.linkedin.com/search/results/content/?keywords={TOPIC}&datePosted=%22past-24h%22&sortBy=%22date_posted%22&origin=FACETED_SEARCH
```
Topic, top-engagement in the last 24h (better for "worth commenting on"):
```
https://www.linkedin.com/search/results/content/?keywords={TOPIC}&datePosted=%22past-24h%22&sortBy=%22relevance%22&origin=FACETED_SEARCH
```
Hiring posts (full-time):
```
keywords = ("hiring" OR "we're hiring" OR "join our team") AND ("AI engineer" OR "ML engineer" OR "LLM engineer" OR "GenAI engineer")
https://www.linkedin.com/search/results/content/?keywords={enc}&datePosted=%22past-24h%22&sortBy=%22date_posted%22
```
Client / freelance posts:
```
keywords = ("looking for" OR "need" OR "seeking" OR "recommend") AND ("freelance" OR "contract" OR "consultant" OR "agency") AND ("AI developer" OR "AI engineer" OR "LLM" OR "AI agent" OR "chatbot" OR "automation")
...&datePosted=%22past-week%22&sortBy=%22date_posted%22
```
Founder-intent posts:
```
keywords = ("looking for" OR "anyone know") AND ("AI engineer" OR "AI developer") NOT "job seeker"
...&authorJobTitle=%22founder%22&datePosted=%22past-week%22&sortBy=%22date_posted%22
```
Job-tagged posts only:
```
...&contentType=%22jobs%22&keywords=%22AI%20engineer%22&datePosted=%22past-24h%22
```

### 2b. Job search: public guest page, verified

Base: `https://www.linkedin.com/jobs/search/?` (guest page `https://www.linkedin.com/jobs/search?` also works)

| Param | Values | Label |
|---|---|---|
| `keywords` | e.g. `AI%20Engineer` | [V] |
| `geoId` | **Pakistan 101022442**, **UAE 104305776**, **United Kingdom 101165590**, **Worldwide 92000000** (each confirmed by the page header) | [V] |
| | United States 103644278 | [S] |
| `location` | Free text (e.g. `Pakistan`). Optional when geoId is set | [V] |
| `f_TPR` | `r86400` = past 24h (results showed "1–20 hours ago"). `r604800` = past week, `r2592000` = past month, `r3600` = past hour | r86400 [V]; others [S] |
| `f_WT` | `1` on-site, `2` remote, `3` hybrid | [S]. The guest page showed no visible remote facet; LinkedIn says it is "working to bring back all filters" after an AI job-search update [V] |
| `f_E` | `1` Internship, `2` Entry, `3` Associate, `4` Mid-Senior, `5` Director, `6` Executive (comma-list, encoded `2%2C3%2C4`) | Accepted [V]; mapping [S] |
| `f_JT` | `F` full-time, `C` contract, `P` part-time, `T` temporary, `I` internship | [S] |
| `f_AL` | `true` = Easy Apply | [V] (seen on page) |
| `f_EA` | `true` = under 10 applicants (seen on page, newer facet) | [V] seen, meaning [S] |
| `sortBy` | `DD` = most recent, `R` = relevance | [S] |

Live check today (2026-10-07). `keywords=AI Engineer&geoId=101022442&f_TPR=r86400` returned 21 Pakistan jobs posted 1–20 hours ago [V]. UAE, UK and Worldwide all returned jobs posted 6–20h ago [V].

**Templates.**
```
Pakistan, 24h:        https://www.linkedin.com/jobs/search/?keywords=AI%20Engineer&geoId=101022442&f_TPR=r86400&sortBy=DD
UAE, 24h:             https://www.linkedin.com/jobs/search/?keywords=AI%20Engineer&geoId=104305776&f_TPR=r86400&sortBy=DD
UK remote, 24h:       https://www.linkedin.com/jobs/search/?keywords=AI%20Engineer&geoId=101165590&f_WT=2&f_TPR=r86400&sortBy=DD
Worldwide remote:     https://www.linkedin.com/jobs/search/?keywords=AI%20Engineer&geoId=92000000&f_WT=2&f_TPR=r86400&sortBy=DD
Worldwide contract:   https://www.linkedin.com/jobs/search/?keywords=LLM%20OR%20%22AI%20Engineer%22&geoId=92000000&f_WT=2&f_JT=C&f_TPR=r604800&sortBy=DD
Mid-senior only:      ...&f_E=3%2C4
```
Keyword set to rotate: `AI Engineer`, `LLM Engineer`, `Generative AI`, `Machine Learning Engineer`, `AI Agent`, `Applied AI`, `Forward Deployed Engineer`.

LinkedIn **Job Alerts** (bell on a job search) are the native "saved search" and email/push daily. Bilal can set one per template once [S].

### 2c. Google deep links (user-opened, $0, no API)

```
https://www.google.com/search?q=site%3Alinkedin.com%2Fposts+%22hiring%22+%22AI+engineer%22&tbs=qdr:d
https://www.google.com/search?q=site%3Alinkedin.com%2Fposts+{TOPIC}&tbs=qdr:w,sbd:1
```
`qdr:h|d|w|m` = past hour/day/week/month; `sbd:1` = sort by date [S]. These are the same `tbs` codes Firecrawl documents [V]. Freshness is limited by how fast Google indexes LinkedIn posts (round 1: mostly weeks old).

### 2d. Other native, user-driven features
- **Follow creators + bell "notify about all posts"** on key AI voices' profiles. This is LinkedIn's own fresh-post alert. Zero risk [S].
- **Hashtag following** was scaled back by LinkedIn around 2024. Don't build on it [U].
- **Saved searches for posts.** LinkedIn has no saved-search alert for *content* search; only job alerts and (Sales Navigator) lead/account alerts [S]. Sales Navigator is paid. Its "posted on LinkedIn in past 30 days" is a lead filter, not a post feed [S]. So the app's stored deep links *are* the saved searches.

---

## 3. Freshness filter: decode post IDs (for API lane)

`timestamp_ms = activityId >> 22` (round 1). Cutoffs computed for today [V, computed]:

| Cutoff | Minimum activity ID |
|---|---|
| now (2026-10-07 00:00Z) | 7513387617484800000 |
| past 24h | **7513025229619200000** |
| past 7 days | 7510850902425600000 |
| past 30 days | 7502515981516800000 |

Sanity check: 7400000000000000000 → 2025-11-28. Any `linkedin.com/posts/...-activity-7513…` URL is from today.

Extract the ID with `/(?:activity|ugcPost|share)[-:](\d{19})/`. Use BigInt in JS (`BigInt(id) >> 22n`).

---

## 4. Search/answer providers: freshness, filters, free tier

| Provider | Free tier (2026) | Recency filter | Domain/path filter | LinkedIn posts? | Notes / label |
|---|---|---|---|---|---|
| **Firecrawl search** | 1,000 credits/mo, renews, no card [V]. Search = 2 credits/10 results → ~500 searches/mo | `tbs=qdr:h/d/w/m/y`, `sbd:1`, custom `cdr` [V] | `includeDomains` → `site:` internally [V] | Google-like index; same staleness as round 1 [S] | **Already in the stack. Best zero-new-key option** |
| **Tavily** | 1,000 credits/mo (round 1) | `time_range` (day/week/month/year), `start_date` [V] | `include_domains` ≤300 [V] | Yes, mostly older [S] | basic = 1 credit [V] |
| **Linkup** | $20 credit renewing monthly ≈ 4,000 standard searches [S] | `fromDate`/`toDate` ISO [V] | `includeDomains` ≤100 [V] | Unknown [U] | Most generous renewing credit found |
| **You.com** | 100 searches/day keyless via MCP (`https://api.you.com/mcp?profile=free`) [V pricing page]; $100 signup credit [V] | `freshness=day/week/month/year` or `YYYY-MM-DDtoYYYY-MM-DD` [V] | `include_domains` ≤500 [V] | Unknown [U] | REST `ydc-index.io/v1/search` needs a key. MCP keyless is for tools, not server cron (fragile) |
| **Parallel** | $5/mo credit = 5,000 searches, **card required** [V] | `after_date`; `fetch_policy.max_age_seconds` live-fetch [V] | `include_domains` incl. path prefixes ≤200 [V] | Unknown [U] | Card requirement breaks the "no signup/zero-risk" rule |
| **Exa** | $10/mo credit (round 1) | `startPublishedDate`; `maxAgeHours` (Feb 2026) [V] | `includeDomains` ≤1,200 [V] | `linkedin` category replaced by `people` (profiles) on 2025-12-19 [V]. No post-specific claim | Better for profiles than posts |
| **Gemini grounding** | **gemini-2.5-flash free tier: 500 RPD**; Gemini 3.x: *not available* on free tier (paid: 5,000/mo free then $14/1k) [V] | None (model decides) | None documented [V] | Incidental | Must honour Search Suggestions display rules [V]. Citation URIs in the native API have been redirect links [U, docs page now shows direct URLs] |
| **Perplexity Sonar / Search API** | No free tier [V] | `search_recency_filter` hour/day/week/month/year; `search_after_date_filter` [V] | `search_domain_filter` ≤20, **path filters supported** (e.g. `linkedin.com/posts`) [V] | Yes, via index [S] | Search API $5/1k (fast $1/1k); Sonar $5–12/1k + tokens [V] |
| **OpenAI Responses `web_search`** | No free tier | **No recency filter** [V] | `filters.allowed_domains` ≤100 [V] | Incidental | Returns `sources` list [V] |
| **Anthropic web search** | No free tier; $10/1k [V] | None; results carry `page_age` [V] | `allowed_domains` with optional path (`linkedin.com/posts`) [V] | Incidental | |
| **Kagi** | Paid; needs account [V] | Not documented on overview [U] | Lenses | Unknown | |
| **Mojeek** | Paid (£2–3 CPM), limited free trial [V] | Not listed [U] | — | Unlikely (LinkedIn robots allows few crawlers) [S] | Independent index |
| **Marginalia** | Key `public`, shared and rate-limited, CC-BY-NC-SA [V] | — | — | **No.** Indexes small/indie web [V] | Irrelevant |
| **SearXNG (self-host)** | Free software | `time_range=day/month/year` (no week) [V] | Via `site:` passed upstream | Only what upstream engines return [S] | Needs a server (not Vercel). Upstream Google often blocks/CAPTCHAs [S]. `format=json` must be enabled [V] |
| **DuckDuckGo** | No official search API [S] | — | — | — | Don't scrape |
| **Yandex Search API** | Russian cloud billing [U] | — | — | — | Not practical from PK |

**Why no provider fixes freshness.** LinkedIn's robots.txt lets only approved crawlers in: "LinkedIn may, in its discretion, permit certain automated access ... approved publicly available search engines". It disallows `/search` [V]. Every third-party index therefore inherits Google/Bing-style crawl lag on `/posts/`.

**ToS note.** LinkedIn User Agreement 8.2 prohibits copying or displaying LinkedIn content "obtained ... through third parties (such as search tools ...)" without owner consent [V]. Showing a link, title and short snippet to Bilal alone is low-risk. Don't persist or republish full post text.

---

## 5. Alerts

- **Google Alerts.** Login required. Frequency "As-it-happens / once a day / once a week". Sources include Automatic/News/Blogs/Web/Discussions [V]. RSS delivery ("Deliver to → RSS feed") has long existed [S], but the public page didn't show it. 2026 status [U]. Alerts only fire on *newly indexed* pages, so LinkedIn posts arrive late or not at all [S]. Worth a 2-minute manual test (`site:linkedin.com/posts "hiring" "AI engineer"`, Web, As-it-happens, RSS), but don't depend on it.
- **Talkwalker Alerts.** Free. Email/RSS/Slack. Covers news, blogs, forums, websites and X; **no LinkedIn** listed [V].
- **F5Bot.** Free email alerts for Reddit, HN and Lobsters. RSS/JSON on paid Gold [V]. Good for trend radar, not LinkedIn.
- **Mention.** Has a "free plan" reference. Sources listed: FB, IG, X, Reddit, TikTok, YouTube, web. No LinkedIn [V].

## 6. Social listening tools and LinkedIn

- **Brand24.** Lists LinkedIn as a source. 14-day trial, then from $199/mo [V]. Its own blog says tools only see public posts, and its LinkedIn integration covers pages "on which you are a super administrator" [V]. Coverage of arbitrary public posts is limited.
- **Awario.** Trial only. No LinkedIn on the pricing page [V].
- **Brandwatch / Talkwalker (paid).** Enterprise; LinkedIn coverage is generally owned-page data via LinkedIn's API [S].
- Conclusion: none gives free, broad, fresh LinkedIn post discovery.

## 7. Trend signals: all tested today

| Source | Endpoint | Status [V] | Signal today |
|---|---|---|---|
| HN Algolia | `https://hn.algolia.com/api/v1/search_by_date?query=AI&tags=story&numericFilters=points>50` | JSON, keyless | "Mistral Large 4" 1,409 pts (Oct 6) |
| Techmeme | `https://www.techmeme.com/feed.xml` | RSS 2.0 | Mistral Large 4 "Le Chonk"; Anthropic Glasswing vuln stats |
| TLDR AI | `https://tldr.tech/api/rss/ai` | RSS, daily | Oct 6 issue present |
| The Rundown AI | `https://rss.beehiiv.com/feeds/2R3C6Bt5wj.xml` | RSS, daily | "The 'DeepSeek of the West' finally has a model" |
| Ben's Bites | `https://www.bensbites.com/feed` | RSS (Substack) | OpenAI DevDay 2026, Sonnet 5.5 |
| HF trending models | `https://huggingface.co/api/models?sort=trendingScore&limit=20` | JSON, keyless | trendingScore field |
| HF daily papers | `https://huggingface.co/api/daily_papers?limit=20` | JSON, keyless | upvotes, publishedAt |
| Google Trends daily | `https://trends.google.com/trending/rss?geo=US` | RSS, keyless | General (sports/politics). Too broad for AI; filter by AI keywords or use `geo=PK` |
| Google Trends API | Official alpha, application-only [V] | — | Not available |
| pytrends | Archived 2025-04-17, unofficial [V] | — | Avoid |
| GitHub trending | HTML only, no official API/RSS [V] | — | Use HF/HN instead |
| Reddit | `reddit.com` fetch blocked from this tool [V]. Official API needs OAuth [S] | — | Use F5Bot email or skip |
| X trending | Paid API [S] | — | Skip |
| LinkedIn News "Top stories" | Inside the logged-in feed; no public endpoint [S] | — | Bilal glances manually |

**Correlation heuristic [S].** LinkedIn AI chatter lags HN/Techmeme by about 12–48h and over-indexes on:
1. Big-lab model and product launches (OpenAI DevDay, Mistral Large 4, Claude/Gemini releases).
2. "AI and jobs/careers" stories.
3. Enterprise adoption and funding.

It under-indexes on niche open-weight repos. So weight Techmeme plus the newsletters (which mirror the LinkedIn audience) above HF/GitHub. A topic appearing in 2+ sources within 24h is a strong "post about it / comment on it" signal. Example today: **Mistral Large 4** (HN, Techmeme, Rundown) → the app should emit `keywords="Mistral Large 4"&datePosted="past-24h"&sortBy="relevance"`.

## 8. Proposed app flow (for Signal Desk)

1. Hourly cron (already exists). Fetch HN Algolia, Techmeme, TLDR AI, Rundown, Ben's Bites and HF.
2. Cluster into named entities. Score by cross-source count × recency.
3. For the top 5 topics, render 2 LinkedIn post-search links each ("latest 24h", "top 24h") plus a Google `qdr:d` link.
4. Static "Opportunities" panel. Hiring and client post-search links (2a) plus job links for PK/UAE/UK/Worldwide-remote (2b), with a timestamp of when the template was last used.
5. Optional bonus lane: Firecrawl search `site:linkedin.com/posts {topic}` with `tbs=qdr:d`. Keep only IDs ≥ the 24–72h cutoff (section 3). Show link and snippet only.

---

## Sources
- Perplexity: https://docs.perplexity.ai/guides/search-domain-filters · https://docs.perplexity.ai/guides/date-range-filter-guide · https://docs.perplexity.ai/getting-started/pricing · https://metronome.com/pricing-index/perplexity-search-api-and-sonar
- Gemini: https://ai.google.dev/gemini-api/docs/pricing · https://ai.google.dev/gemini-api/docs/google-search · https://discuss.ai.google.dev/t/google-ai-studio-search-grounding-api-limits/175663 · https://www.memetik.ai/guides/gemini-api-free-tier-limits
- OpenAI web search: https://developers.openai.com/api/docs/guides/tools-web-search
- Anthropic web search: https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool
- Exa: https://exa.ai/docs/reference/search · https://exa.ai/docs/changelog
- Firecrawl: https://docs.firecrawl.dev/features/search · https://www.firecrawl.dev/pricing
- Tavily: https://docs.tavily.com/documentation/api-reference/endpoint/search
- Linkup: https://docs.linkup.so/pages/documentation/api-reference/endpoint/post-search · https://costbench.com/software/ai-search-apis/linkup/ · https://coldiq.com/blog/linkup-pricing
- Parallel: https://parallel.ai/blog/free-tier-parallel · https://docs.parallel.ai/api-reference/search/search · https://parallel.ai/articles/best-free-web-search-api
- You.com: https://you.com/pricing · https://you.com/docs/api-reference/search/v1-search
- Kagi: https://help.kagi.com/kagi/api/search.html · https://kagi.com/api/docs
- Mojeek: https://www.mojeek.com/services/search/web-search-api/
- Marginalia: https://about.marginalia-search.com/article/api/
- SearXNG: https://docs.searxng.org/dev/search_api.html
- LinkedIn: https://www.linkedin.com/help/linkedin/answer/a524335 (Boolean) · https://www.linkedin.com/legal/user-agreement · https://www.linkedin.com/robots.txt · job-search guest pages fetched with geoId 101022442 / 104305776 / 101165590 / 92000000 · content-search URL login redirect
- Google Alerts: https://support.google.com/websearch/answer/4815696 · https://www.google.com/alerts
- Talkwalker Alerts: https://www.talkwalker.com/alerts · F5Bot: https://f5bot.com/
- Brand24: https://brand24.com/pricing/ · https://brand24.com/blog/linkedin-monitoring/ · Awario: https://awario.com/pricing/ · Mention: https://mention.com/en/pricing/
- Trends: https://developers.google.com/search/apis/trends · https://github.com/GeneralMills/pytrends · https://trends.google.com/trending/rss?geo=US
- Feeds/APIs: https://hn.algolia.com/api/v1/search_by_date · https://www.techmeme.com/feed.xml · https://tldr.tech/api/rss/ai · https://rss.beehiiv.com/feeds/2R3C6Bt5wj.xml · https://www.bensbites.com/feed · https://huggingface.co/api/models?sort=trendingScore · https://huggingface.co/api/daily_papers · https://github.com/trending
