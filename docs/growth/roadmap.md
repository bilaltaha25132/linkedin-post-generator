# Roadmap

Ordered by value delivered per week of work, and by what needs nothing from
Bilal (no new accounts) first. Each phase ships on its own and is usable alone.

## Phase 0: groundwork (small)

- Sidebar groups Grow and Career, empty pages with good empty states.
- Settings page: job profile, pillars, alert thresholds.
- Cron scaffolding for `jobs` and `leads` endpoints in `monitor.yml` style.
- **Done when**: the new nav ships behind the same auth, nothing else changes.

## Phase 0.5: email bridge and deep links

Needs: Bilal pastes one Apps Script into his Google account and adds a Gmail
filter (steps in the repo). Nothing else.

- `/api/public/ingest/email` with HMAC, raw `inbound_emails`, parsers for job
  alerts, application updates, comment/reaction/mention notices, weekly search
  appearances, invitations and InMail previews, with fixture tests.
- A deep-link builder (post search and job search) used by Jobs, Leads and Engage.
- A notification-settings checklist on Settings (which LinkedIn emails to turn on).
- **Done when**: a real LinkedIn job alert email becomes a scored card within
  15 minutes, and a comment on his post shows up as an item.

Design: [unlocks.md](unlocks.md#1-the-email-bridge).

## Phase 1: Jobs tab

No new accounts needed for most sources: ATS boards (Ashby, Greenhouse,
Lever, Workable, SmartRecruiters, Recruitee, Personio, Teamtailor, Pinpoint,
Workday, Eightfold, Oracle, SuccessFactors, Phenom), Sabbar, Bayt search pages,
the Bundesagentur API, EURES, Arbeitnow, JobTech, HN, the remote boards.

- `companies` seeded with Gulf and European AI employers first (about 150
  slugs already verified in the research), then labs and remote-first companies.
- `jobs` pipeline; nationals-only filter; visa sponsorship flag with the UK
  and Dutch sponsor registers; scoring by his region order (Saudi first);
  dedup; closure detection; alerts and the daily digest; Jobs tab with
  Matches, Saved, Applied tracker.
- Google Jobs for Saudi, the Gulf, Europe and Pakistan once Bilal makes a free
  SerpApi key; Adzuna for ten European countries with a free key.
- **Done when**: see [jobs.md](jobs.md#done-when).

**Built** (migration `0020`): about 66 company boards on Greenhouse, Lever,
Ashby, Workable, SmartRecruiters, Recruitee, Pinpoint, Personio and
Teamtailor, plus Remotive, RemoteOK, Himalayas, Jobicy, We Work Remotely,
Arbeitnow and HN Who's Hiring. Filters, dedup, closure, scoring, alerts,
digest, the Jobs tab with tracker, and adding a board by URL. **Not yet**:
embeddings, enterprise ATS, Sabbar, Bayt, Bundesagentur, EURES, JobTech, the
sponsor registers, company discovery, SerpApi and Adzuna (need keys).

## Phase 1.5: Apply kit

Needs: Bilal pastes his LaTeX resume once (Settings → Resume) and fills the
candidate profile (notice period, salary ranges per region, work authorisation).

- Spike: compile a tiny file with Tectonic inside a Vercel function.
- Master resume, facts ledger, tailoring with fact checks, compile and PDF
  checks, diff review, download.
- Form reading for Greenhouse, Lever, Ashby, Workable, Recruitee,
  SmartRecruiters; answer drafting; copy buttons.
- The personal Chrome extension that fills fields on his clicks.
- **Done when**: see [apply.md](apply.md#done-when).

**Built** (migration `0026`, commit 5414a54): `/resume` (the master LaTeX, the
ledger, added facts and form facts) and `/jobs/[id]/apply` (tailoring with fact
checks, per-bullet keep or decline, coverage and gaps, .tex download, Open in
Overleaf; form reading for Greenhouse, Ashby, Lever and Workable or pasted
questions; drafted answers with copy buttons; regional cover letters; I
submitted it). Then (commit 9bb5194) the Recruitee reader, SmartRecruiters'
standard fields, and the Chrome extension in `extension/`. **Not yet**: the PDF
compile (Overleaf for now).

## Phase 2: Engage

- PWA manifest with `share_target`, `/share` route, bookmarklet, paste box.
- URL timestamp decode, wire and voice grounding, three drafts with rubric scores.
- Rounds with a confirmed watchlist; Today's topics strip.
- Replies helper on post cards.
- **Done when**: see [engage.md](engage.md#done-when).

## Phase 3: Leads tab

Needs: free Tavily and Exa keys, a Reddit "script" app (Bilal creates these).

- Search lanes with budgets, Reddit, HN freelancer thread, Freelancer.com,
  contract roles from Jobs; classify and score; pipeline and nudges.
- **Done when**: see [leads.md](leads.md#done-when).

## Phase 4: Strategist and Today

- Analytics upload (xlsx and archive zip), metrics, insights tables.
- Pillar assignment, "Post this next", pre-flight checks on drafts.
- Today page. Skill-demand radar from Jobs feeds suggestions.
- **Done when**: see [strategist.md](strategist.md#done-when).

## Phase 5: Publish and schedule

Needs: a LinkedIn developer app (Bilal creates it, associated with a small Page
he owns) with "Sign In with LinkedIn using OpenID Connect" and "Share on LinkedIn".

- Built: OAuth connect, encrypted token, reconnect notice; Publish now for
  text and carousel PDF, one confirm per post (Settings, post cards).
- Built: Schedule on the same confirm step, a 10-minute publish cron, the
  carousel PDF staged when scheduling, failure shown on the card and emailed.
- Still to build: images; reply reminders; the URN joining analytics (Phase 4).
- **Done when**: a scheduled carousel posts on time, and its URN joins analytics.

## Phase 6: Profile and network

- Profile review from the archive; rewrites in his voice.
- Connection queue from warm engagers, paper authors, hiring managers; notes budget; acceptance guard.
- **Done when**: see [profile-and-network.md](profile-and-network.md#done-when).

## Phase 7: Weekly report

- Monday email and "This week" page, built from everything above.
- **Built** (commit 204fb51). The email hasn't been test-sent yet.

## Later ideas

- Extend the email bridge to Indeed, Wellfound, Rozee, Bayt and Upwork alerts.
- Proof portfolio: Featured-section candidates and case-study cards from his
  GitHub, demos and best posts.
- Hiring-manager map: who posts AI roles in his target regions, and the next
  human step for each.
- Newsletter planner once posting is steady for 8-12 weeks.
- Community Management API on a separate app, if Bilal registers a company
  ([unlocks.md](unlocks.md#3-the-official-upgrade)).
- Trend radar and the 360Brew-era checks (profile fit, save-worthiness) are in
  Phases 2 and 4.

## Costs

All free tiers: Tavily 1,000/month, Exa $10/month credit, JSearch 200/month or
SerpApi 250/month, Reddit OAuth (non-commercial), LinkedIn self-serve API,
public job-board APIs. DeepSeek usage grows by a small fraction (see
[data-model.md](data-model.md#llm-budget)). GitHub Actions stays free (public
repo). Vercel Hobby limits are respected with per-endpoint time budgets.

## Decisions Bilal needs to make

1. **Job search mode**: actively looking, or open to the right thing? Sets
   alert thresholds and the Open to Work advice.
2. **Job profile**: target titles, minimum pay, locations in order (remote
   Saudi, Gulf, Europe, remote, Pakistan; see 11), dealbreakers.
3. **Accounts he creates himself** (we never create accounts for him): Tavily,
   Exa, SerpApi, Adzuna, a Reddit script app, and for Phase 5 a LinkedIn
   developer app plus a small LinkedIn Page (steps: [linkedin-setup.md](linkedin-setup.md)).
4. **Hashtags**: keep 2-4 per post (today) or drop them (research says no reach effect)?
5. **Opt-in embed fetch** for bare shared URLs: on or off?
6. **Order**: the order above, or another phase first?
7. **Email bridge**: OK to give a script on his own Google account read access
   to LinkedIn's emails (security mail excluded)? It is the biggest single
   unlock found in round 2.
8. **Company for the official API**: register an SECP SMC-Pvt Ltd (about
   Rs 1,550 plus a domain and website) to apply for automatic post analytics,
   or stay on the weekly XLSX upload?
9. **Grey-zone tools**: confirm they stay out of the app (recommended). If he
   ever wants one, it's his own account and his call, outside Signal Desk.
10. **Resume**: paste the master LaTeX (it stays in the private database,
    never the repo) and say which template it uses.
11. **Regions**: confirm the order (Saudi, rest of Gulf, Europe, remote,
    Pakistan) and any countries to skip; minimum monthly pay in SAR/AED and
    annual in EUR/GBP.
