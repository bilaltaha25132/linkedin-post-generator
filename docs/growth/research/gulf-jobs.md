# F. Gulf job sources for AI / LLM / full-stack AI roles (Saudi Arabia first)

Research date: 2026-10-07. Prepared for Signal Desk (Next.js 16 on Vercel Hobby, 60 s function limit, Supabase, GitHub Actions cron on a public repo, Firecrawl free/low tier).

Labels:
- [V] verified today at the primary source (I fetched the URL / endpoint myself and saw the result).
- [S] secondary source (news site, guide, search snippet, another vendor's docs).
- [U] unverified (my best understanding, could not confirm today).

Method: plain HTTP fetches (curl with a normal browser User-Agent, one request per URL, no retries through challenges), WebFetch, and web search. No accounts, no logins, no CAPTCHA solving, no attempts to get past Cloudflare/Imperva/Akamai challenges. Some hosts (naukrigulf.com, careers.aramco.com, taqat.sa, zerotaxjobs.com, gulftechjobs.com, akhtaboot.com via curl) either timed out, reset the connection, or failed DNS from this network today; that is noted per row and does not mean the site is down for a normal user.

---

## 1. Bottom line (what to build)

1. **Highest-value, zero-risk sources are employer ATS JSON endpoints.** I verified working public endpoints today for Careem, Tamara, Hala (Greenhouse), Lean Technologies, Sarj.ai, Ziina, Thndr (Ashby), Salla, Foodics, Lucidya, Mozn (Workable), Unifonic, Sahl (Recruitee), Tabby (Pinpoint), Delivery Hero / HungerStation / talabat, Jisr (SmartRecruiters), AI71 (Greenhouse), MBZUAI Institute of Foundation Models (Lever), NEOM (Eightfold), Aramco Digital and Presight (Oracle Recruiting Cloud REST), TII, G42 / Inception42 / AIQ / CPX (Phenom, JSON embedded in HTML), Core42 and stc (SuccessFactors RSS). These are small, fast GET calls that fit easily inside a 60 s Vercel function or a GitHub Actions job, and they are the same data the companies publish for the public.
2. **Best open job board for Saudi: Sabbar (sabbar.com).** robots.txt is `Allow: /`, it publishes a daily job-details sitemap (16,473 URLs today, lastmod 2026-10-06) and every job page carries schema.org `JobPosting` JSON-LD [V]. Diff the sitemap, fetch only new URLs, parse JSON-LD. No Firecrawl credits needed.
3. **Bayt (the biggest Gulf board) search pages are server-rendered and fetchable** at `https://www.bayt.com/en/saudi-arabia/jobs/<keyword>-jobs/` with an `ItemList` JSON-LD of 30 job URLs [V], and robots.txt does not block that country-scoped path. But Bayt's job detail pages returned a Cloudflare challenge to a plain fetch [V], and robots.txt disallows the sort/filter variants (`*options[`, `*filters[`). Recommendation: Firecrawl the country search page once or twice a day (allowed path), store title/company/URL from the card text, and let the user open the job page; plus Bayt email alerts into Gmail.
4. **Indeed, Glassdoor, LinkedIn, GulfTalent, Naukrigulf, Wuzzuf, Dubizzle, Jadarat, Qiwa: do not scrape.** Either ToS explicitly forbid it (Indeed, LinkedIn, Glassdoor), robots.txt disallows it (LinkedIn `User-agent: * Disallow: /`), or the site sits behind an active bot challenge (Cloudflare on Indeed/Glassdoor/GulfTalent/Wuzzuf/Jadarat, Imperva on Dubizzle, Akamai-style resets on Naukrigulf, F5 "Request Rejected" on Qiwa). Use their **email alerts parsed from Gmail**, or **Google for Jobs via SerpApi** (supports `gl=sa`, `ae`, `qa`, `kw`, `bh`, `om`, `pk` [V]; free plan 250 searches/month [V]), or link-only.
5. **Saudi reality check for a Pakistani expat:** Saudization is a percentage quota per establishment, not a ban, and senior AI/LLM roles are still widely open to expats. But many Saudi listings are tagged "Saudis only", "Tamheer" or "Co-op" and must be filtered out automatically. IT professions (programmer, software development specialist, computer/network engineer and others, 30+ titles) are subject to localization quotas [S], engineering titles are at 30% since the end of 2025 [V via HRSD page], and work permits are now classified high-skill / skilled / basic on a points system since July/August 2025 [S]. Pakistani nationals face no Saudi ban; degree verification (Professional Verification / Mousadaqa) and attestation are the practical hurdles [S].

---

## 2. Job boards and aggregators

Legend for "Machine access": API = official public API; RSS; JSON = unofficial JSON endpoint; LD = JSON-LD `JobPosting` on detail pages; SM = sitemap with job URLs; Alerts = email alerts.

### 2.1 Summary table

| # | Platform | Coverage | Machine access (verified today) | Bot protection / ToS | Recommended integration |
|---|---|---|---|---|---|
| 1 | **Bayt** (bayt.com) | All GCC + MENA; largest Gulf board. Search "ai engineer" in KSA returned a full first page of 30 results [V] | Search page HTML server-rendered, `ItemList` JSON-LD with 30 job URLs [V]. Detail pages: Cloudflare challenge (HTTP 403 "Just a moment...") to plain fetch [V]. Sitemap: Cloudflare challenge [V]. Alerts: yes, but need an account (the alert link goes to `/en/login/?returnUrl=...`) [V] | robots.txt allows `/en/saudi-arabia/jobs/...`; disallows `/en/jobs/?`, `/en/jobs/*-jobs/`, `*filters[`, `*options[` and fully blocks `LinkedInBot`, `IndeedBot`, `008` [V]. ToS page blocked by Cloudflare, not read [U] | Firecrawl scrape of the allowed country search page (1-2 times/day), plus Bayt alert emails via Gmail |
| 2 | **GulfTalent** (gulftalent.com) | All GCC; strong for mid/senior professional roles; many AI/LLM roles in Riyadh found via search [S] | Homepage 200, then Cloudflare challenge on category/search pages after the first request [V]. Sitemap behind challenge [V] | robots.txt: `User-agent: * Content-Signal: search=yes,ai-train=no,use=reference Allow: /`, explicitly blocks ClaudeBot, GPTBot, CCBot and others; allows ChatGPT-User, PerplexityBot [V]. Terms page 403 [U] | Email alerts (needs account) via Gmail; link-only search URL. Firecrawl allowed by robots for `*` but expect challenges |
| 3 | **Naukrigulf** (naukrigulf.com) | All GCC, heavy South Asian candidate base, many IT roles | Connection reset / timeout from this network for robots.txt and search page; WebFetch also timed out [V that it is unreachable to bots today] | Strong anti-bot (Akamai-type behavior) [U]. Third-party scrapers on Apify say a "public-facing search API" exists [S] | Email alerts via Gmail; link-only |
| 4 | **Indeed Saudi / UAE** (sa.indeed.com, ae.indeed.com) | Large aggregator; KSA, UAE, also qa/kw/bh/om subdomains [U] | Search returned HTTP 403 Cloudflare to plain fetch [V]. RSS: robots has `Disallow: /*?rss` and the old RSS/Publisher API is retired [V for robots line; S for retirement] | ToS: "You may not crawl, scrape, extract data from, reproduce, duplicate, copy... any part of the Site" and "Use any automated system (bots, scrapers, spiders, AI or Agentic AI) to access, data-mine... without Indeed's express written permission (we conditionally grant permission to crawl the Site solely as outlined in our robots.txt file)" [V] | Indeed job alert emails via Gmail; Google for Jobs (SerpApi) picks up many Indeed listings; link-only |
| 5 | **Glassdoor** | Thin Gulf coverage | Search URL 403 Cloudflare [V] | robots disallows `/search/`, `/rss/*`, `/jobview/`, `/partners/jobs/` [V]. ToS forbids scraping [S] | Link-only (salary research by hand) |
| 6 | **LinkedIn Jobs** | The dominant channel for Saudi/UAE tech employers (Humain, SDAIA, Elm post mainly here) [S] | Guest search page returned 200 with 80 job cards to a plain fetch [V], but see ToS | robots.txt: `User-agent: * Disallow: /` and "The use of robots or other automated means to access LinkedIn without the express permission of LinkedIn is strictly prohibited." [V] | LinkedIn job alert emails via Gmail (daily, "Saudi Arabia" + keyword). Never scrape |
| 7 | **Sabbar** (sabbar.com) | Saudi Arabia (Arabic + English); lists Humain, Elm and many Saudi firms | robots: `User-Agent: * Allow: /` [V]. Sitemaps: `https://sabbar.com/en/jobs/sitemaps/job-details.xml` (16,473 `<loc>` entries, lastmod 2026-10-06) and `/ar/` twin [V]. Detail pages have `JobPosting` JSON-LD with `title`, `datePosted`, `validThrough`, `employmentType`, `addressLocality` [V]. Expired jobs return HTTP 410 [V] | No challenge seen [V] | **Direct fetch (no Firecrawl):** daily sitemap diff, fetch new URLs, parse JSON-LD, drop "Saudis only" |
| 8 | **Qureos** (qureos.com / app.qureos.com) | KSA, UAE, Qatar, Kuwait, Bahrain, Oman | Search pages `https://app.qureos.com/jobs/search/<slug>-jobs-in-saudi-arabia` return 200 but jobs render client-side (only 1 job link in raw HTML) [V]. Detail pages `/jobs/<slug>-<id>` carry `JobPosting` JSON-LD (`datePosted`, `addressCountry: SA`) [V]. Sitemap URLs in robots.txt (e.g. `/sitemap-jobs-v2/1.xml`) returned 404 today [V] | robots: `Disallow: /*?` (any query string), `Allow: /` [V] | Firecrawl scrape of the path-style search page (no query string) |
| 9 | **Drjobpro** (drjobpro.com, drjobs.ae) | Global aggregator with heavy GCC share; "6.3k jobs found" for AI engineer globally, includes Riyadh roles [V via WebFetch] | Search template: `https://www.drjobpro.com/search-jobs?keyword={term}` (from its own SearchAction markup) [V]. Detail: `/<country>/jobs/<title>-<city>-<company>-<ID>` [V]. Sitemap: `https://www.drjobpro.com/sitemap.xml` listed [V]. Rate-limited my second batch of requests (timeouts) [V] | robots: `User-agent: * Allow: /`, explicitly allows GPTBot, ClaudeBot, PerplexityBot; only blocks `?utm_` and `?refineParams=` [V] | Firecrawl scrape of search page, low frequency (aggregator, so dedupe against ATS sources) |
| 10 | **Mihnati** (mihnati.com) | Saudi Arabia; run by Rozee.pk (robots.txt points to rozee.pk sitemap) [V] | Homepage server-rendered with job links like `/<company>-<title>-<city>-jobs-<id>` and channels `/channel/engineering-jobs-in-saudi-arabia` [V]. Mostly blue-collar/admin roles on the homepage [V] | robots allows most paths; disallows `/ar/`, `/hiring/`, `/people/` [V] | Low priority; link-only or occasional Firecrawl |
| 11 | **Tanqeeb** (tanqeeb.com, saudi.tanqeeb.com) | Arab-world aggregator, country subdomains | Search URL returned 403 (520-byte block) and WebFetch 403; subdomain later unreachable [V] | robots: `Disallow: /*?keywords`, `/*?countries`, `/*?job_id` [V], so keyword search is disallowed | Skip (aggregator of others, keyword search disallowed) |
| 12 | **Wuzzuf** (wuzzuf.net) | Egypt mainly; some Gulf-based and remote roles | Search 403 Cloudflare [V] | robots: `Content-Signal: search=yes,ai-train=no,use=reference`, blocks ClaudeBot, GPTBot, CloudflareBrowserRenderingCrawler [V] | Skip, or link-only |
| 13 | **Akhtaboot** (akhtaboot.com) | Jordan-centric; today only 2 Saudi and 1 UAE listings [V via WebFetch] | URL pattern `/en/<country>/jobs`, `/en/<country>/jobs/<city>` [V] | DNS failed via curl, WebFetch worked [V] | Skip (too small) |
| 14 | **Laimoon** (laimoon.com) | Formerly a GCC jobs + courses site | `/saudi-arabia/ai-engineer-jobs` redirects to `courses.laimoon.com` (404); homepage only shows courses; robots sitemap is courses-only [V] | n/a | Skip; jobs section appears retired [V] |
| 15 | **Dubizzle Jobs** (dubai.dubizzle.com/jobs/) | UAE classifieds, mostly non-tech | "Pardon Our Interruption" Imperva block page [V] | robots blocks `/api/`, `/sitemap-*`, `/email_alerts/` among others [V] | Skip |
| 16 | **foundit Gulf** (founditgulf.com, ex Monster Gulf; monstergulf.com robots now points here) | GCC | First `srp/results` request returned 200; later `/search/...` pages 403 [V] | monstergulf robots: for GPTBot/ClaudeBot/CCBot/Google-Extended etc. `Disallow: /jobs/` and `Disallow: /search/` [V]. foundit.ae did not resolve [V] | Email alerts or link-only |
| 17 | **Michael Page Middle East** (michaelpage.ae, covers UAE + KSA) | Recruiter; strong for senior tech/AI. `/jobs/ai` showed AI Engineer, AI Scientist, Applied AI Engineer VP, Head of Agentic AI, Head of Data & AI [V] | Server-rendered HTML. Templates: `https://www.michaelpage.ae/jobs/ai`, `/jobs/information-technology`, `/jobs/saudi-arabia/information-technology`; detail `/job-detail/<slug>/ref/jn-MMYYYY-NNNNNNN` [V]. No JSON-LD seen on listing pages [V] | robots disallows `/search/`, `/job-apply/`, salary filter params and `*/jobs/*/*/*/` (deep facets) [V]. michaelpage.com.sa did not respond [V] | **Direct fetch or Firecrawl** of `/jobs/ai` and `/jobs/saudi-arabia/information-technology` daily |
| 18 | **Hays Middle East** (hays.ae) | UAE + KSA | Pages render via internal API `api.hays.com/jobportalapi/int/s/ae/en/jobportal/job/browse/v1/jobsweb<base64 query>` (internal, token-based) [V] | robots allows `/job-search/<sector>-jobs-in-saudi-arabia` style pages, disallows `/it/search?` [V] | Firecrawl scrape of `https://www.hays.ae/job-search/it-jobs` (allowed path); do not call the internal API |
| 19 | **Robert Half UAE** (roberthalf.ae) | UAE; finance/IT | Uses an internal POST search API `https://prd-dr.jps.api.roberthalfonline.com/search` [V seen in page config]. `/robots.txt` returns the homepage, i.e. no robots file [V] | Unclear | Link-only / Firecrawl of search page, low priority |
| 20 | **Cooper Fitch** (cooperfitch.ae) | UAE/KSA executive search | `/jobs` redirects to homepage [V] | robots: `Crawl-delay: 10`, `Disallow: /search/` [V] | Link-only |
| 21 | **Jadarat** (jadarat.sa) | Saudi unified national employment platform (replaced Taqat and Jadara) [S]; 70,000+ openings at launch [S] | `jadarat.sa` and its robots.txt return "Attention Required! Cloudflare" block [V] | Job seeker accounts require a Saudi national ID per press coverage [S] | Not relevant for a Pakistani expat; skip |
| 22 | **Taqat** (taqat.sa) | Legacy Saudi labor portal, merged into Jadarat [S] | Connection timeout [V] | n/a | Skip |
| 23 | **Qiwa** (qiwa.sa) | Saudi MHRSD labor platform: contracts, transfers, work permits, not a job board | robots.txt request: "Request Rejected" (F5 WAF) [V] | n/a | Not a source; relevant only after an offer (contract authentication) |
| 24 | **ZeroTaxJobs** (zerotaxjobs.com) | Gulf tech jobs + salaries by company (has AI engineer salary pages for Mozn, Hala, Sarj.ai) [S] | DNS failed from this network [V] | [U] | Check by hand; possibly good for salary research |
| 25 | **Gulf Tech Jobs** (gulftechjobs.com) | GCC tech-only board [S] | DNS failed [V] | [U] | Check by hand |

### 2.2 Search URL templates (for a human or Firecrawl)

All checked today unless marked. Replace `{kw}` with a slug such as `ai-engineer`, `machine-learning-engineer`, `llm-engineer`, `generative-ai-engineer`, `full-stack-developer`.

| Platform | Template | Notes |
|---|---|---|
| Bayt | `https://www.bayt.com/en/saudi-arabia/jobs/{kw}-jobs/` (also `/en/uae/`, `/en/qatar/`, `/en/kuwait/`, `/en/bahrain/`, `/en/oman/`) [V for KSA; other countries U] | Sort by date `?options%5Bsort%5D%5B%5D=d` and posted-in-last-day `?filters%5bjb_last_modification_date_interval%5d%5b%5d=1` exist [V] but are **disallowed in robots.txt**, so use them only manually |
| GulfTalent | Title page `https://www.gulftalent.com/saudi-arabia/jobs/title/{kw}` (exists for e.g. `research-scientist` [S]); job page `https://www.gulftalent.com/saudi-arabia/jobs/{slug}-{id}` [S] | Country index pages: `/saudi-arabia/jobs`, `/jobs/category/software` [V links on homepage] |
| Naukrigulf | `https://www.naukrigulf.com/{kw}-jobs-in-saudi-arabia` [U] | Unreachable to me today |
| Indeed KSA | `https://sa.indeed.com/jobs?q=AI+engineer&l=Riyadh&fromage=1&sort=date` [U for params; S standard Indeed] | Manual only |
| LinkedIn | `https://www.linkedin.com/jobs/search?keywords=AI%20Engineer&location=Saudi%20Arabia&f_TPR=r86400` (last 24h) [V page loads] | Use to set up alerts; never scrape |
| Sabbar | Company: `https://sabbar.com/en/jobs/companies/{company}`; city+role: `https://sabbar.com/en/jobs/c-riyadh-r-{role-slug}`; facets `.../n-saudis-only`, `/en/jobs/k-remote`, `/en/jobs/f-for-fresh-graduates` [V links seen] | Better to use the sitemap than search |
| Qureos | `https://app.qureos.com/jobs/search/{kw}-jobs-in-saudi-arabia`, `.../in-qatar`, `.../in-kuwait` [V] | No query strings (robots) |
| Drjobpro | `https://www.drjobpro.com/search-jobs?keyword={term}` [V] | Country filter by path `/saudi-arabia` [V page exists] |
| Michael Page | `https://www.michaelpage.ae/jobs/ai`, `https://www.michaelpage.ae/jobs/saudi-arabia/information-technology` [V] | |
| Hays | `https://www.hays.ae/job-search/it-jobs`, `https://www.hays.ae/job-search?q=machine%20learning` [V 200] | Query-string search is not disallowed, but prefer the category path |
| Google Jobs (SerpApi) | `https://serpapi.com/search.json?engine=google_jobs&q=AI+engineer&location=Riyadh,Saudi+Arabia&gl=sa&hl=en&api_key=...` [V params documented] | Up to 10 results per page, paginate with `next_page_token` [V] |

---

## 3. Employer career sites and their ATS (verified endpoints)

All endpoints below were called today with plain GET and returned JSON/RSS. Counts are as of 2026-10-07.

### 3.1 Saudi Arabia

| Employer | ATS | Public endpoint (verified) | Today | Notes |
|---|---|---|---|---|
| **NEOM** | Eightfold (careers.neom.com/careers) | `https://careers.neom.com/api/apply/v2/jobs?domain=neom.com&query=AI&start=0&num=10` returns `count` and `positions[]` with `name`, `location`, `t_create` (epoch), `canonicalPositionUrl` [V] | 9 for "AI" [V] (Cloud Engineer, Security & IAM Advisor, Architecture Advisor...) | Workable account "neom" exists but is empty [V] |
| **Aramco Digital** | Oracle Recruiting Cloud (ORC) | `https://fa-exrn-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList&finder=findReqs;siteNumber=CX_3001,limit=25,keyword=AI,sortBy=POSTING_DATES_DESC` [V] | 1 for "AI" (Sr. AI Creative Specialist, Al Khobar, posted 2026-09-27) [V] | Careers page links to the same ORC site [V] |
| **Saudi Aramco** | SAP SuccessFactors (careers.aramco.com, path style `/expat_uk/job/<title>/<id>`) [S] | SuccessFactors RMK sites normally expose `https://careers.aramco.com/services/rss/job/?locale=en_US&keywords=AI` [U, timed out today] | n/a | Expat roles typically want 5-10 years [S] |
| **stc** | SAP SuccessFactors (careers.stc.com.sa) [V] | `https://careers.stc.com.sa/services/rss/job/?locale=en_US&keywords=AI` returns RSS [V] | 0 for "AI" today ("No jobs currently available") [V] | Try keywords `data`, `engineer` |
| **Tabby** | Pinpoint (careers.tabby.ai redirects to tabby.pinpointhq.com) [V] | `https://tabby.pinpointhq.com/postings.json` [V] | 57 jobs (KSA, UAE, Egypt...) e.g. Senior DevOps Engineer, KSA [V] | Workable account "tabby" exists but empty [V] |
| **Tamara** | Greenhouse | `https://boards-api.greenhouse.io/v1/boards/tamara/jobs` [V] | 31 [V] | Several roles flagged "(Emirati National)" or "Saudi National" in title, filter them |
| **Hala** (Saudi fintech) | Greenhouse | `https://boards-api.greenhouse.io/v1/boards/hala/jobs` [V] | 8, Riyadh [V] | |
| **Salla** | Workable | `https://apply.workable.com/api/v1/widget/accounts/salla` [V] | 31 (Jeddah/Makkah) [V] | "Tamheer" = Saudi-only trainee program |
| **Foodics** | Workable | `https://apply.workable.com/api/v1/widget/accounts/foodics` [V] | 27, includes **AI Engineer, Riyadh, published 2026-09-29** [V] | |
| **Lucidya** | Workable | `https://apply.workable.com/api/v1/widget/accounts/lucidya` [V] | 45 (Riyadh, Cairo, New Delhi) [V] | |
| **Mozn** | Workable (account `mozn-ai`, linked from mozn.ai/careers) [V] | `https://apply.workable.com/api/v1/widget/accounts/mozn-ai` [V] | 17, includes **AI Engineer, Riyadh** and AI Infrastructure Engineer III [V] | |
| **Unifonic** | Recruitee | `https://unifonic.recruitee.com/api/offers/` [V] | 33, some "Remote job" [V] | |
| **Sarj.ai** (Saudi AI startup) | Ashby | `https://api.ashbyhq.com/posting-api/job-board/sarjai` [V] | 15, Riyadh, includes Full Stack Software Engineer, Agent Engineering Intern [V] | Very good fit for an LLM/agents profile |
| **Jisr** (Saudi HR SaaS) | SmartRecruiters | `https://api.smartrecruiters.com/v1/companies/jisr/postings` [V] | 6 (Riyadh, Cairo) [V] | |
| **HungerStation / Delivery Hero** | SmartRecruiters (company `deliveryhero`) | `https://api.smartrecruiters.com/v1/companies/deliveryhero/postings?country=sa&q=...` [V] | 980 global; 4 for "machine learning" in SA [V] | `country=ae` returns talabat/Dubai roles incl. Sr. Data Scientist (AI & ML) [V] |
| **Humain** (PIF AI company) | Not found. Careers page (AEM) has no ATS link in static HTML; WebFetch 403 [V] | none | Postings appear on LinkedIn and Sabbar (e.g. "AI Engineer", Riyadh, GCP + sovereign cloud, Arabic NLP) [S] | Use LinkedIn alert "HUMAIN" + Sabbar company page |
| **SDAIA** | Not found; `sdaia.gov.sa/en/Careers/` 404 [V] | none | Graduate programs for Saudi nationals [S] | Mostly Saudi-national hiring [S]; LinkedIn alerts |
| **Elm** | Not found; elm.sa careers URL redirected to Arabic home [V] | none | Co-op and Tamheer programs on Sabbar [S] | LinkedIn + Sabbar |
| **Zid** | Workable account `zid` exists but has 0 jobs [V]; careers page JS-only [V] | [U] | | Check by hand |
| **Lean Technologies** | Ashby (`LeanTech`, linked from leantech.me careers) [V] | `https://api.ashbyhq.com/posting-api/job-board/leantech` [V] | 3 [V] | KSA/UAE open banking |
| **Thiqah, Tahakom, Masterworks, Rasan, Geidea, Tap, Qoyod, Classera** | Workable accounts exist but 0 jobs [V] | n/a | | Probably moved ATS; low priority |

### 3.2 UAE (Abu Dhabi AI cluster and Dubai tech)

| Employer | ATS | Public endpoint (verified) | Today | Notes |
|---|---|---|---|---|
| **G42** (also lists **Inception42**, **AIQ**, **CPX**, G42 Americas) | Phenom (careers.g42.ai) | `https://careers.g42.ai/global/en/search-results?keywords=engineer` HTML embeds `"eagerLoadRefineSearch":{...,"totalHits":N,"data":{"jobs":[...]}}` with `title`, `brand`, `country`, `postedDate`, `jobId` [V] | 38 total; 16 for "engineer" (Principal Software Engineer, Data Engineer, Senior Engineer Frontend...) [V] | Parse JSON out of HTML; 10 per page |
| **Technology Innovation Institute (TII)** | Phenom (careers.tii.ae) [V] | `https://careers.tii.ae/us/en/search-results?keywords=AI%20engineer` with the same embedded JSON [V] | 16 hits: AI Engineer, Senior AI Engineer, VLM Engineer, RL Robotics Engineer... [V] | Skills tags in JSON include langchain, llamaindex, crewai, vllm [V] |
| **Core42** | SAP SuccessFactors (careers.core42.ai) [V] | RSS: `https://careers.core42.ai/services/rss/job/?locale=en_US&keywords=engineer` [V]; HTML search `https://careers.core42.ai/search/?q=AI&sortColumn=referencedate&sortDirection=desc` (2 jobs) [V] | | |
| **Presight** | Oracle Recruiting Cloud (careers.presight.ai redirects to `iaambv.fa.ocs.oraclecloud.com/.../sites/CX_1`) [V] | `https://iaambv.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList&finder=findReqs;siteNumber=CX_1,limit=25,keyword=AI,sortBy=POSTING_DATES_DESC` [V] | 1 for "AI" (Senior Data Engineer, Abu Dhabi, 2026-09-30) [V] | |
| **AI71** | Greenhouse (board `ai71jobs`, embedded on ai71.ai/careers) [V] | `https://boards-api.greenhouse.io/v1/boards/ai71jobs/jobs` [V] | 12, Abu Dhabi (MLOps Engineer, Deployment Strategist...) [V] | |
| **MBZUAI** | WordPress careers site + **Lever** for the Institute of Foundation Models (`ifm-us`) + Interfolio for faculty [V] | `https://api.lever.co/v0/postings/ifm-us?mode=json` [V] | 44 total, 14 in Abu Dhabi [V] | Vacancy pages: `https://careers.mbzuai.ac.ae/engineering-vacancies/`, `/research-vacancies/`, `/institute-of-foundation-models-vacancies/` [V] |
| **Careem** | Greenhouse | `https://boards-api.greenhouse.io/v1/boards/careem/jobs` [V] | 16, Dubai **and Karachi/Lahore** (e.g. Senior Data Scientist II, Dubai) [V] | Good bridge: Pakistan-based roles with a Gulf company |
| **Ziina** | Ashby | `https://api.ashbyhq.com/posting-api/job-board/ziina` [V] | 15 [V] | |
| **Thndr** | Ashby | `https://api.ashbyhq.com/posting-api/job-board/thndr` [V] | 8 [V] | Egypt/UAE |
| **Noon** | Workable account `noon` empty [V]; joinnoon.com unreachable today [V] | [U] | | Careers site reported at joinnoon.com [S] |
| **Inception (inceptionai.ai)** | Site now redirects to inception42.ai [V]; jobs listed under brand "Inception42" on G42 Phenom [V] | via G42 endpoint | | |

### 3.3 ATS endpoint cheat sheet (generic)

| ATS | Endpoint pattern | Verified today on |
|---|---|---|
| Greenhouse | `GET https://boards-api.greenhouse.io/v1/boards/{board}/jobs?content=true` | careem, tamara, hala, ai71jobs |
| Lever | `GET https://api.lever.co/v0/postings/{site}?mode=json` (EU: `api.eu.lever.co`) | ifm-us |
| Ashby | `GET https://api.ashbyhq.com/posting-api/job-board/{board}` | leantech, sarjai, ziina, thndr |
| Workable | `GET https://apply.workable.com/api/v1/widget/accounts/{account}` (404 if account does not exist; `jobs: []` if empty) | salla, foodics, lucidya, mozn-ai |
| SmartRecruiters | `GET https://api.smartrecruiters.com/v1/companies/{id}/postings?country=sa&q=...` | deliveryhero, jisr |
| Recruitee | `GET https://{company}.recruitee.com/api/offers/` | unifonic, sahl |
| Pinpoint | `GET https://{company}.pinpointhq.com/postings.json` | tabby |
| Eightfold | `GET https://{host}/api/apply/v2/jobs?domain={domain}&query=...&start=0&num=10` | careers.neom.com |
| Oracle Recruiting Cloud | `GET https://{pod}.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList&finder=findReqs;siteNumber={CX_n},limit=25,keyword=...,sortBy=POSTING_DATES_DESC` | Aramco Digital (CX_3001), Presight (CX_1) |
| SAP SuccessFactors (RMK) | `GET https://{careers-host}/services/rss/job/?locale=en_US&keywords=...` (RSS 2.0) | careers.core42.ai, careers.stc.com.sa |
| Phenom | `GET https://{host}/{locale}/search-results?keywords=...` then extract `eagerLoadRefineSearch` JSON from HTML | careers.g42.ai, careers.tii.ae |

All of these are lightweight and safe to call from a GitHub Actions cron (public repo is fine, no secrets needed) or a Vercel route. Suggested filter: drop titles containing "Saudi National", "Emirati National", "UAE National", "Tamheer", "Co-op", "Intern", and locations outside GCC/Pakistan/Remote.

---

## 4. Google for Jobs and paid aggregators

| Service | Gulf coverage | Access | Cost | Verdict |
|---|---|---|---|---|
| **SerpApi `engine=google_jobs`** | `gl` codes documented as supported: sa, ae, qa, kw, bh, om, pk [V] | Params: `q`, `location`, `gl`, `hl`, `uule`, `lrad`, `chips`, `next_page_token` (10 results/page); `ltype` deprecated [V] | Free: 250 searches/month; Starter $25/month for 1,000 [V] | Best legal way to see Indeed/LinkedIn/Bayt/GulfTalent listings that Google indexes. ~6 queries/day fits the free tier |
| **JSearch** (OpenWeb Ninja / RapidAPI) | Google for Jobs data, `country` param [S] | REST | Free Basic tier with a small hard monthly cap [S]; exact number not verified [U] | Backup for SerpApi |
| Apify actors for Naukrigulf / GulfTalent | n/a | Third-party scrapers [S] | Paid credits | Not recommended (ToS/bot-protection risk) |

---

## 5. Arabic job titles worth searching

Seen in real Bayt URLs today [V]: Bayt prefixes the Arabic title before the English one in the slug.

| Arabic | English |
|---|---|
| مهندس ذكاء اصطناعي | AI Engineer [V] |
| مهندس ذكاء اصطناعي توليدي | Generative AI Engineer [V] |
| مطور ذكاء اصطناعي | AI Developer [V] |
| باحث ذكاء اصطناعي | AI Researcher [V] |
| مهندس حلول ذكاء اصطناعي | AI Solutions Architect/Engineer [V] |
| مهندس تعلم الآلة | Machine Learning Engineer [U] |
| عالم بيانات | Data Scientist [U] |
| مهندس بيانات | Data Engineer [U] |
| مطور برمجيات | Software Developer [U] |
| مطور واجهات أمامية وخلفية / مطور فول ستاك | Full-stack Developer [U] |
| أخصائي تطوير برمجيات | Software Development Specialist (this is the official Saudi occupation-style title) [U] |
| مهندس معالجة اللغات الطبيعية | NLP Engineer [U] |
| نماذج اللغة الكبيرة | Large Language Models (keyword) [U] |

Negative keywords (Arabic) to filter out: للسعوديين فقط (Saudis only), سعودي الجنسية (Saudi nationality), تمهير (Tamheer), تدريب تعاوني (co-op training).

---

## 6. Saudi specifics (and Gulf comparisons)

### 6.1 Saudization / Nitaqat
- Nitaqat assigns each establishment a color band by its Saudi-to-expat ratio; quotas are percentages per establishment and per profession, not blanket bans on expats [S].
- **Engineering professions: 30% localization** across 46 engineering titles, for private establishments with 5+ engineers, Saudi minimum wage SAR 8,000, effective after a 6-month grace period (decision Dec 2025) [V on hrsd.gov.sa node 5578806 via WebFetch; S on Gulf News, Ekantipur].
- **ICT professions:** MHRSD set 30+ communications and IT professions for Saudization (programmer, software development specialist, computer engineer, network engineer, technical support, business analysis), establishments with 5+ workers, minimum SAR 5,000 (technical) / SAR 7,000 (specialist) for Saudis to count [S, Ajel / Gulf News]. Exact current percentage not confirmed today [U].
- Practical effect for Bilal: senior AI/LLM/agentic roles at startups, AI labs and consultancies are routinely open to expats (Foodics, Mozn, Sarj.ai, TII, G42 all list such roles today [V]). Junior, "specialist", co-op and Tamheer roles skew to Saudi nationals. Sabbar has an explicit `n-saudis-only` facet for such ads [V that the facet exists].
- **Iqama job title matters:** if the iqama says "engineer" (e.g. Computer Engineer), Saudi Council of Engineers (SCE) professional accreditation is needed, including a Pearson VUE test for new engineers [S]. Many software hires are given "Programmer" or "Software Development Specialist" titles instead [U].

### 6.2 Visas, iqama and sponsorship norms
- Employer-sponsored: the Saudi employer gets a work permit via MHRSD/Qiwa, then the visa via MOFA; typical processing 4-12 weeks; iqama issued shortly after arrival [S].
- **Work permit skill tiers (since 2025):** high-skill / skilled / basic, points-based on education, experience, skills, wage and age; existing workers classified from July 6 2025, new arrivals from August 3 2025 [S, Gulf News, Arabian Business]. An AI engineer with a degree and a solid salary should land in "high-skill".
- **Professional Verification** of qualifications now covers workers from 160 countries and 1,007 professions (groups 1-3, e.g. engineering, health), fully online, about 15 days [S]. Degree attestation chain for Pakistanis: HEC, then MOFA Pakistan, then Saudi Embassy/Cultural Mission (Mousadaqa is the Saudi e-verification service) [S].
- **Job mobility:** since the March 2021 Labor Reform Initiative, expats can transfer to a new employer without the current employer's consent after one year of the contract or at contract expiry, and request exit/re-entry themselves [S]. Some guides still repeat older "2 years" rules; treat those as outdated [S].
- Alternatives: Saudi Premium Residency (special talent tracks) exists for high earners [U on current thresholds].
- **Pakistani nationals:** no Saudi ban; Saudi Arabia was the top destination for Pakistani workers in 2025 [S]. Pakistan was the first country to sign the Takamol Skills Verification Program (SVP), which is mandatory for skilled trades (62 trades via NAVTTC); it targets manual/technical trades rather than graduate IT roles [S].
- **UAE for Pakistanis:** no formal ban in 2026, but approvals tightened and rejections rose for some categories; skilled professionals (engineers, IT) still approved at high rates per agents [S]. UAE Golden Visa route for AI/data professionals at AED 30,000/month basic salary, or nomination by the UAE AI Office [S]. A 90-day AI Specialist visit visa category was reported from Dec 2025 [S].

### 6.3 Salary ranges (monthly, gross, indicative)

| Role / level | Riyadh / Jeddah (SAR) | Dubai / Abu Dhabi (AED) | Label |
|---|---|---|---|
| AI engineer, entry (0-2 yrs) | 10,000-15,000 | 15,000-22,000 | KSA [S edoxi]; UAE [U] |
| AI engineer, mid (2-5 yrs) | 15,000-25,000 | 22,000-35,000 | KSA [S]; UAE [U] |
| AI engineer, senior (5+ yrs) | 25,000-42,000+ | 35,000-55,000 | KSA [S]; UAE [S Gulf News: AI roles at AED 25,000 with top salaries to AED 75,000] |
| Data scientist | 22,000-40,000 | see above | [S, salary guide via search snippet] |
| AI / cloud architect | 35,000-65,000 | 45,000-75,000 | [S] |

Notes: Gulf packages are usually quoted as monthly "basic + housing + transport"; ask which figure is quoted. No personal income tax in KSA or UAE. Expat packages in KSA often add annual flights, family medical, school allowance [S]. Hays Saudi salary guide 2025 PDF: `https://www.hays.ae/documents/d/hays-salary-guide-ae/hays-saudi-arabia-salary-guide-2025` [S]; Michael Page guide: `https://michaelpage.ae/salary-guide` [S].

### 6.4 CV conventions in the Gulf
- Photo: customary on CVs emailed to recruiters; omit for ATS portal uploads [S].
- Nationality: standard field, because visa mechanics and quotas depend on it [S].
- Date of birth: commonly included (UAE especially); age is also a factor in the Saudi permit points system [S].
- Visa status and location: state near the top, e.g. "Pakistani national, based in Karachi, requires employment visa sponsorship, available to relocate to Riyadh". Recruiters filter on "in-country vs needs sponsorship" first [S].
- Notice period: state explicitly (e.g. "30 days") [S].
- Saudi-specific: state iqama status (transferable or not) if already in-Kingdom; spell out certifications in full and abbreviated [S].
- Length: two pages is the norm [S].

### 6.5 What Gulf application forms typically ask [S unless noted]
Nationality; current country and city; visa status / iqama transferability; notice period; current and expected salary (monthly, often split basic vs total, in SAR/AED); total and relevant years of experience; highest degree and whether it is attested; willingness to relocate; gender and date of birth; marital status and number of dependents (affects family visa); driving license (Gulf or international); Arabic proficiency; for engineer titles, SCE membership. Saudi-national programs ask for national ID, which also screens expats out. Tamara and others put the nationality requirement in the job title itself [V].

---

## 7. Recommended integration plan for Signal Desk

| Priority | Source group | Method | Cadence | Firecrawl credits |
|---|---|---|---|---|
| P0 | ~25 employer ATS endpoints in section 3 | Plain `fetch` JSON/RSS from GitHub Actions; normalize to `{title, company, location, url, posted_at}` | 1-2x daily | 0 |
| P0 | Sabbar | Sitemap diff + JSON-LD parse | daily | 0 |
| P0 | LinkedIn, Indeed, Bayt, GulfTalent, Naukrigulf alerts | Email alerts into Gmail (user sets them up by hand), parse via Gmail API or a filter-forward to a parsing inbox | as delivered | 0 |
| P1 | Google for Jobs | SerpApi free tier, ~6 queries/day (`AI engineer` x gl=sa, ae; `LLM engineer` sa; `machine learning engineer` ae; `full stack AI` sa; `remote AI engineer` pk) | daily | 0 (SerpApi quota) |
| P1 | Bayt KSA search page, Michael Page `/jobs/ai`, Hays IT, Qureos, Drjobpro | Firecrawl scrape of allowed listing paths only; no detail pages | daily or every 2 days | ~5-8 per run |
| P2 | Others (GulfTalent, Naukrigulf, Wuzzuf, Dubizzle, Tanqeeb, foundit) | Link-only in the UI | n/a | 0 |

Dedupe across sources on normalized `(company, title)` plus fuzzy match; ATS rows should win because they carry the canonical apply URL. Filter out Saudi/Emirati-national-only, Tamheer, co-op and intern postings by keyword (English and Arabic). Firecrawl reads robots.txt rules for the token `FirecrawlAgent` before crawling [V Firecrawl docs]; do not enable stealth/enhanced proxy modes to get past challenges on sites like Bayt detail pages, Indeed or GulfTalent, since that is bot-protection bypass.

---

## 8. Sources

Primary (fetched today):
- Bayt robots: https://www.bayt.com/robots.txt ; search: https://www.bayt.com/en/saudi-arabia/jobs/ai-engineer-jobs/
- GulfTalent robots: https://www.gulftalent.com/robots.txt ; home https://www.gulftalent.com/
- Indeed robots: https://sa.indeed.com/robots.txt ; ToS: https://www.indeed.com/legal
- Glassdoor robots: https://www.glassdoor.com/robots.txt
- LinkedIn robots: https://www.linkedin.com/robots.txt
- Wuzzuf robots: https://wuzzuf.net/robots.txt
- Tanqeeb robots: https://www.tanqeeb.com/robots.txt
- Qureos robots: https://www.qureos.com/robots.txt ; search https://app.qureos.com/jobs/search/in-saudi-arabia
- Drjobpro robots: https://www.drjobpro.com/robots.txt ; search https://www.drjobpro.com/search-jobs?keyword=ai%20engineer
- Mihnati robots: https://www.mihnati.com/robots.txt
- Monster Gulf robots: https://www.monstergulf.com/robots.txt
- Dubizzle robots: https://dubai.dubizzle.com/robots.txt
- Laimoon: https://www.laimoon.com/ ; robots https://www.laimoon.com/robots.txt
- Akhtaboot: https://www.akhtaboot.com/
- Sabbar robots: https://sabbar.com/robots.txt ; sitemap https://sabbar.com/en/jobs/sitemaps/job-details.xml
- Michael Page: https://www.michaelpage.ae/jobs/ai ; robots https://www.michaelpage.ae/robots.txt
- Hays: https://www.hays.ae/job-search/it-jobs ; robots https://www.hays.ae/robots.txt
- Cooper Fitch robots: https://www.cooperfitch.ae/robots.txt
- Jadarat: https://jadarat.sa/ (Cloudflare block) ; Qiwa: https://qiwa.sa/robots.txt (WAF reject)
- ATS endpoints: all URLs listed in section 3 (Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Recruitee, Pinpoint, Eightfold NEOM, Oracle ORC Aramco Digital and Presight, SuccessFactors RSS Core42 and stc, Phenom G42 and TII)
- Employer pages: https://www.mozn.ai/careers , https://www.leantech.me/uae/en/careers , https://www.aramcodigital.com/careers , https://careers.core42.ai/ , https://careers.tii.ae/us/en , https://careers.g42.ai/global/en , https://careers.mbzuai.ac.ae/vacancies/ , https://ai71.ai/careers , https://careers.stc.com.sa/ , https://careers.neom.com/ , https://careers.tabby.ai/ , https://careers.presight.ai/
- SerpApi: https://serpapi.com/google-jobs-api , https://serpapi.com/google-jobs-countries , https://serpapi.com/pricing
- Firecrawl: https://docs.firecrawl.dev/advanced-scraping-guide
- HRSD engineering localization: https://www.hrsd.gov.sa/en/node/5578806

Secondary:
- Jadarat launch: https://gulfnews.com/world/gulf/saudi/saudi-arabia-launches-jadarat-employment-platform-with-over-70000-job-openings-1.103871823 ; HRDF: https://www.hrdf.org.sa/en/media-center/news/general/launching-the-second-pilot-phase-of-the-unified-national-platform-for-employment-jadarat ; Argaam: https://www.argaam.com/en/article/articledetail/id/1594757
- Engineering 30%: https://gulfnews.com/world/gulf/saudi/saudi-arabia-raises-saudization-rates-across-key-sectors-dentistry-pharmacy-accounting-and-engineering-1.500023438 ; https://ekantipur.com/news/2026/01/04/en/saudi-arabia-makes-30-percent-localization-mandatory-for-engineering-professions-07-36.html
- ICT Saudization: https://english.ajel.sa/lifestyle/over-30-it-professions-set-for-saudization ; https://gulfnews.com/amp/world/gulf/saudi/saudi-arabia-to-localise-communications-it-jobs-1.74365236
- Work permit tiers: https://gulfnews.com/world/gulf/saudi/new-rule-saudi-arabia-launches-new-skill-based-work-permit-system-for-expats-1.500189147 ; https://www.arabianbusiness.com/jobs/saudi-arabia-announces-new-work-permit-system-for-expats
- Professional Verification: https://gulfnews.com/world/gulf/saudi/saudi-arabia-expands-professional-verification-programme-to-160-countries-1.500019969 ; https://argaam.com/en/article/articledetail/id/1739478
- SCE accreditation: https://saudieng.sa/English/AboutSCE/Pages/PPE.aspx ; https://english.ajel.sa/news/expat-engineers-need-to-clear-a-test-to-enter-saudi-arabia
- Labor Reform Initiative: https://www.migrant-rights.org/2021/03/saudi-labour-reforms-to-come-into-force-tomorrow/ ; https://arab.news/r28cx
- Pakistan SVP / Takamol: https://navttc.gov.pk/?p=1548 ; https://www.thenews.pk/print/1333789-why-saudi-arabia-is-now-go-to-destination-for-pakistani-workers
- Saudi visa process: https://www.healyconsultants.com/saudi-arabia-company-registration/employment-visas/ ; https://wheretoemigrate.io/lanes/pakistan-to-saudi-arabia-work-visa-2026
- UAE and Pakistanis: https://arab.news/pmfzx ; https://www.flyingcolour.net/pk/blog/uae-visa-ban-for-pakistan-2026/
- UAE Golden Visa for AI/coders: https://www.techloy.com/the-2026-guide-to-the-uae-golden-visa-a-roadmap-for-tech-talent/ ; https://www.businessdubai.ae/blogs/ai-specialist-visa-uae
- Salaries: https://www.edoxi.com/studyhub-detail/average-ai-engineer-salary-riyadh ; https://gulfnews.com/business/ai-talent-is-reshaping-hiring-pay-and-career-paths-across-the-gulf-1.500421015 ; https://www.hays.ae/documents/d/hays-salary-guide-ae/hays-saudi-arabia-salary-guide-2025 ; https://michaelpage.ae/salary-guide ; https://zerotaxjobs.com/salaries/companies/mozn/principal-ai-engineer-g5do7da8
- Gulf CV format: https://blog.loopcv.pro/gulf-cv-format/ ; https://atsverification.com/blog/cv-vs-resume-ats-rules-by-country/ ; https://visualcv.com/international/gulf-gcc-cv
- Humain / Elm postings via Sabbar: https://sabbar.com/en/jobs/companies/humain ; https://sabbar.com/en/jobs/companies/elm
- GulfTalent AI job URLs (search index): https://www.gulftalent.com/saudi-arabia/jobs/senior-llm-ai-engineer-609919
- Naukrigulf scrapers (evidence of public search API): https://apify.com/blackfalcondata/naukrigulf-scraper
- Gulf Tech Jobs: https://startup.jobs/job-boards/gulf-tech-jobs
