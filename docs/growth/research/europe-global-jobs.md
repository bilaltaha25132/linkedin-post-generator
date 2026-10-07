# G. Europe and global AI job sources for Signal Desk

Research date: 2026-10-07. Target: AI/ML/LLM engineering roles in Europe plus remote-worldwide and remote-EMEA, for a Karachi-based Full Stack AI Engineer.

Labels: **[V]** verified today at the primary source (live HTTP request or the official page), **[S]** secondary source (blog, scraper vendor, news), **[U]** unverified or inferred.

Method: live `curl` probes from this machine (HTTP status, content type, sample body), robots.txt downloads for about 100 domains, a script that hit 6 ATS APIs for about 230 company slugs, plus a handful of web searches. No accounts were created, nothing behind a login or CAPTCHA was touched.

Already covered by the existing plan and therefore not repeated in depth: Ashby, Greenhouse, Lever, Workable board APIs; HN Who is hiring; Himalayas; Jobicy; We Work Remotely; RemoteOK; Remotive; JSearch/SerpApi; Adzuna UK.

---

## 1. Top recommendations (what to build first)

| Rank | Source | Why | Access | Cost |
|---|---|---|---|---|
| 1 | Company ATS boards for a curated EU AI company list (section 4) | Highest signal: direct, fresh, structured, salary sometimes included | Public JSON (Ashby, Greenhouse, Lever, Workable, SmartRecruiters, Personio XML, Teamtailor RSS, Workday CXS) | Free |
| 2 | Bundesagentur fuer Arbeit Jobsuche API | Biggest German database; 629 hits for "Machine Learning", 490 for "KI Engineer", 180 for "LLM" today | Public REST, static header key | Free |
| 3 | EURES jv-search API | EU official portal, 31 countries, feeds from national services | Public POST JSON, no key | Free |
| 4 | Arbeitnow API (+ `.co.uk`) | EU tech jobs, has a `visa_sponsorship=true` filter | Public JSON, no key | Free |
| 5 | Sweden JobTech JobSearch API | Open government data, 170 ML hits, 42 LLM hits today | Public JSON, no key | Free |
| 6 | Adzuna API for DE, NL, PL, FR, AT, CH, IT, ES, BE (not only UK) | One integration, many EU countries | Key (free tier) | Free tier |
| 7 | Landing.jobs API, 4dayweek API, Working Nomads API, NoDesk RSS, Berlin Startup Jobs RSS | Cheap extra coverage of EU and remote | Public JSON or RSS | Free |
| 8 | UK sponsor register CSV + IND recognised sponsor list | Flag employers that can sponsor visas | Downloadable CSV / HTML table | Free |
| 9 | Firecrawl `/v2/search` with `includeDomains` for blocked boards (LinkedIn excluded) | Discover listings on boards with no API via search results, not by scraping the board | API credits | 2 credits per 10 results |

Avoid scraping: LinkedIn, Indeed, Glassdoor, StepStone, Totaljobs, CV-Library, Pracuj.pl, Upwork, Malt, Built In, Jooble web, FINN.no, InfoJobs, Tecnoempleo (bot walls and/or explicit prohibitions, details in section 3).

---

## 2. Public job APIs and feeds (verified endpoints)

### 2.1 Government and official portals

| Source | Endpoint (exact) | Auth | Verified result today | Notes |
|---|---|---|---|---|
| **Bundesagentur fuer Arbeit (DE)** | `GET https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs?was={q}&wo={city}&umkreis={km}&size={n}&page={p}&veroeffentlichtseit={days}&angebotsart=1` | Header `X-API-Key: jobboerse-jobsuche` | [V] 200 JSON. `maxErgebnisse`: Machine Learning 629, KI Engineer 490, LLM 180. Keys: `ergebnisliste, maxErgebnisse, page, size, facetten` | **v4 now returns 403; use v6** [V]. Details: `/pc/v4/jobdetails/{base64(refnr)}` [S, bundesAPI README]. Unofficial: the BA has no officially documented public API; the key is the one the web app uses, documented by the community project github.com/bundesAPI/jobsuche-api [V README]. Many listings are German-language; filter `was=` with both English and German terms (KI, Kuenstliche Intelligenz, Data Scientist). |
| **EURES (EU)** | `POST https://europa.eu/eures/api/jv-searchengine/public/jv-search/search` body: `{"resultsPerPage":50,"page":1,"sortSearch":"MOST_RECENT","keywords":[{"keyword":"machine learning","specificSearchCode":"EVERYWHERE"}],"publicationPeriod":null,"occupationUris":[],"skillUris":[],"requiredExperienceCodes":[],"positionScheduleCodes":[],"sectorCodes":[],"educationAndQualificationLevelCodes":[],"positionOfferingCodes":[],"locationCodes":[],"euresFlagCodes":[],"otherBenefitsCodes":[],"requiredLanguages":[],"minNumberPost":null,"sessionId":"any"}` | None | [V] 200 JSON, `numberRecords` 406,063, items with `title, description, id, creationDate, locationMap{country:[nuts]}` | Undocumented endpoint used by the official portal UI (portal: `https://europa.eu/eures/portal/jv-se/search?lang=en`). The keyword match is loose (406k results for "machine learning", so it ORs words or matches any field); post-filter titles yourself. Use `locationCodes` (e.g. `de`, `nl`) and `publicationPeriod` (e.g. `LAST_DAY`/`LAST_WEEK` [U]) to narrow. Many records are stubs linking to the national source (e.g. finn.no). europa.eu robots.txt has no rule for /eures [V]. Status: unofficial, could change. |
| **Sweden JobTech (Arbetsformedlingen)** | `GET https://jobsearch.api.jobtechdev.se/search?q={q}&limit={n}&offset={o}` | None for basic use | [V] 200 JSON. "machine learning" 170 total, "LLM" 42 | Official open-data API (JobTech Dev). Also has a stream endpoint for changes [S]. Many Swedish-language ads; English tech ads common in Stockholm. |
| France Travail (ex Pole emploi) | `api.francetravail.io` "Offres d'emploi v2" | OAuth client credentials, free registration | [S] | Requires an app registration; good for France. Lower priority. |
| NAV Norway "pam-stilling-feed" | public feed with a public token | [S]/[U] | Norway. Low priority. |

### 2.2 Commercial and community job APIs

| Source | Endpoint (exact) | Auth / free tier | Verified result | Notes |
|---|---|---|---|---|
| **Arbeitnow** | `GET https://www.arbeitnow.com/api/job-board-api?page={p}` and `...?visa_sponsorship=true`; UK: `https://www.arbeitnow.co.uk/api/job-board-api` | None | [V] 200 JSON, 325 jobs per page, fields `slug, company_name, title, description, remote, url, tags, job_types, location, created_at`; 36 of 325 on page 1 matched AI terms. `visa_sponsorship=true` returned a different set (318 jobs, 103 not in the default page; 54 mention "visa" vs 16 in the default page) [V] | Meta text [V]: "This is a free public API for jobs, please do not abuse. I would appreciate linking back to the site. By using the API, you agree to the terms of service present on Arbeitnow.com". "Jobs are updated every hour". Mostly Germany, many German-language ads. |
| **Adzuna (all EU countries)** | `GET https://api.adzuna.com/v1/api/jobs/{country}/search/{page}?app_id=..&app_key=..&what=..&where=..&max_days_old=..&results_per_page=50` | Free key at developer.adzuna.com | [V] endpoint answers 400 without key; [S] countries include gb, de, fr, nl, pl, it, es, at, be, ch; [S] free tier about 25 calls/min, 250/day | Extend the existing UK integration with a loop over `de, nl, pl, fr, at, ch, es, it, be`. |
| **Reed (UK)** | `GET https://www.reed.co.uk/api/1.0/search?keywords=..&locationName=..&distanceFromLocation=..`; details `/api/1.0/jobs/{id}` | API key as Basic Auth username, empty password [V docs] | [V] 401 without key | Free key from reed.co.uk/developers. UK only, solid volume. |
| **Careerjet** | `GET https://search.api.careerjet.net/v4/query?locale_code=de_DE&keywords=..` | [V] 401: "You did not provide an API key. You need to provide your API key via HTTP Basic Auth as username value." | Free partner key (affiliate) [S] | Many locales (de_DE, en_GB, nl_NL, pl_PL, fr_FR...). Aggregator, duplicates. |
| **Jooble** | `POST https://jooble.org/api/{key}` body `{"keywords":"machine learning","location":"Germany"}` | Free key from jooble.org/api/about [S] | [U] not tested (no key). Website is Cloudflare challenged [V] | [S] free plan returns limited results. Aggregator, low priority. |
| **The Muse** | `GET https://www.themuse.com/api/public/jobs?page=1&category=..&level=..&location=Berlin%2C%20Germany` | Optional `api_key`; 500 req/h without, 3600 with [V docs] | [V] 200; "Data Science" + Berlin gave only 2 results | Mostly US. Skip or low priority. |
| **Landing.jobs** | `GET https://landing.jobs/api/v1/jobs?limit=50&offset=..` | None | [V] 200 JSON, fields include `relocation_paid, remote, gross_salary_low/high, currency_code, tags, locations, url` | Portugal and EU tech; `relocation_paid` is a useful visa/relocation proxy. Note robots.txt `Disallow: /api/` [V], which is about crawlers; the API itself is public. Use politely (a few calls/day). |
| **4dayweek.io** | `GET https://4dayweek.io/api/v2/jobs?q=machine%20learning&category=engineering&work_arrangement=remote&country=Germany&posted_after=7&limit=100` (also `/api/v1`, and MCP at `/api/mcp`) | None. [V] "A free, public, no-auth JSON API ... a link back to 4dayweek.io is all we ask." Rate limit [V]: "60 requests per minute per IP" | [V] 200 JSON, 25,640 total jobs | robots.txt explicitly `Allow: /api/v1`, `Allow: /api/v2` [V]. Params [V]: page, limit (max 100), category, level, schedule, work_arrangement, skills, country, salary_min/max, posted_after, q, sort. Not only 4-day-week jobs now. |
| **Working Nomads** | `GET https://www.workingnomads.com/api/exposed_jobs/` | None | [V] 200 JSON array (`url, title, description, ...`) | Remote only. robots.txt allows all [V]. |
| **NoDesk** | `GET https://nodesk.co/remote-jobs/index.xml` (RSS) | None | [V] 200 RSS | Remote. robots `Allow: /` [V]. |
| **Berlin Startup Jobs** | `https://berlinstartupjobs.com/feed/` and `https://berlinstartupjobs.com/skill-areas/machine-learning/feed/` | None | [V] 200 RSS (WordPress) | Small but on-target. robots only blocks /wp-admin/ [V]. |
| **Remote Rocketship** | `POST https://www.remoterocketship.com/api/openclaw/jobs` | Bearer key, **active paid subscription required** [V docs]; limits 3000 jobs or 500 requests per day, 50 per request [V] | n/a | Has visa sponsorship filter (H-1B and UK Skilled Worker) [V]. Paid, so skip unless budget changes. |
| **JustJoin.it (PL)** | Sitemap: `https://justjoin.it/sitemaps/active-jobs.xml` -> `https://justjoin.it/sitemaps/active-jobs/part0.xml` [V] | None | [V] 200 sitemap. Old JSON `api.justjoin.it/v2/user-panel/offers` returned 503 [V] | robots.txt `Disallow: /api/` [V]. Use the sitemap to get job URLs, then scrape detail pages (allowed by robots) sparingly or via Firecrawl. Category page `justjoin.it/job-offers/all-locations/ai` loads [V]. |
| Himalayas (already planned) | `https://himalayas.app/jobs/api?limit=..` | None | [V] 200 JSON; note in response: "21/08/2026: Cursor pagination is now available and is the preferred way ... Pass the nextCursor value" | Update the integration to cursor pagination. HTML pages are Cloudflare challenged [V], so API only. |
| HN (already planned) | `hacker-news.firebaseio.com/v0/...` | None | [V] 200 | No change. |

### 2.3 ATS public job endpoints (beyond Ashby, Greenhouse, Lever, Workable)

| ATS | Exact public endpoint | Verified | Notes |
|---|---|---|---|
| Ashby | `GET https://api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true` | [V] (mistral.ai: 207 jobs) | Slug is case sensitive (`AlephAlpha`) and can contain dots (`mistral.ai`) [V]. |
| Greenhouse | `GET https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true` | [V] (celonis 223) | `content=true` adds descriptions (3.8 MB for Celonis, so page or skip content and fetch details lazily). |
| Lever (US) / Lever EU | `GET https://api.lever.co/v0/postings/{slug}?mode=json` / `https://api.eu.lever.co/v0/postings/{slug}?mode=json` | [V] (spotify 76, pigment 139) | Try the EU host when US returns 404. |
| Workable | `GET https://apply.workable.com/api/v1/widget/accounts/{slug}` | [V] (huggingface 6) | |
| **SmartRecruiters** | `GET https://api.smartrecruiters.com/v1/companies/{companyId}/postings?limit=100&offset=0&q=..&country=de` ; detail `.../postings/{id}` | [V] deliveryhero `totalFound` 978, wise 399 | Returns 200 with `totalFound: 0` for unknown companies (so 0 does not mean "wrong slug" is impossible). `q` filtering looked loose [V]. |
| **Personio** | `GET https://{slug}.jobs.personio.de/xml` (also `.jobs.personio.com/xml`) | [V] merantix 12-16 positions | XML with `<position>` elements. Very common in German startups. |
| **Recruitee** | `GET https://{slug}.recruitee.com/api/offers/` | [V] responds JSON with `offers` | Common in NL. |
| **Teamtailor** | `GET https://{slug}.teamtailor.com/jobs.rss` (or on the custom career domain `/jobs.rss`) | [V] tibber 200 RSS; other guessed slugs 404 | Common in Nordics. Teamtailor's full API needs a company key. |
| **Workday (CXS)** | `POST https://{tenant}.wd{N}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs` body `{"appliedFacets":{},"limit":20,"offset":0,"searchText":"machine learning"}` | [V] nvidia.wd5 / NVIDIAExternalCareerSite: 200 JSON, total 552 | Tenant, wd number and site name come from the public careers URL. Detail: `GET .../wday/cxs/{tenant}/{site}{externalPath}` [S]. Used by many big EU corporates (SAP uses SuccessFactors though). |
| **Breezy HR** | `GET https://{slug}.breezy.hr/json` | [V] rhynocare 200 JSON | Whole board in one response. |
| **Pinpoint** | `GET https://{slug}.pinpointhq.com/postings.json` | [V] workwithus 200 JSON | Popular with UK companies. |
| **BambooHR** | `GET https://{slug}.bamboohr.com/careers/list` (JSON), detail `/careers/{id}/detail` | [S]; my test on a placeholder slug returned the marketing HTML [V], so needs a real customer slug and maybe `Accept: application/json` | |
| **Join.com** | robots.txt [V]: sitemaps `https://join.com/companies/sitemap.xml`, `https://join.com/companies/sitemap-jobs-index.xml`, plus `https://join.com/llms.txt` | [V] robots | No documented public JSON per company found [U]; use sitemap + detail pages. |
| **Homerun** | `https://{slug}.homerun.co/` (HTML) | [V] kyutai.homerun.co 200 | No public JSON found [U]; scrape with Firecrawl (robots not checked). |
| **Factorial** | `https://{slug}.factorialhr.com/` career pages | [U] | No public JSON verified. |
| **iCIMS** | Booking.com uses iCIMS (`jobs.booking.com` page contains 23 icims.com references [V]) | | Scrape career site HTML or search via Firecrawl. |

---

## 3. Job boards: access, terms and bot protection

Status column legend: HTTP status from a plain request with a browser user agent today. "CF challenge" means Cloudflare returned `cf-mitigated: challenge` (a JS/CAPTCHA wall). Firecrawl verdict: **OK** (robots allows listing pages, no wall seen), **Partial** (some paths disallowed, or wall), **No** (explicit prohibition or hard wall; do not attempt), **Unclear**.

### 3.1 Europe-wide and national boards

| Board | Coverage, AI/ML volume (rough) | Machine-readable access | Search URL template | robots.txt / terms (quoted) and protection | Firecrawl verdict | Recommended path |
|---|---|---|---|---|---|---|
| **StepStone** (DE, NL, BE, AT, etc.) | Largest private board in DE; hundreds of ML jobs [U] | None public | `https://www.stepstone.de/jobs/{query}` | [V] robots.txt returns 403; listing returns 403 "Access Denied" (API Gateway / Akamai-style) | **No** | Skip. Many StepStone ads also appear in BA and EURES. Optional: Firecrawl `/search` with `includeDomains:["stepstone.de"]` to read Google-style results only. |
| **Xing** (DACH) | Large; job pages exist for AI | None public | `https://www.xing.com/jobs/search?keywords=..` ; SEO pages `https://www.xing.com/jobs/berlin-machine-learning` | [V] `Disallow: /jobs/search/`, `Disallow: /jobs/search?*` for `*`. SEO landing pages are allowed and return 200 [V]. Detail page I tested returned 410 (expired) [V]. Named AI bots (GPTBot, ClaudeBot...) have their own groups [V] | **Partial** | Low priority. Firecrawl on SEO pages like `/jobs/{city}-machine-learning` is allowed by robots. Many Xing jobs are syndicated from other boards. |
| **Indeed** (de, uk, nl, fr...) | Very large | RSS removed; Publisher API closed [S] | `https://de.indeed.com/jobs?q=..&l=..` | [V] 403 Cloudflare challenge on listing and on `/rss`. robots.txt has a section titled "# Full disallow for aggressive scrapers, legacy crawlers, and unwanted utility bots." | **No** | Get Indeed content indirectly through JSearch (Google for Jobs) which is already in the plan. |
| **Glassdoor** | Large | None | glassdoor.de SRCH URLs | [V] 403 Cloudflare challenge. robots fully blocks 24 named agents including GPTBot, Google-Extended, Amazonbot | **No** | Skip; Google Jobs covers part of it. |
| **LinkedIn** | Largest | None for this use | n/a | [V] robots.txt: "# Notice: The use of robots or other automated means to access LinkedIn without the express permission of LinkedIn is strictly prohibited." `User-agent: *` `Disallow: /` | **No** | Skip. Use LinkedIn job alert emails manually, or Google Jobs. |
| **Welcome to the Jungle (+ Otta)** | FR, UK, ES, DE, NL; strong startup coverage; Otta now redirects into WTTJ [V: otta.com/robots.txt redirects to uk.welcometothejungle.com] | Algolia-backed frontend, no public API | `https://www.welcometothejungle.com/en/jobs?query=machine%20learning` | [V] robots: `disallow: */jobs?query=*`. Page returns 200 [V] | **Partial** (search URLs disallowed; company pages allowed) | Prefer company ATS directly (most WTTJ companies use Ashby/Greenhouse/Lever/Teamtailor). Optionally Firecrawl `/search` with `includeDomains:["welcometothejungle.com"]`. |
| **Wellfound** (ex AngelList Talent) | Global startups, many remote | None public | `https://wellfound.com/role/l/machine-learning-engineer/europe` | [V] 200 but CAPTCHA script present; robots disallows `/_jobs/`, `/*?jobId=*`, `/jobs/applications`. Known DataDome protection [S] | **Partial/Unclear** | Low priority. Firecrawl `/search` with `includeDomains:["wellfound.com"]`. |
| **Landing.jobs** | Portugal + EU, tech | **API** (section 2.2) | `https://landing.jobs/jobs?q=..` | [V] robots disallows `/jobs/search`, `/api/` | OK via API | Use API. |
| **Relocate.me** | Relocation-friendly tech jobs in EU (NL, DE, ES, PT...), explicitly relocation/visa | Job detail pages carry JSON-LD `JobPosting` [V: 1 per detail page] | `https://relocate.me/international-jobs/machine-learning-engineer` (search redirects here [V]) | [V] robots only blocks `/install/`, `/manager/`, `/uploads/` | **OK** | Firecrawl the category page daily, then fetch detail pages and parse JSON-LD. High fit for visa seekers. |
| **EuroTechJobs** | EU tech, small | No RSS at `/rss` (404) [V] | `https://www.eurotechjobs.com/job_search/keyword/machine%20learning` (200 [V]) | robots.txt returned HTML [V] (no rules) | **Unclear/OK** | Low priority Firecrawl. |
| **Berlin Startup Jobs** | Berlin startups | RSS [V] | `/skill-areas/machine-learning/` | robots allows [V] | OK | Use RSS. |
| **SwissDevJobs / GermanTechJobs / DevITjobs** | Used to be CH/DE dev boards with salaries | Gone: all three now redirect to `devitjobs.jobcopilot.com/signup` [V] | n/a | n/a | n/a | Drop. |
| **JustJoin.it** (PL) | Biggest PL IT board; AI category exists | Sitemap [V] | `https://justjoin.it/job-offers/all-locations/ai` | [V] `Disallow: /api/`, `Disallow: /oferty-pracy/*,*` | **Partial** | Sitemap -> detail pages, low frequency. Many PL roles are B2B contracts that accept remote from outside PL [U]. |
| **NoFluffJobs** (PL, CZ, HU, NL...) | Large in PL | None public | `https://nofluffjobs.com/artificial-intelligence` (200 [V], CAPTCHA script present) | [V] `Disallow: /api/`, `Disallow: /posting/`, `/pl/posting/` etc. | **Partial** (listing allowed, postings disallowed) | Firecrawl the category listing only (allowed), link out. |
| **Bulldogjob** (PL) | Mid | No RSS (`/rss` 404) [V] | `https://bulldogjob.pl/companies/jobs/s/skills,Machine%20Learning` (200 [V]) | robots has 11 rules for `*`, none for jobs [V] | OK | Low priority Firecrawl. |
| **Pracuj.pl** | Largest PL general board | None | `https://www.pracuj.pl/praca/machine%20learning;kw` | [V] 403 Cloudflare challenge, robots 403 | **No** | Skip. |
| **CV-Library** (UK) | Large UK | Partner API only [S] | `/machine-learning-jobs` | [V] 403 Cloudflare | **No** | Skip; Reed + Adzuna cover UK. |
| **Totaljobs** (UK, StepStone group) | Large UK | None | `/jobs/machine-learning` | [V] 403 Access Denied | **No** | Skip. |
| **Reed** (UK) | Large UK | **API** [V] | `https://www.reed.co.uk/jobs/machine-learning-jobs` (200 [V]) | robots disallows `/api/` for crawlers (API is keyed separately), and has a comment "# Explicit Allow Rules for Major AI and LLM Crawlers" [V] | OK via API | Use API. |
| **IrishJobs.ie / Jobs.ie** (IE, StepStone group) | Ireland | None | `/jobs/machine-learning` | [V] 403 Access Denied | **No** | Skip; use Adzuna? (Adzuna has no IE endpoint [S]); rely on ATS + Google Jobs for Ireland. |
| **jobs.ch** (CH) | Switzerland | Listing pages embed **20 JSON-LD JobPosting** blocks [V] | `https://www.jobs.ch/en/vacancies/?term=machine%20learning` | robots disallows `/api/`, `/en/vacancies/detail/*/*/*` [V] | **Partial** (listing OK, deep detail paths disallowed) | Firecrawl listing page, parse JSON-LD. Good CH source. |
| **karriere.at** (AT) | Austria | none found | `https://www.karriere.at/jobs/machine-learning` (200 [V]) | robots minimal [V] | OK | Low priority Firecrawl. |
| **jobindex.dk** (DK) | Denmark, biggest | none found | `https://www.jobindex.dk/jobsoegning?q=machine+learning` (200 [V]) | no blanket block [V] | OK | Low priority Firecrawl. |
| **itjobs.pt** (PT) | Portugal IT | none found | `https://www.itjobs.pt/emprego?q=machine+learning` (200 [V]) | blocks GPTBot, CCBot fully [V] | OK for normal crawlers | Low priority. |
| **FINN.no** (NO) | Norway | n/a | n/a | [V] "# Notice: Crawling FINN.no is prohibited unless you have written permission." | **No** | Skip (FINN ads appear inside EURES anyway [V: first EURES record linked finn.no]). |
| **InfoJobs** (ES) | Spain | n/a | n/a | [V] fully blocks GPTBot, ClaudeBot, OAI-SearchBot etc.; CAPTCHA on listing | **No** | Skip. |
| **Tecnoempleo** (ES) | Spain IT | n/a | n/a | [V] fully blocks AnthropicBot, ClaudeBot, Claude-SearchBot, GPTBot | **No** for AI agents | Skip. |
| **HelloWork / APEC** (FR) | France | n/a | | HelloWork blocks 549 named agents [V]; APEC robots 403 [V] | **No/Unclear** | Skip; use France Travail API if France matters. |
| **Free-Work** (FR, freelance + CDI tech) | France tech | n/a | `https://www.free-work.com/en-gb/tech-it/jobs?query=..` (200 [V]) | minimal rules [V] | OK | Low priority. |
| **JobTeaser** | Graduate jobs | n/a | | [V] 403 Cloudflare challenge | **No** | Skip. |
| **Jobs.cz / Jobs.lu / cvbankas.lt / cvkeskus.ee / Duunitori.fi / Arbetsformedlingen** | National | Use JobTech for SE | | jobs.cz OK-ish [V], jobs.lu 403 [V], cvbankas 403 [V], cvkeskus rules minor [V], duunitori 403 [V] | mixed | Prefer EURES which aggregates national services. |
| **Jooble / Careerjet / Adzuna websites** | Aggregators | APIs (section 2.2) | | Jooble web CF challenge [V]; adzuna.de 403 [V]; careerjet robots disallows `/job/`, `/search/query.html`, and fully blocks CCBot [V] | **No** (web) | Use their APIs only. |
| **EU-Startups jobs** | EU startups | n/a | | [V] 403 | **No** | Skip. |
| **EU Remote Jobs** (euremotejobs.com) | Remote in EU | n/a | | [V] DataDome present; robots disallows all `?search_*` params | **Partial/No** | Skip. |

### 3.2 Remote, global and AI-specific boards

| Board | Notes | Access | robots / protection | Verdict and path |
|---|---|---|---|---|
| **Y Combinator jobs** (`ycombinator.com/jobs`) | YC startups, many AI; some remote/EU | Page embeds an Inertia `data-page` JSON blob (component `WaasJobListingsPage`) [V]; no JSON-LD on listing [V] | robots `Allow: /` [V] | **OK**: Firecrawl or plain fetch of `https://www.ycombinator.com/jobs/role/software-engineer` (and `/jobs/role/...` variants), parse `data-page`. **Work at a Startup** returned 406 to curl [V] and needs login for full data: skip. |
| **ai-jobs.net / aijobs.net** | Now redirects to `foorilla.com/hiring/` [V] | none found (`/hiring/rss/` redirects to HTML) [V] | foorilla robots disallows `/hiring/jobs/*/apply/`, `/work/filter/` [V] | Low priority Firecrawl of `https://foorilla.com/hiring/jobs/`. |
| **aijobs.com** | AI job board | none found | robots disallows `/rss/` only [V] | Firecrawl OK, low priority. |
| **aijobs.ai** | AI job board | none | robots `Disallow: /job/` [V] | **Partial**: listing only. |
| **MLjobs.io** | ML jobs | none found | robots allows all [V] | Firecrawl OK. |
| **Hugging Face jobs** | `huggingface.co/jobs` now redirects to login / settings/jobs (that is HF's compute "Jobs" product) [V] | Hugging Face's own hiring is on Workable `huggingface` [V] | | Drop the board idea; add the Workable board. |
| **LangChain / LlamaIndex job boards** | No active public board found [U] | | | Skip; add LangChain (Ashby `langchain` [U]) and LlamaIndex (Ashby `llamaindex` [U]) company boards if wanted. |
| **Kaggle jobs** | `kaggle.com/jobs` returns a CAPTCHA page; Kaggle's job board was discontinued years ago [S] | | | Skip. |
| **Dice** | US-centric | | robots disallows `/job`, `/jobs?q*`, `/rss/` [V] | **No**. Skip. |
| **Built In** | US cities + remote | | [V] 403 Cloudflare; robots fully blocks GPTBot, OAI-SearchBot, ChatGPT-User, PerplexityBot | **No**. Skip. |
| **Levels.fyi jobs** | Global, salary-rich | none public | robots has no rules for `*` [V]; page 200 with CAPTCHA script [V] | Unclear; low priority. |
| **Remote Rocketship** | Remote, has visa filters | Paid API [V] | robots disallows `/api` except docs [V] | Skip unless paying. |
| **4dayweek.io** | | Free API [V] | explicit allow [V] | **Use API.** |
| **Arc.dev** | Remote dev jobs incl. AI | none public | robots `Allow: /`, has a named ClaudeBot group [V]; page 200 [V] | Firecrawl OK: `https://arc.dev/remote-jobs/machine-learning`. |
| **Turing** | Remote contract roles for devs | none | robots disallows `/api/*`, `/linkedinjobs.xml` [V] | Firecrawl `https://www.turing.com/remote-developer-jobs` (200 [V]). Low priority; Turing is a vetting marketplace. |
| **Toptal** | Freelance network; job board is marketing | | robots minimal [V] | Skip (application-based network). |
| **Remote.com jobs** | `remote.com/jobs/all` 200 [V] | none public | robots minimal [V] | Firecrawl OK, low priority. |
| **startup.jobs** | Global startups | | [V] Cloudflare challenge; robots comment: "# Auth pages: no search value, and crawling them loads Turnstile widgets" | **No** (wall). |
| **Talent.io** | TLS certificate mismatch today [V]; reported merged/closed [U] | | | Drop. |
| **Hired** | `hired.com` redirects to `lhh.com/.../our-story` [V] (shut down) | | | Drop. |
| **Honeypot** | Connection failed [V]; reported shut down by New Work in 2024 [S] | | | Drop. |
| **Malt** (EU freelance) | | | [V] 403 Cloudflare, robots 403 | **No**. |
| **freelancermap** (DACH freelance) | Projects page 200 [V] | feed URL guessed 404 [V] | robots minimal [V] | Firecrawl OK, low priority; useful for freelance AI projects in DACH. |
| **Upwork** | | RSS removed [S]; robots disallows `/jobs/rss`, `/rss/`, `/*/jobs/search*` [V]; CF challenge [V] | **No**. |
| **Contra** | `/jobs` redirects to login [V]; Content-Signal `ai-train=no, search=yes, ai-input=yes` [V] | **No** (login). |
| **Braintrust** | `app.usebraintrust.com/jobs/` 200 with CAPTCHA script [V]; robots `Allow: /`, `Disallow: /api/` [V] | Unclear; low priority. |

---

## 4. European AI companies: verified ATS and slugs

All rows below were confirmed today by calling the public endpoint and receiving jobs [V], unless marked. "AI roles" counts titles matching ai/ml/llm/genai/machine learning/applied scientist/research engineer/data scientist/nlp/agent/forward deployed.

### 4.1 Core AI labs and AI-native companies

| Company | HQ | ATS | Slug / endpoint | Open jobs | AI-titled |
|---|---|---|---|---|---|
| Mistral AI | Paris | Ashby | `mistral.ai` (found via careers page) | 207 | 66 |
| Aleph Alpha | Heidelberg | Ashby | `AlephAlpha` (case sensitive) | 1 | 0 |
| DeepL | Cologne | Ashby | `deepl` | 16 | 0 [U: may be partial board] |
| Helsing | Munich/London | Ashby (also an older Greenhouse `helsing` with 166) | `helsing` | 167 | 14 |
| Synthesia | London | Ashby | `synthesia` | 45 | 7 |
| ElevenLabs | London/remote | Ashby | `elevenlabs` | 136 | 11 |
| PolyAI | London | Greenhouse | `polyai` | 3 | 0 |
| Wayve | London | Ashby | `wayve` | 152 | 33 |
| Poolside | Paris/remote | Ashby | `poolside` [U: only 2 jobs, may be another org] | 2 | 0 |
| Black Forest Labs | Freiburg | Ashby | `black-forest-labs` | 14 | 1 |
| Hugging Face | Paris/NY/remote | Workable | `huggingface` | 6 | 5 |
| n8n | Berlin | Ashby | `n8n` | 35 | 2 |
| Langfuse | Berlin | Ashby | `langfuse` (board exists, 0 open today) [V] | 0 | 0 |
| Qdrant | Berlin | not found on 8 ATS patterns; careers page had no ATS link [V] | [U] | | |
| Weaviate | Amsterdam/remote | Ashby | `weaviate` | 3 | 0 |
| deepset | Berlin | Ashby | `deepsetai` (from careers page) | 4 | 0 |
| Cohere | Toronto/London | Ashby | `cohere` | 126 | 32 |
| Lovable | Stockholm | Ashby (also Greenhouse `lovable` 61) | `lovable` | 80 | 9 |
| Photoroom | Paris | Ashby | `photoroom` | 15 | 3 |
| Dust | Paris | Ashby | `dust` | 23 | 1 |
| Parloa | Berlin | Greenhouse | `parloa` | 51 | 10 |
| Langdock | Berlin | Ashby (also Personio `langdock`) | `langdock` | 26 | 3 |
| Merantix | Berlin | Personio XML | `merantix.jobs.personio.de/xml` | 16 | 6 |
| Faculty | London | Ashby | `faculty` | 78 | 31 |
| Isomorphic Labs | London | Greenhouse | `isomorphiclabs` | 27 | 4 |
| Stability AI | London | Greenhouse | `stabilityai` | 6 | 1 |
| Cradle | Amsterdam/Zurich | Ashby | `cradlebio` | 9 | 0 |
| Kyutai | Paris | Homerun | `kyutai.homerun.co` (HTML) | | |
| Nabla | Paris | Ashby | `nabla` | 17 | 1 |
| Owkin | Paris | Ashby | `owkin` | 4 | 0 |
| Pathway | Paris/remote | Workable | `pathwaycom` | 5 | 3 |
| Tractable | London | Ashby | `tractable` | 4 | |
| Quantexa | London | Ashby | `quantexa` | 36 | 0 |
| Causaly | London | Ashby | `causaly` | 5 | |
| Signal AI | London | Ashby | `signal-ai` | 5 | |
| Prolific | London | Greenhouse | `prolific` | 32 | |
| Legora | Stockholm | Ashby | `legora` | 277 | 7 |
| Writer (US, EU hiring) | | Ashby | `writer` | 50 | 24 |
| Harvey (US, London office) | | Ashby | `harvey` | 331 | 9 |
| Granola (London) | | Ashby | `granola` | 19 | 1 |
| JetBrains | Prague/Amsterdam/Munich | Greenhouse | `jetbrains` | 63 | 9 |
| Graphcore | Bristol | Greenhouse | `graphcore` | 176 | |
| Thought Machine | London | Ashby | `thought-machine` | 40 | 4 |

Not found on any tested ATS (own career sites or unknown) [V not found, U on reason]: Zalando (jobs.zalando.com own site), Klarna, Revolut (own site), Bolt, Vinted, Glovo, Taxfix, Trade Republic (Greenhouse `traderepublic` has only 1 job, likely partial), Unbabel, Cognigy, InstaDeep, LightOn, Checkout.com, Productboard, Adevinta, Factorial, TravelPerk, Qdrant, Booking.com (iCIMS [V]). For these, use Firecrawl on the careers page weekly, or rely on Google Jobs (JSearch).

### 4.2 Large EU tech and scale-ups (AI hiring inside product teams)

| Company | ATS | Slug | Open | AI-titled |
|---|---|---|---|---|
| Spotify | Lever | `spotify` | 76 | 11 |
| Adyen | Greenhouse | `adyen` | 229 | 8 |
| Delivery Hero | SmartRecruiters | `deliveryhero` | 978 | (timed out on full pull) |
| N26 | Greenhouse | `n26` (embed confirmed on n26.com) | 42 | 1 |
| Personio | own Personio page (`personio.jobs.personio.de/xml` returned 1) [U] | | | |
| Celonis | Greenhouse | `celonis` | 223 | 40 |
| Monzo | Greenhouse | `monzo` | 68 | 7 |
| Wise | SmartRecruiters (`wise` 399) and Greenhouse (`wise` 15) | | | |
| GoCardless | Greenhouse | `gocardless` | 27 | |
| GetYourGuide | Greenhouse | `getyourguide` | 60 | 0 |
| Doctolib | Ashby (also GH) | `doctolib` | 152 | 13 |
| Alan | Ashby | `alan` | 117 | 4 |
| Qonto | Ashby (also Lever) | `qonto` | 45 | 3 |
| Pigment | Lever | `pigment` | 139 | 9 |
| Mollie | Ashby | `mollie` | 44 | 1 |
| Back Market | Ashby | `backmarket` | 36 | 0 |
| Mirakl | Greenhouse | `mirakl` | 27 | |
| Contentful | Greenhouse | `contentful` | 18 | |
| Miro | Ashby | `miro` | 25 | 1 |
| Datadog (big EU offices) | Greenhouse | `datadog` | 432 | 25 |
| Elastic | Greenhouse | `elastic` | 420 | 26 |
| HelloFresh | Greenhouse | `hellofresh` | 424 | 9 |
| SumUp | Greenhouse | `sumup` | 334 | 13 |
| Wolt | Greenhouse | `wolt` | 218 | 1 |
| Deliveroo | Greenhouse (`deliveroo` 195) | | | |
| Trivago | Greenhouse | `trivago` | 14 | |
| Raisin | Greenhouse | `raisin` | 37 | |
| Flix | Greenhouse | `flix` | 147 | |
| Typeform | Greenhouse | `typeform` | 13 | |
| Cabify | Greenhouse | `cabify` | 69 | |
| Jobandtalent | Lever | `jobandtalent` | 28 | |
| Oura | Greenhouse | `oura` | 78 | |
| Smartly | Greenhouse | `smartlyio` | 68 | 5 |
| Mews | Greenhouse | `mewssystems` | 35 | 0 |
| Ocado | Greenhouse | `ocadogroup` | 49 | 1 |
| ICEYE | Ashby | `iceye` | 187 | 2 |
| Supercell | Ashby | `supercell` | 32 | 0 |
| Pleo | Ashby | `pleo` | 32 | |
| Lunar | Ashby | `lunar` | 15 | |
| Nord Security | Ashby | `nord-security` | 137 | 3 |
| Rohlik | Ashby | `rohlik` | 100 | 2 |
| Docplanner | Ashby | `docplanner` | 43 | |
| Babbel | Ashby | `babbel` | 12 | |
| Paddle | Ashby | `paddle` | 20 | |
| Primer | Ashby | `primer` | 26 | |
| Zego | Ashby | `zego` | 44 | |
| Veriff | Greenhouse | `veriff` | 12 | |
| Pipedrive | Lever | `pipedrive` | 6 | |
| Tibber | Teamtailor RSS | `tibber.teamtailor.com/jobs.rss` | | |
| Booking.com | iCIMS | jobs.booking.com | | |

Slug caveats: generic slugs (`dust`, `lunar`, `writer`, `alan`, `primer`) could in principle belong to a different company with the same name. The titles and locations returned looked right for the ones I spot-checked (Mistral, Helsing, Celonis, Hugging Face), but store the company name and check the job URLs on first ingest.

---

## 5. Visa angle

### 5.1 Thresholds and requirements (2026)

| Route | Key requirement | 2026 salary threshold | Source / label |
|---|---|---|---|
| **EU Blue Card, Germany** | Recognised degree (or IT specialist with 3 years experience in last 7, no degree), job offer | Standard **EUR 50,700/yr**; reduced **EUR 45,934.20/yr** for shortage occupations (IT/MINT included), young professionals (degree within 3 years) and IT specialists without degree | [S] (make-it-in-germany.com blocked by Radware bot check today; figures from GPA, aldaglegal, EY alerts) |
| **Germany Opportunity Card (Chancenkarte)** | Points system (qualification recognition, language, age, experience, Germany ties); allows job search in DE up to 1 year and part-time work up to 20 h/week plus trial work [S] | Proof of funds **EUR 1,091/month** (EUR 13,092 for 12 months, blocked account or other proof) | [S] |
| **Netherlands Highly Skilled Migrant (kennismigrant)** | Employer must be an IND **recognised sponsor** | Age 30+: **EUR 5,942/month** gross; under 30: **EUR 4,357**; reduced (recent graduate): **EUR 3,122** (excl. holiday pay), valid 1 Jan to 31 Dec 2026 | [V] ind.nl |
| **Netherlands EU Blue Card** | Degree + job offer | **EUR 5,942/month**; reduced **EUR 4,754** | [V] ind.nl |
| **UK Skilled Worker** | Employer must hold a sponsor licence (on the register); job at eligible occupation code | General threshold **GBP 41,700/yr** or the occupation going rate if higher; can be **GBP 33,400** in some cases ("When you can be paid less", e.g. new entrants) | [V] gov.uk |
| **Ireland Critical Skills Employment Permit** | 2-year job offer; occupations on the Critical Skills Occupations List (ICT roles included) with relevant degree | **EUR 40,904** (relevant degree, CSOL occupation), **EUR 36,848** if qualified in last 12 months; **over EUR 68,911** for other occupations | [V] enterprise.gov.ie |
| **Poland EU Blue Card** | Degree or 5 years experience (3 for IT) [S]; job offer of at least 6 months [S] | **PLN 13,355/month gross** (150% of 2025 average wage PLN 8,903.56) | [S] Grant Thornton PL |
| **Estonia** | Startup employment route: Startup Committee-approved startups can hire non-EU staff with relaxed salary rules (coefficient around 0.8 of average wage cited, no Unemployment Fund permission) [S]; "top specialist" route around 1.5x average wage [S]; average gross wage about EUR 2,000/month [S] | [S]/[U], verify at migrationmarket / politsei.ee before relying on it |

### 5.2 Sponsor registers the tool can use

| Register | Format | Verified details | How to use |
|---|---|---|---|
| **UK Register of licensed sponsors: workers** | CSV, updated frequently | [V] Page `https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers`; today's file `https://assets.publishing.service.gov.uk/media/6ac60ad235adbc27761df954/SP_-_Worker_and_Temporary_Worker_Web_Register_-_2026-10-07.csv` (10.9 MB, 143,177 lines). Header: `Organisation Name,Town/City,County,Type & Rating,Route`. 123,150 rows with route "Skilled Worker". Confirmed present: Synthesia Limited, Wayve Technologies Ltd, PolyAI Limited, Faculty Science Limited, Helsing Limited, Monzo Bank Ltd (all "Worker (A rating), Skilled Worker"). | Weekly GitHub Action: scrape the gov.uk page for the current `.csv` link (filename changes daily), download, keep only `Route = Skilled Worker`, normalise names (lowercase, strip "limited/ltd/plc/uk/llp", punctuation), upsert to a Supabase `uk_sponsors` table (about 120k rows, fine on free tier). At ingest, fuzzy match the job's company name (pg_trgm similarity > 0.8) and set `uk_sponsor=true`. |
| **IND public register of recognised sponsors (NL), labour and highly skilled migrants** | HTML table, no download file found | [V] `https://ind.nl/en/public-register-recognised-sponsors/public-register-regular-labour-and-highly-skilled-migrants` (redirects to `.../public-register-work`), about 13,025 table rows with Organisation and KVK number; "The overview was last updated on 5 October 2026"; "The public registers are updated once a month." | Monthly job: fetch the page (plain HTTP works, about 1 MB), parse `<tr>` rows into `nl_sponsors(name, kvk)`. Match the same way. |
| Germany, Ireland, Poland | No employer register needed for Blue Card (any employer can hire if salary and degree criteria are met) | | Flag by salary vs threshold and by text signals. |

### 5.3 Flagging "visa sponsorship" in a posting

Compute three signals, show them as chips, and let the LLM scorer use them:

1. **Text signals (regex, case-insensitive, EN + DE + NL + PL + FR):**
   - Positive: `visa sponsorship`, `sponsor(ship)? (your|a)? ?visa`, `we sponsor`, `relocation (package|support|assistance|budget)`, `relocation (is )?(provided|offered|paid)`, `blue card`, `skilled worker visa`, `highly skilled migrant`, `kennismigrant`, `work permit (support|assistance)`, `Visum`, `Visaunterst(ue|ü)tzung`, `Umzugsunterst(ue|ü)tzung`, `Relocation-Unterst(ue|ü)tzung`, `wiza`, `relokacja`, `aide (à la|a la) relocation`, `open to candidates (worldwide|from anywhere)`, `remote (from )?anywhere`.
   - Negative: `no (visa )?sponsorship`, `unable to sponsor`, `cannot sponsor`, `must (have|hold) (the )?right to work`, `EU (work )?(permit|authori[sz]ation) required`, `only (EU|EEA) (citizens|residents)`, `must be based in (the )?(UK|EU|US)`, `Arbeitserlaubnis (erforderlich|vorausgesetzt)`, `US only`, `within (CET|UTC[+-]\d) ?± ?\d`.
   - Structured: Arbeitnow `visa_sponsorship=true` filter [V], Landing.jobs `relocation_paid` field [V], Relocate.me (every listing is relocation-oriented [S]).
2. **Register signal:** UK sponsor CSV match, NL IND register match (section 5.2).
3. **Salary signal:** parse salary when present (Ashby `includeCompensation=true`, Landing.jobs `gross_salary_low/high`, Greenhouse pay transparency text) and compare with the thresholds in 5.1 (e.g. NL role at EUR 72k+/yr clears the HSM 30+ bar of EUR 5,942/month x 12 = EUR 71,304 excluding holiday pay; UK role at GBP 41,700+).

A simple combined label: `likely` (positive text OR register match AND salary not below threshold), `possible` (register match only, or relocation text), `unlikely` (negative text), `unknown`.

---

## 6. Firecrawl: pricing and how to budget

### 6.1 Pricing [V, firecrawl.dev/pricing today]

| Plan | Price (billed annually) | Credits/month | Scrape/Map/Search rate | Concurrent browsers |
|---|---|---|---|---|
| Free | $0 | 1,000 (no card) | 10/min | 2 |
| Hobby | $16/mo | 5,000 | 100/min | 5 |
| Standard | $83/mo | 100,000 | 500/min | 25 |
| Growth | $333/mo | 500,000 | 5,000/min | 50 |
| Scale | $599/mo | 1,000,000 | 10,000/min | 100 |

Credit costs [V]: scrape 1/page; crawl 1/page; **search 2 credits per 10 results** (rounded up); JSON / question / highlight formats **+4 credits per page**; monitor 1/page/check; interact 2/browser minute. Prompt-injection check on JSON extraction adds +4 [V docs].

### 6.2 `/v2/search` options [V, docs.firecrawl.dev/features/search]

`POST https://api.firecrawl.dev/v2/search` with: `query` (required), `limit`, `sources` (`web`, `news`, `images`), `categories` (`research`, `pdf`, `developer`, `gov`), `tbs` (`qdr:h`, `qdr:d`, `qdr:w`, `qdr:m`, `qdr:y`, `sbd:1`, or custom date range), `location` (e.g. `"Germany"`), `country` (code), `timeout`, `includeDomains`, `excludeDomains`, `highlights`, `safe`, and `scrapeOptions` (any scrape option, e.g. `{"formats":["markdown"]}`).

JSON extraction syntax in v2 [V, docs.firecrawl.dev/features/llm-extract]: `"formats":[{"type":"json","schema":{...},"prompt":"..."}]` (the v1 `jsonOptions` no longer exists). The same object can go inside `scrapeOptions` of `/search` [U, docs say every scrape option is supported].

Robots: Firecrawl's agent (`FirecrawlAgent`) is reported to respect robots.txt by default on the hosted service [S, third-party writeups; not confirmed on Firecrawl's own docs today]. Do not use stealth/enhanced proxy modes to get past bot walls.

### 6.3 Budget sketch (stay on Free, 1,000 credits/month)

| Use | Calls | Credits/month |
|---|---|---|
| Discovery search, e.g. `"machine learning engineer" visa sponsorship` with `tbs:"qdr:d"`, `includeDomains:["welcometothejungle.com","wellfound.com","xing.com","relocate.me","jobs.ch"]`, limit 10, no scrapeOptions | 5 queries/day x 30 | 300 |
| Relocate.me category page (markdown) + jobs.ch listing (JSON-LD in HTML) + YC jobs page | 3 scrapes/day x 30 | 90 |
| Detail scrapes for shortlisted jobs only (markdown, LLM extraction done by Gemini, not Firecrawl JSON) | about 15/day x 30 | 450 |
| Weekly careers-page checks for companies without public ATS (Zalando, Klarna, Revolut, Qdrant, Booking...) | 10/week | 40 |
| **Total** | | **about 880** |

Rule of thumb: never use Firecrawl JSON format (5 credits/page) when Gemini can extract from markdown for free; never use Firecrawl for any source that has an API or RSS (sections 2 and 4); run Firecrawl only from the GitHub Actions cron, not from Vercel functions (60 s limit).

---

## 7. Integration notes for Signal Desk

- **Where to run:** All pulls from GitHub Actions (public repo cron, free minutes). Big responses (Greenhouse `content=true`, Delivery Hero SmartRecruiters, EURES pages) are too slow for a 60 s Vercel function.
- **Company registry table:** `companies(name, ats, slug, host, country, last_seen)` seeded from section 4; one generic fetcher per ATS (ashby, greenhouse, lever, lever-eu, workable, smartrecruiters, personio-xml, recruitee, teamtailor-rss, workday-cxs, breezy, pinpoint).
- **Dedup:** normalise `company + title + city`, and keep `apply_url` canonical; aggregators (Adzuna, Careerjet, EURES, Jooble) duplicate ATS jobs heavily.
- **Language:** BA, JobTech, EURES, Arbeitnow return many non-English ads; let the scorer down-rank "Deutsch C1 required" unless English is stated.
- **Location filter for remote roles:** keep "remote" jobs only when text includes worldwide/anywhere/EMEA/Europe-with-non-EU-OK or timezone windows that include UTC+5; drop "remote US only".
- **Politeness:** add a 1 s delay per host, cache ETags, and send a descriptive User-Agent with a contact URL; link back to Arbeitnow and 4dayweek in the UI as their terms ask.

---

## 8. Sources

Primary (fetched today):
- Bundesagentur fuer Arbeit API: `https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs`; community docs https://github.com/bundesAPI/jobsuche-api
- EURES: https://europa.eu/eures/portal/jv-se/search?lang=en ; `https://europa.eu/eures/api/jv-searchengine/public/jv-search/search`
- JobTech: https://jobsearch.api.jobtechdev.se/search
- Arbeitnow: https://www.arbeitnow.com/api/job-board-api ; https://www.arbeitnow.com/blog/job-board-api
- 4dayweek: https://4dayweek.io/developers ; https://4dayweek.io/api/v2/jobs
- Landing.jobs: https://landing.jobs/api/v1/jobs
- Working Nomads: https://www.workingnomads.com/api/exposed_jobs/
- NoDesk: https://nodesk.co/remote-jobs/index.xml
- Berlin Startup Jobs: https://berlinstartupjobs.com/feed/
- Reed: https://www.reed.co.uk/developers/jobseeker
- Careerjet: https://search.api.careerjet.net/v4/query
- The Muse: https://www.themuse.com/developers/api/v2
- Remote Rocketship: https://www.remoterocketship.com/api-docs
- Himalayas: https://himalayas.app/jobs/api
- JustJoin.it sitemap: https://justjoin.it/sitemaps/active-jobs.xml
- ATS: api.ashbyhq.com, boards-api.greenhouse.io, api.lever.co, apply.workable.com, api.smartrecruiters.com, *.jobs.personio.de/xml, *.recruitee.com/api/offers/, *.teamtailor.com/jobs.rss, nvidia.wd5.myworkdayjobs.com/wday/cxs/..., rhynocare.breezy.hr/json, workwithus.pinpointhq.com/postings.json
- robots.txt files of every board named in section 3 (downloaded today)
- UK sponsor register: https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers
- IND register: https://ind.nl/en/public-register-recognised-sponsors/public-register-regular-labour-and-highly-skilled-migrants
- IND amounts: https://ind.nl/en/required-amounts-income-requirements
- UK Skilled Worker salary: https://www.gov.uk/skilled-worker-visa/your-job
- Ireland CSEP: https://enterprise.gov.ie/en/what-we-do/workplace-and-skills/employment-permits/permit-types/critical-skills-employment-permit/
- Firecrawl: https://www.firecrawl.dev/pricing ; https://docs.firecrawl.dev/features/search ; https://docs.firecrawl.dev/features/llm-extract

Secondary:
- Germany Blue Card 2026: https://gpa.net/blogs/emea-1/germany-eu-blue-card-rules-for-2026-tightened-higher-salaries-expanded-talent-pool ; https://aldaglegal.com/eu-blue-card-germany-2026/
- Chancenkarte funds: https://www.visaflow.app/blog/germany-job-seeker-chancenkarte-finance ; https://www.stampednomad.com/digital-nomad-news/germany-raises-opportunity-card-proof-of-funds-to-1091-per-month
- Poland Blue Card: https://grantthornton.pl/publikacja/nowy-prog-wynagrodzenia-dla-niebieskiej-karty-ue-blue-card-w-2026-roku/
- Estonia: https://news.err.ee/1608437885/minister-proposes-relaxation-of-estonia-s-foreign-worker-hiring-rules ; https://estonianworld.com/business/hiring-of-foreign-employees-simplified-for-more-than-300-estonian-startups/
- Adzuna countries and limits: https://jobspipe.dev/blog/adzuna-api.md ; https://github.com/folathecoder/adzuna-job-search-mcp
- Jooble API: https://jobspipe.dev/blog/jooble-api
- Breezy, Pinpoint, BambooHR endpoints: https://jobspipe.dev/sources/breezy ; https://jobspipe.dev/sources/pinpoint ; https://apify.com/devilscrapes/bamboohr-jobs-scraper
- EURES API existence: https://apify.com/nomad-agent/eures-scraper
- Firecrawl robots behaviour: https://webscraping.ai/faq/firecrawl/how-does-firecrawl-handle-robots-txt-files ; https://knownagents.com/agents/firecrawlagent
