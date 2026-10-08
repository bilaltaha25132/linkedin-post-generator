# Jobs tab

Fresh AI and LLM engineering roles Bilal can actually get, ranked by fit, with
the reason for each score and a direct apply link.

Source research, with live-probed fields:
[research/jobs-and-leads-sources.md](research/jobs-and-leads-sources.md) (round 1),
[research/gulf-jobs.md](research/gulf-jobs.md) (Saudi and the Gulf),
[research/europe-global-jobs.md](research/europe-global-jobs.md) (Europe and global).
Every job card has an **Apply kit**: a resume tailored to that job as a PDF, and
drafted answers for every field of its application form ([apply.md](apply.md)).

## Who it's for

Bilal: Full Stack AI Engineer in Karachi (RAG, LangGraph, agents, pgvector,
FastAPI, Next.js, Postgres, Docker). Targets, in order:

1. **Saudi Arabia** (Riyadh, Jeddah, Dammam, NEOM), on-site with sponsorship or remote.
2. **The rest of the Gulf**: UAE, Qatar, Kuwait, Bahrain, Oman.
3. **Europe**: Germany, Netherlands, Ireland, UK, Poland, the Nordics, Spain,
   Portugal, Switzerland, Austria, the Baltics and others, on-site with visa
   sponsorship or remote-EMEA.
4. Remote roles open to Pakistan or worldwide.
5. Contract roles anywhere (these also go to [Leads](leads.md)).

The order is a setting, and scoring follows it (see the weights below).

These live in one editable **job profile** (Settings → Job profile): target
titles, must-have and nice-to-have skills, locations, minimum pay, seniority,
dealbreakers (US-only, clearance, data labelling, agencies). The profile is
embedded once and reused for every match.

## Sources (starter set)

All free, no LinkedIn, terms checked. Each card credits and links its source.

| Source | How | Cadence | Notes |
|---|---|---|---|
| **Ashby** boards | `api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true` | each company every 6h, spread over hourly runs | Most AI labs and startups: OpenAI, Cohere, Perplexity, ElevenLabs, LangChain, Modal, Pinecone. Has `isRemote`, `workplaceType`, comp. |
| **Greenhouse** boards | `boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true` | same | Anthropic and many others. Location is free text. |
| **Lever** boards | `api.lever.co/v0/postings/{site}?mode=json` | same | Docs say these may be read by third parties. |
| **Workable** | `apply.workable.com/api/v1/widget/accounts/{slug}` | same | Hugging Face hires here. |
| **HN "Who is hiring?"** | Algolia, `tags=comment,story_<id>` | find the thread on the 1st, re-poll daily for 10 days | High-signal, many remote AI roles. LLM extracts company, role, location, remote, link. |
| **Himalayas** | `himalayas.app/jobs/api/search?q=…&sort=recent` | daily | Has location and timezone restrictions. Link back required. |
| **Jobicy** | `jobicy.com/api/v2/remote-jobs?geo=anywhere&industry=engineering&tag=llm` | every 6h (cap: once an hour) | 7-day window. Link back. |
| **We Work Remotely** RSS, **RemoteOK** API | feed / JSON | every 6h | Noisy; regex pre-filter does the work. RemoteOK needs a named link back. |
| **Remotive** | `remotive.com/api/remote-jobs?search=llm` | max 4 a day | Jobs arrive 24h late. Sometimes lists Pakistan explicitly. |
| **Google for Jobs** via JSearch (200/month) or SerpApi (250/month) | `country=pk / ae / gb`, `date_posted=today` | about 6 queries a day | The only clean route to Pakistan, UAE and UK listings (Rozee, Bayt, GulfTalent and LinkedIn listings show up here). |
| Adzuna (optional) | `api.adzuna.com/v1/api/jobs/gb/search` | daily | UK only. |

### Saudi Arabia and the Gulf

Verified live on 2026-10-07 ([research/gulf-jobs.md](research/gulf-jobs.md)):

| Source | How | Notes |
|---|---|---|
| **Gulf employers on standard ATSs** | Same pullers as above | Greenhouse: Careem (also lists Karachi and Lahore), Tamara, Hala, AI71. Ashby: Lean, Sarj.ai, Ziina, Thndr. Workable: Salla, Foodics, Lucidya, Mozn (`mozn-ai`). Recruitee: Unifonic. Pinpoint: Tabby. SmartRecruiters: HungerStation, talabat, Jisr. Lever: MBZUAI's foundation-models institute (`ifm-us`) |
| **Large AI employers on enterprise ATSs** | Built (`eightfold`, `phenom`, `oracle`, `successfactors`) | NEOM (Eightfold, `careers.neom.com/api/apply/v2/jobs?domain=neom.com`, ten a page), G42 group and TII (Phenom; job JSON embedded in the search page, full ad from the job page's JSON-LD at scoring time), Aramco Digital and Presight (Oracle Recruiting Cloud REST), Saudi Aramco, Core42 and stc (SuccessFactors RSS `/services/rss/job/`, read once per keyword since an empty search returns a sliver). The first three read the whole board, so they're company boards; the RSS feeds are searches and close by age |
| **Naukrigulf** | Built (`naukrigulf`), one source per country, every 12h | The JSON API its own search pages call, `/spapi/jobapi/search`, with the site's public web-client headers (`appId: 205`, `systemId: 2323`). robots.txt allows search. About 50 to 170 kept roles per country. No Firecrawl credits. Relayed (below) |
| **Workable job search** | Built (`workable_search`), one source per country, every 12h | `jobs.workable.com/api/v1/jobs?query=…&location=Saudi Arabia`, 20 a page with `nextPageToken`; full descriptions included. Covers every company on Workable, not just the boards listed above |
| **Sabbar** (sabbar.com) | Built (`sabbar`), daily | Sitemap entries from the last 14 days whose role slug passes the title filter (up to 60), then `JobPosting` JSON-LD on each page. robots.txt allows all |
| **Bayt** | Firecrawl the country search page once a day (`/en/saudi-arabia/jobs/<kw>-jobs/`, 30 jobs in JSON-LD); job pages are behind Cloudflare, so cards link out | Plus Bayt's own email alerts into the email bridge |
| **Qureos**, **Michael Page Gulf** | Job pages carry `JobPosting` data or plain HTML | Small, but real AI roles |
| **Google for Jobs** via SerpApi | `gl=sa`, `ae`, `qa`, `kw`, `bh`, `om` | The legal window onto Indeed, GulfTalent, Naukrigulf and LinkedIn listings. Free plan 250 searches a month, shared |
| Humain, SDAIA, Elm | No public ATS found | Their roles reach him through LinkedIn job alerts (email bridge) and Sabbar |

**Relayed sources.** Naukrigulf and Saudi Aramco's careers site hang every
request from Vercel but answer GitHub's runners, so their `job_sources` rows
have `relay = true` and the hourly jobs workflow fetches them first
(`scripts/relay.mjs jobs`, one request at a time with a pause). It asks
`GET /api/public/cron/jobs/relay` what's due; the app runs the puller once to
list the URLs it would request, the runner fetches them, and one `POST` per
source hands the bodies back to be parsed by the same puller and ingested. The
owner chose this route on 2026-10-08.

The board searches run ten queries each (AI engineer, machine learning, LLM,
generative AI, artificial intelligence, data scientist, full stack, Python,
backend, software engineer). In Saudi and the Gulf the title filter also
accepts plain software, backend, Python, data, cloud and platform engineer
titles (`GULF_TITLE_RE` in `classify.ts`); the score ranks them.

Not scraped: Indeed (terms forbid it), Glassdoor, GulfTalent,
Wuzzuf, Dubizzle (bot walls), Jadarat and Qiwa (need a Saudi ID). Their
listings reach him through Google Jobs and their email alerts.

Arabic titles are searched too where a source supports it: مهندس ذكاء اصطناعي
(AI engineer), مهندس ذكاء اصطناعي توليدي (generative AI engineer), and the
others listed in the research.

### Europe and global

Verified live on 2026-10-07 ([research/europe-global-jobs.md](research/europe-global-jobs.md)):

| Source | How | Notes |
|---|---|---|
| **EU AI companies on ATSs** | Same pullers | About 100 slugs confirmed: Mistral (Ashby `mistral.ai`), Aleph Alpha (`AlephAlpha`), Helsing, Synthesia, ElevenLabs, Wayve, Black Forest Labs, n8n, deepset, Cohere, Faculty, Lovable, Parloa; Hugging Face (Workable); Celonis, Adyen, N26 (Greenhouse); Spotify (Lever); Merantix (Personio) |
| **More ATS types** | New pullers | SmartRecruiters `api.smartrecruiters.com/v1/companies/{id}/postings`, Personio `{slug}.jobs.personio.de/xml`, Recruitee `/api/offers/`, Teamtailor `jobs.rss`, Workday CXS search, Breezy `/json`, Pinpoint `/postings.json`, Lever EU host |
| **Germany: Bundesagentur für Arbeit** | `rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs?was=…` with header `X-API-Key: jobboerse-jobsuche` | Unofficial but public; 629 results for "Machine Learning" today |
| **EURES** (EU portal) | Public search endpoint (undocumented POST) | Huge and loose; titles filtered in code |
| **Arbeitnow** | Free API with `visa_sponsorship=true` | Germany-heavy; the sponsorship filter works |
| **Sweden JobTech**, **4dayweek**, **Landing.jobs** (`relocation_paid` field), **Working Nomads**, **NoDesk** RSS, **Berlin Startup Jobs** ML RSS | Free APIs and feeds | Link back where asked |
| **Relocate.me**, **jobs.ch**, **YC Work at a Startup**, **Arc.dev**, **karriere.at**, **jobindex.dk** | Firecrawl, JSON-LD on pages | Every Relocate.me role comes with relocation support |
| **Adzuna** (de, nl, pl, fr, at, ch, es, it, be, gb) | Free API key | One key, many countries |
| **Reed** (UK), **Careerjet** | Free API key | Optional |
| Careers pages without a feed (Zalando, Klarna, Revolut, Qdrant, Booking, Bolt) | Weekly Firecrawl of the careers page | Few credits |

Not scraped: LinkedIn, Indeed, Glassdoor, StepStone, Totaljobs, IrishJobs,
CV-Library, Pracuj.pl, Built In, Malt, Upwork, FINN.no, InfoJobs (terms or bot
walls). Google Jobs and email alerts cover them. Dead or moved: Otta (now
Welcome to the Jungle), ai-jobs.net (now foorilla), SwissDevJobs and
GermanTechJobs (redirect to a signup page), Hired, Talent.io.

### Firecrawl budget

Free tier: 1,000 credits a month, 10 requests a minute. Search costs 2 credits
per 10 results, a scrape 1 credit, and Firecrawl's JSON extraction 4 more. So
Firecrawl is used only where there's no API or feed, pages are parsed from
their JSON-LD or with our own LLM instead of Firecrawl's extraction, and the
jobs cron gets its own monthly cap (about 600 credits). The research sketch
comes to about 880 a month for everything, which fits only if the wire's own
use stays low; the Usage page shows both.

### Filters only the Gulf and Europe need

- **Nationals-only roles**: Saudization and Emiratization are quotas per
  company, not bans (engineering titles are at 30% Saudi in KSA since late
  2025), so senior AI roles stay open to expats. Some postings are for
  nationals only, though. Titles or tags with "Saudi National", "Emirati
  National", "Tamheer", "Co-op", للسعوديين فقط or تمهير are dropped before scoring.
- **Visa sponsorship flag** (one label per job: likely, possible, unlikely,
  unknown), from:
  - keywords in English, German, Dutch, Polish and French ("visa
    sponsorship", "relocation package", "must already have the right to work");
  - the **UK Skilled Worker sponsor register** (gov.uk CSV, about 123k rows,
    updated often; the file name changes, so it's read from the page) and the
    **Dutch IND recognised sponsor** list (HTML table, monthly), matched by
    company name;
  - the salary against the 2026 threshold for that country (UK £41,700; NL
    €5,942 a month at 30+; Germany Blue Card about €50,700; Ireland Critical
    Skills €40,904 with a 2-year offer).
- **Gulf pay** is compared monthly in SAR or AED (Riyadh AI roles roughly SAR
  15-25k mid and 25-42k+ senior, indicative), with housing and transport noted
  when the posting splits them.

Skipped as direct sources: LinkedIn Jobs, Indeed, Wellfound, Rozee, Bayt,
GulfTalent, Upwork (no public feed, or scraping banned). They still reach the
tab two ways:

- **LinkedIn job alerts by email.** Bilal sets up to 20 daily LinkedIn job
  alerts (titles × Pakistan, UAE, UK, remote). The email bridge
  ([unlocks.md](unlocks.md#1-the-email-bridge)) parses each card into
  title, company, location, insight line ("4 connections", salary) and the
  LinkedIn job ID, and scores it like any other job. The card links to
  `linkedin.com/jobs/view/{id}/`, which he opens himself. Application updates
  from `jobs-noreply@` move cards along the Applied tracker. Other boards'
  alert emails (Indeed, Wellfound, Rozee, Bayt) can join the same bridge later.
- **Today's LinkedIn searches.** A row of links above Matches opens LinkedIn's
  own job search, posted in the last 24 hours, newest first, for each place he
  cares about:

  | Link | URL |
  |---|---|
  | Pakistan | `linkedin.com/jobs/search/?keywords=AI%20Engineer&geoId=101022442&f_TPR=r86400&sortBy=DD` |
  | UAE | `...&geoId=104305776...` |
  | UK, remote | `...&geoId=101165590&f_WT=2...` |
  | Worldwide, remote | `...&geoId=92000000&f_WT=2...` |
  | Worldwide contract (week) | `...&geoId=92000000&f_WT=2&f_JT=C&f_TPR=r604800...` |

  Keywords rotate through his target titles (AI Engineer, LLM Engineer,
  Applied AI, AI Agent, Forward Deployed Engineer). Verified live on
  2026-10-07: 21 Pakistan jobs posted in the previous 1-20 hours.

### Building the company list

- Seed about 60 AI companies by hand (labs, AI infra, agent/RAG tooling, AI
  startups in UAE and UK) in a `companies` table with `ats` and `board_token`.
- Weekly discovery job: take the YC companies tagged AI and hiring from
  `yc-oss.github.io/api/tags/artificial-intelligence.json` (336 at research
  time), try Ashby, Greenhouse, Lever, Workable with the slug, cache the first
  that answers. Also accept a careers-page URL from Bilal and regex the board
  token out of it.
- An "Add company" box on the Jobs tab: paste a careers URL, it detects the ATS.

## Pipeline (one pass)

Runs as its own cron endpoint (`/api/public/cron/jobs`), separate from the news
monitor, with the same budget-and-deadline pattern. (Vercel Hobby with Fluid
compute now allows 300 s per function, per Vercel's docs updated August 2026;
we still keep each pass short.)

1. **Fetch** a slice of sources due this hour (round-robin, about 20 GETs).
2. **Normalise** to one shape (see [data-model.md](data-model.md)).
3. **Pre-filter for free**: title regex
   `(ai|ml|machine learning|llm|genai|generative|applied (ai|scientist)|rag|agent|nlp|forward deployed|full[- ]?stack)`;
   drop obvious dealbreakers ("US citizens only", "must be authorized to work in
   the US") unless contract.
4. **Dedupe**, four layers:
   - exact `(source, source_id)`;
   - canonical URL: a Himalayas card pointing at `jobs.ashbyhq.com/x/…` merges
     into the Ashby record, and the company's own posting always wins;
   - `dedup_key = hash(company + normalised title + remote scope)` within 30 days;
   - embedding cosine > 0.95 within the same company.
5. **Embed and shortlist**: cosine against the job-profile embedding; only the
   top slice (similarity > 0.55) goes to the LLM.
6. **Score with DeepSeek** (temperature 0, JSON, cached by `dedup_key`):

   ```json
   { "score": 0-100,
     "remote_from_pk": "yes|no|unclear",
     "seniority_fit": "under|fit|over",
     "stack_overlap": ["RAG", "LangGraph", "pgvector"],
     "gaps": ["Kubernetes"],
     "red_flags": ["agency", "data labelling", "unpaid trial", "US only"],
     "why": "one plain sentence" }
   ```

   Weights: stack overlap 35, can he get this job from Pakistan 25 (remote
   allowed, or a region he targets with sponsorship likely or possible),
   seniority 15, product AI vs data labelling 15, pay signal 10. A region
   bonus follows his order (Saudi first). Capped at 30 when it's on-site in a
   place he doesn't target, or sponsorship is "unlikely".
7. **Freshness**: show 14 days. "New" under 24h, "Fresh" under 72h. A job
   missing from its board on two pulls in a row is closed and hidden. Greenhouse
   posts first published more than 60 days ago lose 15 points (evergreen reqs).
8. **Alert**: a score of 80+ sends an instant email (same channel as breaking
   news alerts, max 3 a pass). The 9am PKT daily digest gets the top 10.

## The tab

- Filters: Fit (All / 60+ / 80+), Where (Saudi / UAE / Rest of Gulf /
  Germany / Netherlands / UK & Ireland / Rest of Europe / Remote worldwide /
  Pakistan), Visa (sponsorship likely or possible), Type (Full-time /
  Contract), Posted (24h / 3d / 14d), Source, Company, search.
- Each card: title, company, location badge ("Remote, worldwide", "Dubai,
  on-site"), pay if known, posted age, fit ring (same component as the feed's
  signal score), the one-line why, skill chips (green = he has it, grey = gap),
  source credit link, buttons **Apply** (opens the ATS), **Save**, **Hide**,
  **Applied**.
- Status pipeline: New → Saved → Applied → Interviewing → Offer / Closed. A
  small tracker view (Teal-style) under the same tab.
- **Apply kit** on any job: a resume tailored to that job from his master
  LaTeX resume (PDF download, nothing invented, a diff to review), a cover
  letter in the region's style, and drafted answers for every field of the
  application form, with a personal Chrome extension that fills them on his
  clicks. He submits. Full design: [apply.md](apply.md).

## Jobs feed the rest of the desk

- **Skill-demand radar**: count skills across this month's matching jobs
  ("LangGraph in 31% of fits, evals in 24%, up from 12%"). The Strategist uses
  it: posting about what employers ask for is how recruiters find him.
- **Profile keywords**: the profile review compares his headline, About and
  skills against the top skills in the jobs he fits.
- **People**: the hiring company's engineering leads become Engage watchlist
  suggestions ("comment on their posts before you apply").

## Done when

- At least 40 seeded companies resolve to a working board.
- One hourly pass stays under 40s and 20 outbound requests.
- Duplicates across Himalayas/Jobicy/ATS collapse into one card.
- A week of results reviewed with Bilal: fewer than 1 in 5 cards in the 60+ band
  is a "why is this here?".
