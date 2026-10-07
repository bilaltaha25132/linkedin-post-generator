# Growth partner: the plan

Signal Desk today finds AI news and drafts posts. This plan turns it into Bilal's
LinkedIn growth partner: it tells him what to post and when, finds the posts
worth commenting on and drafts the comment, surfaces AI-engineering jobs and
client work, learns from how his posts actually perform, and keeps his profile
and network pointed at recruiters and clients.

Status: **plan, not built.** Researched 2026-10-07. Nothing here is implemented yet.

## The one rule everything follows

**Signal Desk suggests and drafts. Bilal clicks.** It never logs into LinkedIn
as him, never reads LinkedIn pages in bulk, and never comments, likes, connects,
messages or posts without his click. 2025-2026 is the year LinkedIn shut down
the tools that did: Kleo's extension, Taplio X, Shield Analytics, HeyReach's
pages, engagement pods, and a "Seems like AI slop" report button for automated
comments. A personal account that gets restricted loses years of network, so
this is not negotiable. Details and sources: [data-and-rules.md](data-and-rules.md).

## What gets built

| Area | What Bilal gets | Doc |
|---|---|---|
| **Jobs** (new tab) | AI/LLM engineering roles across Saudi Arabia, the Gulf, Europe and remote, from employer job boards, open national boards, remote boards and Google Jobs, scored against his profile with a visa flag, deduped | [jobs.md](jobs.md) |
| **Apply kit** | Per job: his LaTeX resume tailored to it as a PDF (nothing invented), a cover letter, and drafted answers for every application-form field, filled on his clicks | [apply.md](apply.md) |
| **Leads** (new tab) | People and companies looking for an AI engineer or contractor: LinkedIn hiring posts found via search APIs, Reddit, HN freelancer thread, Freelancer.com, contract roles | [leads.md](leads.md) |
| **Engage** (new tab) | Posts worth commenting on right now, a "rounds" list of the people he should be visible to, and a drafted comment for any post he opens or shares in | [engage.md](engage.md) |
| **Strategist** (new tab) | "Post this next" picks with format and slot, a weekly plan, pillar balance, and the learning loop from his own analytics | [strategist.md](strategist.md) |
| **Profile & network** | Profile review against what recruiters search, and a warm connection queue with optional notes | [profile-and-network.md](profile-and-network.md) |
| **Publish** | Post and schedule straight to LinkedIn through the official API, text, image and PDF carousel, one approval click each | [strategist.md](strategist.md#publishing-and-scheduling) |
| **Weekly report** | A Monday email: what worked, what to post, jobs and leads worth acting on, people to reply to | [strategist.md](strategist.md#weekly-report) |

How it looks: [ui.md](ui.md). Tables and jobs: [data-model.md](data-model.md).
Order of work, costs and open questions: [roadmap.md](roadmap.md).
Why we beat the paid tools at this: [landscape.md](landscape.md).
Every route into more LinkedIn data, ranked by risk (round 2): [unlocks.md](unlocks.md).
Keys and the LinkedIn developer app Bilal sets up: [linkedin-setup.md](linkedin-setup.md).

## Research

Five deep-dive reports, each with sources and verified/unverified labels:

- [research/competitors.md](research/competitors.md): Taplio, Kleo, AuthoredUp, Supergrow, Typegrow, Engage AI, Shield, automation tools, job tools. Who wins, why, who got shut down.
- [research/linkedin-api-and-rules.md](research/linkedin-api-and-rules.md): exactly what LinkedIn's API lets an individual do, exports, policy text, enforcement.
- [research/jobs-and-leads-sources.md](research/jobs-and-leads-sources.md): 33 job and lead sources, probed live, with fields and terms.
- [research/engage-and-discovery.md](research/engage-and-discovery.md): finding posts without scraping, search-API freshness tests, capture flows, comment rubric, watchlist seed.
- [research/growth-strategy.md](research/growth-strategy.md): how the feed ranks posts in 2026, formats, timing, profile, networking, 29 suggestion rules.

Round 2 (deeper on access routes):

- [research/own-data-channels.md](research/own-data-channels.md): LinkedIn's emails as a feed (senders, subjects, parsing), XLSX and archive exports, Buffer, dead ends.
- [research/official-programs.md](research/official-programs.md): the Community Management API ladder, what a company in Pakistan takes, Pages, Premium and Sales Navigator.
- [research/grey-zone.md](research/grey-zone.md): vendors, open-source libraries, lawsuits, robots.txt, extension detection, a 12-row risk matrix.
- [research/fresh-discovery.md](research/fresh-discovery.md): LinkedIn post and job search deep links, verified geoIds, trend feeds tested live.
- [research/advanced-growth.md](research/advanced-growth.md): the 2026 LLM ranker, saves and sends, reply speed, recruiter search, Pakistan notes, 16 feature ideas.

Round 3 (jobs and applying):

- [research/gulf-jobs.md](research/gulf-jobs.md): 25 Gulf boards and about 35 employers with their ATS, Saudization, visas for Pakistanis, salaries, Gulf CV and form norms, Arabic titles.
- [research/europe-global-jobs.md](research/europe-global-jobs.md): European APIs and boards, about 100 company slugs, more ATS endpoints, visa sponsor registers and 2026 salary thresholds, Firecrawl pricing.
- [research/resume-and-apply.md](research/resume-and-apply.md): compiling LaTeX for free (Tectonic tested), honest tailoring, regional CV rules, reading application forms per ATS, the fill helper.

Vendor statistics in these reports are directional. Where a number matters to a
rule, the rule keeps it as a tunable default and the learning loop replaces it
with Bilal's own data once there is enough.
