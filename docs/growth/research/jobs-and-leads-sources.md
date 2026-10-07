# Jobs & Client-Leads Sources for Signal Desk

Research date: 2026-10-07. Live probes were run from a Windows machine with curl on that date. "VERIFIED" means I fetched the endpoint and inspected real JSON or XML. "DOCS" means it was confirmed from official docs only. "UNVERIFIED" means it comes from third-party pages or memory and should be checked before relying on it.

Note: this session's shared web-search budget ran out partway through. After that I relied on official doc fetches and live endpoint probes. The few items that could not be confirmed this way are marked UNVERIFIED.

---

## 1. Ranked source table

Score is fit for Signal Desk, a zero-cost tool with an hourly GitHub Actions cron, a personal user, and a focus on AI/LLM engineering roles that are remote, Pakistan-friendly, Gulf or UK.

| # | Source | Tab | Endpoint | Auth | Verified | AI-role density | Remote / PK filter | ToS for personal tool | Verdict |
|---|--------|-----|----------|------|----------|-----------------|--------------------|-----------------------|---------|
| 1 | **Ashby posting API** (per company) | Jobs | `api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true` | none | VERIFIED | Very high (AI labs and AI startups default to Ashby) | `isRemote`, `workplaceType`, `location`, `secondaryLocations` | Public, documented for embedding | **Core** |
| 2 | **Greenhouse Job Board API** | Jobs | `boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true` | none for GET | VERIFIED | High (Anthropic and many others) | `location.name` free text only | Public, "authentication is not required for any GET endpoints" | **Core** |
| 3 | **Lever postings API** | Jobs | `api.lever.co/v0/postings/{site}?mode=json` | none | VERIFIED | Medium (older startups) | `workplaceType`, `categories.location`, `country`, server-side `location=` filter | Docs: "These jobs may be scraped by third parties"; GET not rate-limited | **Core** |
| 4 | **HN "Who is hiring?"** (Algolia) | Jobs | `hn.algolia.com/api/v1/search?tags=comment,story_{id}` | none | VERIFIED | High (Oct 2026 thread: 136 comments match "AI", 32 match "LLM", 132 match "remote") | Text only, so the LLM extracts it | Free public API, about 10k req/h per IP | **Core (monthly)** |
| 5 | **Himalayas API** | Jobs | `himalayas.app/jobs/api/search?q=...&sort=recent` | none | VERIFIED | Medium (2,512 hits for "llm engineer") | `locationRestrictions[]`, `timezoneRestrictions`, `worldwide` param | Free. Must link back and credit Himalayas. Data refreshes daily | **Core** |
| 6 | **Jobicy API** | Jobs | `jobicy.com/api/v2/remote-jobs?count=50&geo=anywhere&industry=engineering&tag=llm` | none | VERIFIED | Medium | `jobGeo` (e.g. "Anywhere", "USA"); `geo=` slugs include `anywhere`, `emea`, `uk`, `uae` | Credit and link back. Poll "must not exceed once per hour". 7-day window. 3-hour delay | **Core** |
| 7 | **YC Work at a Startup** (`ycombinator.com/jobs/role/...`) | Jobs | HTML page with embedded Inertia JSON (`data-page` → `props.jobPostings`) | none | VERIFIED (36 postings on ML page) | High | `location`, `visa`, `remote` text | robots allows `/jobs`; no official API, so treat it as a light scrape at 1 req/day | Good (secondary) |
| 8 | **yc-oss API** (company discovery) | Seeds | `yc-oss.github.io/api/companies/hiring.json`, `/tags/artificial-intelligence.json` | none | VERIFIED (1,495 hiring cos; 336 AI-tagged and hiring) | n/a (discovers ATS slugs) | `regions`, `all_locations` | Unofficial static JSON from YC's public Algolia index | **Core for seeding** |
| 9 | **RemoteOK API** | Jobs | `remoteok.com/api?tag=ai` | none | VERIFIED (100 items) | Low-medium, noisy ("AI trainer", annotators) | `location` (often blank) | Must link back with dofollow and name "Remote OK" | OK |
| 10 | **We Work Remotely RSS** | Jobs | `weworkremotely.com/categories/remote-programming-jobs.rss` (also `/remote-jobs.rss`) | none | VERIFIED | Low-medium | `<region>` tag ("Anywhere in the World", "North America Only") | "Anyone can use the feed"; attribute links back | OK |
| 11 | **Remotive API** | Jobs | `remotive.com/api/remote-jobs?category=software-dev&search=llm` | none | VERIFIED | Low-medium | `candidate_required_location` (one sample explicitly listed **Pakistan**) | Jobs are **delayed 24h**. Max ~4 calls/day. Link back. Don't republish | OK (4x/day) |
| 12 | **Freelancer.com API** | Leads | `www.freelancer.com/api/projects/0.1/projects/active/?query=llm&full_description=true&job_details=true` | **none for read** (OAuth for actions) | VERIFIED | Medium, low budgets (INR/USD small gigs) | `location`, `currency`, `local` | Official public API. Rate limits not published (UNVERIFIED) | OK for leads (filter budget ≥ $500) |
| 13 | **HN "Freelancer? Seeking freelancer?"** | Leads | Algolia, story by `jon_north` monthly (Oct 2026 id 49922572) | none | VERIFIED | Low volume (18 top-level comments in Oct) but high quality | text | Free | Good (monthly) |
| 14 | **Reddit r/forhire, r/hiring, r/MachineLearning, r/LocalLLaMA** | Leads | RSS: `reddit.com/r/forhire/search.rss?q=flair:Hiring (AI OR LLM)&restrict_sr=1&sort=new` | RSS none; JSON needs OAuth | VERIFIED: RSS 200, unauthenticated `.json` **403**, a second RSS hit gave **429** | r/forhire has real AI gigs ("$100–$150/hr AI project"), plus junk | text | Data API free for non-commercial use with OAuth at 100 QPM. RSS is fine at low volume | Good, using OAuth "script" app |
| 15 | **Arbeitnow API** | Jobs | `arbeitnow.com/api/job-board-api` | none | VERIFIED (325/page) | Low (mostly German/EU) | `remote` bool, `location` | Free. "Please do not abuse"; link back | Low priority |
| 16 | **Working Nomads** | Jobs | `workingnomads.com/api/exposed_jobs/` | none | VERIFIED (56 items) | Low | `location` ("Japan - Remote") | No documented terms (UNVERIFIED) | Low priority |
| 17 | **Workable** (per account + global search) | Jobs | `apply.workable.com/api/v1/widget/accounts/{slug}` (e.g. `huggingface`); `jobs.workable.com/api/v1/jobs?query=...&location=remote` | none | VERIFIED (both) | Medium (Hugging Face uses Workable) | `telecommuting`, `workplace`, `location` | Widget endpoint is meant for embedding. Global search is **undocumented** | Good per-company; global search is a "maybe" |
| 18 | **SmartRecruiters Posting API** | Jobs | `api.smartrecruiters.com/v1/companies/{id}/postings?q=machine%20learning` | none | VERIFIED (Bosch) | Low for AI startups (mostly enterprise) | `location.remote`, `country` | Public customer Posting API | Optional (Gulf/UK enterprises) |
| 19 | **Recruitee** | Jobs | `{company}.recruitee.com/api/offers/` | none | VERIFIED (bunq, 19 offers) | Low (EU SMBs) | `remote`, `hybrid`, `country_code` | Public careers API | Optional |
| 20 | **Bluesky search** | Leads/Jobs | `api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=...&sort=latest` | none for page 1 (`public.api.bsky.app` → 403) | VERIFIED | Mostly job-bot reposts; some founder posts | text | Open protocol. Cursor pagination needs auth, so paginate with `until=` | Optional, the free stand-in for X |
| 21 | **JSearch (OpenWeb Ninja / RapidAPI)** | Jobs | `/search-v2?query=...&country=ae&date_posted=today` | API key (free signup) | DOCS | High (Google for Jobs covers LinkedIn, Indeed, Bayt and others) | `job_is_remote`, `country` | Free: **200 req/month**, 1,000/h | **Best paid-aggregator option for PK/UAE/UK** (about 6 req/day) |
| 22 | **SerpApi Google Jobs** | Jobs | `serpapi.com/search?engine=google_jobs&q=...&gl=pk` | API key | DOCS | High | `gl` supports **pk, ae, gb, sa** (VERIFIED on SerpApi countries page) | Free: **250 searches/month, 50/h** | Good alternative to JSearch |
| 23 | **Adzuna API** | Jobs | `api.adzuna.com/v1/api/jobs/{cc}/search/1?app_id&app_key` | free key | DOCS | Medium | **UK yes; no PK or AE** (adzuna.ae and adzuna.pk don't resolve; docs/examples list gb, us, de, fr, au, nz, ca, in, pl, br, at, za and others) | Free: 25/min, 250/day, 1,000/week, **2,500/month**. Personal research allowed; publishing requires the "Adzuna" label linking to adzuna.co.uk | UK-only add-on |
| 24 | ai-jobs.net / aijobs.net | Jobs | now 301 → `foorilla.com/hiring/` (HTML; old `/feed/` returns HTML) | — | VERIFIED redirect | High, historically | — | No working feed found | Skip (recheck later) |
| 25 | Hugging Face jobs | Jobs | `huggingface.co/jobs` now redirects to login/settings; HF's own roles are on Workable | — | VERIFIED | — | — | — | Use Workable `huggingface` |
| 26 | Upwork | Leads | RSS **gone** (curl → 410). Official GraphQL API (`marketplaceJobPostingsSearch`) needs an approved API key and OAuth2 | OAuth + approval | VERIFIED 410 | High demand | — | New API/MCP terms §5.2 forbid mixing scraped "Non-Official Content" | Apply for a key, or use email alerts. Never scrape |
| 27 | Wellfound | Jobs | No API. Heavy anti-bot measures | — | robots checked | High | — | ToS bans automated access (UNVERIFIED exact clause) | Skip; set up its email alerts |
| 28 | LinkedIn Jobs | Jobs | Only the guest `jobs-guest/.../seeMoreJobPostings` endpoint | — | not probed | High | — | User Agreement bans scraping (hiQ precedent) | **Skip** (as planned) |
| 29 | Indeed | Jobs | Publisher API retired (~2023). No self-serve read API | — | DOCS (3rd-party) | — | — | — | Skip; reach it via JSearch/SerpApi |
| 30 | X/Twitter | Leads | Pay-per-use since Feb 2026: about $0.005 per post read; free tier closed to new apps | paid | UNVERIFIED (3rd-party) | — | — | — | Skip (not zero-cost) |
| 31 | Rozee.pk, Bayt, GulfTalent, Naukrigulf | Jobs | No public API or RSS found. Only Apify scrapers exist | — | search only | Medium (PK/Gulf) | — | Scraping likely breaches ToS | Skip; reach via Google Jobs (JSearch/SerpApi `gl=pk/ae`) |
| 32 | Contra, Toptal, Arc.dev, Braintrust, Gun.io, Malt, Twine, Indie Hackers | Leads | No public job APIs or RSS found | — | search only | — | — | — | Manual / email alerts only |
| 33 | USAJobs | Jobs | Free API with key | key | not probed | Very low relevance (US citizens) | — | — | Skip |

---

## 2. Per-source notes and verified sample fields

### 2.1 Ashby (top priority for AI roles)
- `GET https://api.ashbyhq.com/posting-api/job-board/openai?includeCompensation=true` returned 200 with **823 jobs** (14 MB with descriptions).
- Job fields: `id, title, department, team, employmentType, location, secondaryLocations, publishedAt, isListed, isRemote, workplaceType, address, jobUrl, applyUrl, descriptionHtml, descriptionPlain, compensation{compensationTierSummary, scrapeableCompensationSalarySummary, compensationTiers[]}`.
- Sample compensation: `"$257K – $335K • Offers Equity"`.
- Probed AI slugs that worked: `openai` (823), `cohere` (130), `perplexity` (130), `elevenlabs` (137), `langchain` (100), `modal` (38), `pinecone` (5).
- No auth and no documented rate limit. Payloads are large, so the description matters. **Tip:** store `descriptionPlain` but truncate it to about 4k chars for LLM scoring. Use `publishedAt` for freshness.
- Third-party scans of 1,127 YC companies found 199 on Ashby, nearly as many as Greenhouse and Lever combined (UNVERIFIED).

### 2.2 Greenhouse
- `GET https://boards-api.greenhouse.io/v1/boards/anthropic/jobs?content=true` returned 200 with `meta.total = 641` (9 MB with content). 126 of 641 titles match an AI/ML regex.
- Fields: `id, internal_job_id, title, absolute_url, location{name}, updated_at, first_published, company_name, requisition_id, language, application_deadline, content (HTML-escaped), departments[], offices[], metadata[], data_compliance`.
- Optional params: `pay_transparency=true` (adds `pay_input_ranges`) and `questions=true`.
- Official docs: "Job Board data is publicly available, so authentication is not required for any GET endpoints."
- **Tip:** call without `content=true` first, which is cheap. Fetch `/jobs/{id}` content only for new IDs whose titles pass the keyword pre-filter.

### 2.3 Lever
- `GET https://api.lever.co/v0/postings/palantir?mode=json&limit=3` returned 200. Note that `mistral` returned `[]`, because Mistral moved off Lever.
- Fields: `id, text (title), categories{commitment, location, team, allLocations[]}, country, workplaceType ("hybrid"/"remote"/"onsite"), createdAt (epoch ms), hostedUrl, applyUrl, descriptionPlain, lists[], additionalPlain, salaryRange?`.
- Server-side filters: `location, commitment, team, department, level`; also `skip`/`limit`.
- Docs: "Published job postings are publicly viewable. These jobs may be scraped by third parties." GET is not rate-limited. Only POST is limited (2/s).

### 2.4 Workable / SmartRecruiters / Recruitee
- Workable widget: `apply.workable.com/api/v1/widget/accounts/huggingface` returns `{name, description, jobs[]}`. Job fields: `title, shortcode, employment_type, telecommuting, department, url, application_url, published_on, created_at, country, city, state, locations[]`. Hugging Face had 6 jobs (e.g. "Open-Source Machine Learning Engineer - EMEA Remote").
- Workable global search, `jobs.workable.com/api/v1/jobs?query=machine learning&location=remote`, works but is **undocumented**. Fields: `id, title, company, created, updated, location(s), workplace, employmentType, url, description`.
- SmartRecruiters: `api.smartrecruiters.com/v1/companies/BoschGroup/postings?q=machine%20learning` returns `{offset, limit, totalFound, content[]}`. Each item has `name, uuid, releasedDate, location{city, country, remote, hybrid, fullLocation}, experienceLevel, typeOfEmployment, company`. A wrong company id returns `totalFound: 0`, not an error.
- Recruitee: `bunq.recruitee.com/api/offers/` returns `offers[]`, each with `title, remote, hybrid, on_site, country_code, city, published_at, updated_at, careers_url, careers_apply_url, description, requirements, salary, tags`.

### 2.5 Getting the list of AI companies' board tokens
1. **yc-oss**: `https://yc-oss.github.io/api/tags/artificial-intelligence.json` (336 hiring, verified) and `/companies/hiring.json` (1,495). Fields include `name, slug, website, batch, isHiring, industries, tags, regions, all_locations, team_size`. It does not give the ATS directly.
2. **ATS auto-detect** in a weekly job: for each company `slug` and website domain stem, try in order `ashby/{slug}`, `greenhouse/{slug}`, `lever/{slug}`, `workable/{slug}`. Keep the first non-empty response and cache it in a `companies` table with `ats` and `board_token`. Alternatively, fetch the company's `/careers` page once and regex for `jobs.ashbyhq.com/([\w-]+)`, `boards.greenhouse.io/([\w-]+)`, `job-boards.greenhouse.io/([\w-]+)`, `jobs.lever.co/([\w-]+)`, `apply.workable.com/([\w-]+)`.
3. **Hand-curated seed list.** Seed these, then confirm each slug with one GET:
   - Ashby: openai, cohere, perplexity, elevenlabs, langchain, modal, pinecone, and more.
   - Greenhouse: anthropic and others.
   - Workable: huggingface.
   - Also include the AI startups his LinkedIn feed already surfaces.
4. **Simplify's open GitHub data**: `raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/.github/scripts/listings.json` returns 19,681 entries with `company_name, title, url, locations, date_posted, date_updated, active, category, sponsorship, source` (VERIFIED). It targets new grads in the US, so it is mainly useful as a **source of ATS URLs and slugs**, not as a feed for him.

### 2.6 Hacker News (Algolia)
- Find threads with `GET hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&hitsPerPage=3`. Verified for Oct 2026: "Who is hiring?" id **49922569** (337 comments) and "Who wants to be hired?" id 49922568. The "Freelancer? Seeking freelancer?" thread is posted by `jon_north` (id **49922572**) and was found with `query="Freelancer? Seeking freelancer"&tags=story`.
- Comments: `search_by_date?tags=comment,story_49922569&hitsPerPage=1000` (filter `parent_id == story_id` for top-level comments). Fields: `objectID, author, created_at, comment_text (HTML), story_id, parent_id`. Alternatively, `/api/v1/items/{id}` returns the whole tree (230 top-level children, 411 KB).
- The freelancer thread is small (18 top-level comments in Oct), so check it daily during the first week of each month.
- Limits: about 10,000 requests per hour per IP, and at most 1,000 hits per query.
- The conventional format is `Company | Role | Location | REMOTE | ...`. Extract `company, role, location, remote, url, email` with the LLM.

### 2.7 Remote boards
- **Himalayas**: the browse endpoint returns `{comments, updatedAt, offset, limit(max 20), totalCount: 118,594, nextCursor, jobs[]}`. Job fields: `title, excerpt, companyName, companySlug, companyLogo, employmentType, minSalary, maxSalary, currency, salaryPeriod, seniority, locationRestrictions[], timezoneRestrictions[], categories, parentCategories, description, pubDate (epoch s), expiryDate, applicationLink, guid`. The search endpoint takes `q, country, worldwide, seniority, employmentType, sort=recent, page`. In practice many "llm engineer" hits were US-only, so filter on `locationRestrictions` being empty or containing Pakistan. **Terms:** link back, credit Himalayas, don't push the data to other boards. Data refreshes daily.
- **Jobicy**: fields are `id, url, jobTitle, companyName, companyLogo, jobIndustry[], jobType[], jobGeo, jobLevel, jobExcerpt, jobDescription, pubDate, salaryMin/Max/Currency/Period`. Rules:
  - `tag` must be 3–50 chars, so `tag=ai` returns 400.
  - Data covers a 7-day window with a 3-hour delay.
  - There is a status endpoint, `/api/v2/remote-jobs/status?ids=...`, for detecting closed jobs.
  - "Polling … must not exceed once per hour."
  - Don't present listings as your own.
- **RemoteOK**: `GET remoteok.com/api` returns an array whose first element is a legal notice. Job fields: `slug, id, epoch, date, company, company_logo, position, tags[], description, location, apply_url, salary_min, salary_max, url`. `?tag=ai` mostly returns "AI trainer" and annotation gigs, so it needs LLM filtering. **Terms:** link back with dofollow and name Remote OK.
- **Remotive**: response is `{00-warning, 0-legal-notice, job-count, jobs[]}`. Job fields: `id, url, title, company_name, category, tags, job_type, publication_date, candidate_required_location, salary, description`. **Terms:**
  - Jobs are delayed 24h.
  - Call at most 4 times a day.
  - Link back and credit Remotive.
  - Don't submit the jobs to third-party boards.
  - Don't gate the listings behind email capture.
  
  `category=ai-ml` returned off-topic items, so use `category=software-dev&search=llm` instead (UNVERIFIED slug list). This is fine for a personal tool.
- **We Work Remotely RSS**: `<item>` contains `title ("Company: Role"), region, category, description (HTML), pubDate, link, guid` (`<ttl>60`).
- **Arbeitnow**: `{data[], links{next}, meta{terms}}`. Item fields: `slug, company_name, title, description, remote, url, tags, job_types, location, created_at`.
- **Working Nomads**: array of `url, title, description, company_name, category_name, tags, location, pub_date`.

### 2.8 Aggregators with PK/UAE/UK reach
These are the only ToS-clean way to cover Rozee, Bayt, LinkedIn and Indeed.
- **JSearch** (OpenWeb Ninja, also on RapidAPI): built on Google for Jobs. Free tier is 200 req/month at 1,000/h, no card. Endpoint is `/search-v2` with `country`, `date_posted=today|3days|week`, and `work_from_home`. Fields include `job_apply_link, job_is_remote, job_posted_at, employer_name, job_city, job_country, job_description`. Budget: **6 queries/day**, e.g. "LLM engineer" × {pk, ae, gb} plus "AI engineer remote" × 3.
- **SerpApi Google Jobs**: free tier is 250 searches/month at 50/h. `gl` supports pk, ae, gb and sa (verified on the countries page). Fields: `jobs_results[].{title, company_name, location, via, description, apply_options[{title, link}], detected_extensions{posted_at, schedule_type, salary}, job_id}`. Paginate with `next_page_token` at 10 results per page.
- **Adzuna**: free key. Limits are 25/min, 250/day, 1,000/week, 2,500/month. Covers **UK (gb) but not Pakistan or UAE**. Personal research is a permitted use; if you display listings, label them "Adzuna" with a link. Fields: `id, title, description (snippet), created, redirect_url, company.display_name, location.display_name/area[], salary_min/max, salary_is_predicted, contract_type, category`.

### 2.9 Client/lead sources
- **Reddit**:
  - Unauthenticated `.json` returns **403** and repeated RSS calls return **429**.
  - Recommended route is a free OAuth "script" app (non-commercial, 100 QPM), then `GET oauth.reddit.com/r/forhire/search?q=flair:Hiring AI&restrict_sr=1&sort=new`.
  - Subreddits: r/forhire (flair `Hiring`), r/hiring, r/jobbit, r/MachineLearning (flair `Jobs` returned 0 items), r/LocalLLaMA, r/SaaS, r/startups, r/Entrepreneur (look for "looking for a dev/AI engineer" posts).
  - A verified r/forhire sample: "[Hiring] Having a hard time finding the right engineer for an AI project — remote US/Canada, $100–$150/hr".
  - Fallback: RSS once per hour per subreddit with a descriptive User-Agent.
- **Freelancer.com**: `projects/active` works **without auth**. Fields: `id, title, preview_description, description, budget{minimum, maximum}, currency{code}, type (fixed/hourly), jobs[]{name} (skills), time_submitted, seo_url (→ freelancer.com/projects/{seo_url}), bid_stats, location, upgrades, urgent`. Volume is high but budgets are small; filter by currency-normalized budget.
- **Upwork**: RSS ended on 2024-08-20 (curl now returns 410). The official GraphQL API has `marketplaceJobPostingsSearch`, scope "Read marketplace Job Postings", and requires an approved developer key (UNVERIFIED how easy approval is for individuals). Saved-search email alerts are the zero-risk path. Don't use third-party "Upwork RSS" bridges, because they are scrapers.
- **HN freelancer thread**, plus HN "Who wants to be hired" (people, not leads, so skip it).
- **Bluesky**: `api.bsky.app/xrpc/app.bsky.feed.searchPosts?q="looking for" "AI engineer"&sort=latest` returns `posts[].{uri, author.handle, record.text, indexedAt}` with no auth on page 1. Most results are job-bot posts (topgenaijobs, tryremote), so the LLM must separate human "founder looking for" posts from bots.
- **Contra, Toptal, Arc, Braintrust, Gun.io, Malt, Twine, Indie Hackers**: no public feeds. These are vetted marketplaces where you apply inside the platform; use their own email alerts.
- **X**: pay-per-use (UNVERIFIED pricing). Skip it.
- **"Leads from jobs" trick**: a Greenhouse, Ashby or Lever posting with `employmentType=Contract` or `commitment=Contract` (or "contract"/"freelance" in the title) is a lead. Also, small seed-stage AI startups from yc-oss with `team_size < 15` that are hiring "founding AI engineer" are warm contract prospects.

---

## 3. How competitors do it (and what to copy)
- **Hiring Cafe**: scrapes career pages of 30k+ companies directly from the ATS about 3 times a day. Uses GPT-4o-mini to extract salary, remote status, seniority and responsibilities into JSON. Bans recruiting agencies and offshore consultancies. Has an "easy vs lengthy apply" filter (Workday, iCIMS and Taleo count as lengthy). **Copy:** ATS-direct sourcing, LLM-structured fields, and an agency filter.
- **Jobright.ai**: aggregates 400k+ jobs per day from boards and company sites. Filters stale and suspicious listings. Scores a resume against each job description on skills, seniority, industry and preferences, and explains the match ("Orion" copilot). Reviewers find the score right about 70–80% of the time and report hallucinated resume edits. **Copy:** an explained match score. **Avoid:** auto-editing the resume.
- **Simplify**: scrapes company career pages directly; its Copilot extension autofills ATS forms and shows missing keywords. It publishes open GitHub listings JSON.
- **Teal**: a job tracker (CRM) with bookmarking from 50+ boards and keyword breakdowns. **Copy:** the status pipeline (new → saved → applied → interview).
- **Otta (Welcome to the Jungle)**: curated startup roles, standardized "fluff-free" descriptions, salary and company insights, and preference-based recommendations.
- **The common thread:** links straight to the ATS apply URL, freshness measured in hours, LLM-normalized fields, aggressive dedup, and a single relevance score with reasons.

---

## 4. Recommended design for Signal Desk

### 4.1 Starter set (all free, all ToS-clean)
**Jobs tab (hourly cron, with per-source throttles):**
1. Ashby + Greenhouse + Lever + Workable for about 50–150 seeded AI companies. Run every 6h, spreading companies across hourly runs (about 20 GETs per run). Pre-filter titles with a regex before calling the LLM.
2. HN "Who is hiring?". Discover the thread on the 1st of the month, then re-poll new comments daily for 10 days.
3. Himalayas search (`q=llm`, `q=ai engineer`, `q=machine learning`, `sort=recent`), once a day.
4. Jobicy (`industry=engineering` and `data-science`, `geo=anywhere`, plus `tag=llm`), every 6h (well under the 1/h cap).
5. WWR programming RSS + RemoteOK API, every 6h. Remotive 2–4 times a day.
6. JSearch free tier: 6 queries/day covering PK, AE and UK (e.g. `"AI engineer" in Karachi`, `"LLM engineer" in Dubai`, `"AI engineer" in London`, `"generative AI engineer" remote`). Keep SerpApi as a backup with its own 250/month.
7. Optional extras: Adzuna `gb` (UK) daily, and YC WaaS ML page daily.

**Leads tab:**
1. Reddit via a free OAuth script app: r/forhire, r/hiring, r/LocalLLaMA, r/SaaS, r/startups, keyword searches ("AI engineer", "LLM", "RAG", "agent", "chatbot"), hourly.
2. HN "Freelancer? Seeking freelancer?" thread, daily during week 1 of the month.
3. Freelancer.com `projects/active` with `query` in {llm, rag, langchain, ai agent, chatbot, openai} and `full_description`, hourly, budget-filtered.
4. Contract-type ATS postings from the Jobs pipeline, cross-posted into Leads.
5. Bluesky search, hourly (optional, with bot filtering).
6. Upwork, Wellfound, Contra and Arc: their own email alerts only. Optionally, parse a forwarded Gmail label later.

### 4.2 Normalized schema (Supabase)
`jobs(id uuid, source, source_id, ats, company, company_domain, title, title_norm, location_raw, countries[], remote_scope enum(worldwide|region|country|onsite|unknown), pk_eligible bool, employment_type, is_contract bool, salary_min, salary_max, currency, url_apply, url_source, posted_at, first_seen_at, last_seen_at, closed_at, description_md, embedding vector(768), match_score int, match_reasons jsonb, status enum(new|saved|applied|hidden), dedup_key)`, with `unique(source, source_id)`.
Leads use the same shape plus `budget`, `contact_handle` and `lead_kind (gig|founder_post|contract_role)`.

### 4.3 Dedup strategy
1. **Exact**: `unique(source, source_id)`, used for upserts. Update `last_seen_at` on each sighting.
2. **Canonical URL**: strip query params and tracking. Map ATS URLs to `(ats, board, job_id)`. For example, a Himalayas or Jobicy listing that links to `jobs.ashbyhq.com/x/uuid` merges into the Ashby record. Prefer ATS-direct as the canonical record.
3. **Fuzzy**: `dedup_key = sha1(norm(company) + '|' + norm(title) + '|' + remote_scope)`, where norm lowercases, strips seniority noise, punctuation and "remote". Treat a match within 30 days as a duplicate.
4. **Semantic fallback**: pgvector cosine > 0.95 on the description embedding within the same company gives a duplicate cluster. Keep the earliest `posted_at` and the most direct URL.

### 4.4 LLM match scoring (DeepSeek, cheap)
- Step 1, free pre-filter. Title regex `(ai|ml|machine learning|llm|genai|generative|applied (ai|scientist)|rag|agent|nlp|forward deployed|full[- ]?stack)` plus a location gate that drops "US only", "must be authorized in US" and similar unless the job is a contract.
- Step 2, embedding similarity between the job and a stored profile embedding (Bilal's resume and skills), using pgvector. Send only the top-N (e.g. sim > 0.55) to the LLM.
- Step 3, LLM JSON scoring against a fixed rubric, with `temperature 0`:
  ```json
  {"score":0-100,"remote_eligible_from_pk":"yes|no|unclear","seniority_fit":"under|fit|over",
   "stack_overlap":["RAG","LangGraph","pgvector","FastAPI","Next.js"],"gaps":["..."],
   "red_flags":["agency","AI-trainer/annotation","unpaid trial","US-only"],
   "one_line_why":"..."}
  ```
  Weights: stack overlap 35, remote eligibility from PK/UAE/UK 25, seniority fit 15, product-AI vs. data-labelling 15, comp signal 10. Hard-cap the score at 30 if `remote_eligible_from_pk == "no"` and the role isn't UAE/UK.
- Leads get the same prompt with a different rubric: budget ≥ $1k or ≥ $40/h, scope matches AI-agent/RAG/full-stack work, the client is a real person or founder (not a bot), and contactability.
- Cache by `dedup_key`, so the LLM never re-scores a duplicate.

### 4.5 Freshness rules
- Show only items with `posted_at` within 14 days for jobs and 7 days for leads. Badges: "new < 24h", "fresh < 72h".
- Use the source's own timestamps: Ashby `publishedAt`, Greenhouse `first_published`, Lever `createdAt`, Himalayas `pubDate`, Jobicy `pubDate`, Remotive `publication_date` (+24h delay), and HN comment `created_at`. If none exist, use `first_seen_at`.
- **Closure detection**: an ATS job that is missing from its board on 2 consecutive pulls gets `closed_at = now`. For Jobicy, use `/remote-jobs/status?ids=`. Hide closed jobs.
- **Evergreen penalty**: Greenhouse `first_published` older than 60 days with fresh `updated_at` signals a perpetual req, so down-rank it 15 points (the Anthropic sample was first published 2024-12 and updated 2026-08).

### 4.6 Alerts
- Instant alert when `match_score ≥ 80` (jobs) or lead score ≥ 75. Reuse the existing alerts channel in Signal Desk (the recent commit "instant alerts"). The cheapest options are a Telegram bot (free) or a Resend/Gmail SMTP email from the GitHub Action.
- A daily digest at 9am PKT with the top 10 jobs and top 5 leads, each with a one-line "why", an apply link, and the attribution link.
- The monthly HN thread gets a special digest on the 2nd.

### 4.7 Compliance checklist
- Every card shows "via Himalayas / Jobicy / Remote OK / Remotive / WWR / Adzuna" with a link to the source listing (required by those terms).
- Respect the polling caps: Remotive ≤ 4/day, Jobicy ≤ 1/h, Himalayas about daily, Reddit with OAuth and a UA string.
- Don't republish to other boards, and keep the tool private, behind auth. This also satisfies the Remotive and Himalayas "no third-party board" clauses.
- Never scrape LinkedIn, Wellfound, Upwork, Rozee or Bayt.

---

## 5. Unverified / open items
- JSearch free-tier figure (200/month) comes from the OpenWeb Ninja page. The RapidAPI listing could differ.
- Adzuna's exact country enum was not retrieved. PK and AE are absent based on missing local domains and docs examples.
- Freelancer.com API rate limits and terms were not retrieved.
- How hard it is for an individual to get Upwork GraphQL API approval.
- The X pay-per-use price is from third-party blogs.
- Remotive category slugs (`ai-ml` returned off-topic items).
- Whether foorilla (ex ai-jobs.net) has a new feed URL.
- Wellfound's exact ToS clause.

---

## Sources
- Greenhouse Job Board API: https://docs.greenhouse.io/job-board.html
- Lever Postings API: https://github.com/lever/postings-api
- Ashby Posting API: https://developers.ashbyhq.com/docs/public-job-posting-api
- Himalayas API: https://himalayas.app/api
- Jobicy API docs: https://github.com/Jobicy/remote-jobs-api , https://jobicy.com/jobs-rss-feed.md
- Remotive API (legal notice in response): https://remotive.com/api/remote-jobs , https://remotive.com/api-documentation
- Remote OK API (legal notice in response): https://remoteok.com/api
- We Work Remotely RSS: https://weworkremotely.com/remote-job-rss-feed
- Arbeitnow API: https://www.arbeitnow.com/api/job-board-api
- Working Nomads: https://www.workingnomads.com/api/exposed_jobs/
- HN Search API (Algolia): https://hn.algolia.com/api ; HN Firebase user feed: https://hacker-news.firebaseio.com/v0/user/whoishiring.json
- yc-oss API: https://yc-oss.github.io/api/ ; YC jobs: https://www.ycombinator.com/jobs/role/software-engineer/machine-learning
- Simplify listings: https://github.com/SimplifyJobs/New-Grad-Positions
- Workable HF board: https://apply.workable.com/huggingface/ ; https://jobs.workable.com/
- SmartRecruiters Posting API: https://developers.smartrecruiters.com/customer-api/posting-api/endpoints/postings/
- Adzuna API: https://developer.adzuna.com/overview , https://developer.adzuna.com/docs/search , https://developer.adzuna.com/docs/terms_of_service
- JSearch: https://www.openwebninja.com/api/jsearch ; https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch ; https://jobspipe.dev/answers/is-jsearch-api-free
- SerpApi: https://serpapi.com/google-jobs-api , https://serpapi.com/google-jobs-countries , https://serpapi.com/pricing
- Upwork RSS deprecation: https://support.upwork.com/hc/en-us/articles/52052528243731-RSS-deprecation ; https://snipework.com/blog/upwork-rss-feed-2026 ; https://uphunt.io/blog/upwork-job-scraper-2026 ; Upwork GraphQL SDK: https://www.nuget.org/packages/Upwork/
- Freelancer.com API: https://developers.freelancer.com/ ; https://publicapis.io/freelancer-api
- Reddit Data API limits: https://www.reddit.com/wiki/api ; https://www.socialcrawl.dev/blog/reddit-api-key-limits-alternatives-2026
- X API pricing: https://opentweet.io/answers/is-the-x-api-free-in-2026 ; https://zernio.com/blog/twitter-api-pricing
- Bluesky search behaviour: https://github.com/bluesky-social/bsky-docs/issues/332
- LinkedIn scraping: https://jobspipe.dev/answers/can-i-scrape-linkedin-jobs ; https://conductatlas.com/platform/linkedin/linkedin-user-agreement/prohibition-on-scraping-and-automated-data-collection/
- Indeed API status: https://jobspipe.dev/blog/indeed-publisher-api
- Rozee / Bayt (no public API, only scrapers): https://apify.com/memo23/rozee-scraper ; https://apify.com/parseforge/bayt-scraper
- Wellfound robots: https://wellfound.com/robots.txt
- Hiring Cafe approach: https://apify.com/blackfalcondata/hiringcafe-scraper ; Jobright: https://jobright.ai/ai-job-match , https://scoutify.com/blog/jobright-review
- Simplify: https://simplify.jobs/ ; Teal: https://careerkarma.com/blog/what-is-teal-job-search-tracker-how-does-it-work/ ; Otta: https://www.capterra.co.uk/software/1036497/otta
- ai-jobs.net (foorilla): https://alternativeto.net/software/ai-jobs-net/about
- Ashby adoption among YC: https://apify.com/quietloop-labs/ashby-greenhouse-lever-job-scraper
