# 0006 — Growth partner without LinkedIn automation

**Status:** accepted (2026-10-07)

## Context

Bilal wants Signal Desk to grow his LinkedIn presence: post analytics, what to
post next, comments on trending posts, connections, profile review, jobs and
client leads. The commercial tools that did this in 2024 mostly read LinkedIn
through the user's logged-in session (browser extensions, session cookies) and
automated actions. In 2025-2026 LinkedIn shut that layer down: Kleo's extension,
Taplio X, Shield Analytics, HeyReach's pages, engagement pods; lawsuits against
Proxycurl and ProAPIs; reach limits on automated comments; an "AI slop" report
button. The self-serve API lets an individual publish to his own profile but not
read his analytics, feed or profile. Research: `docs/growth/research/`.

## Decision

- Signal Desk **suggests and drafts; Bilal acts**. No automated comments,
  reactions, connections, follows or messages, ever.
- Publishing uses the official Posts API with **one approval per post**,
  including scheduled posts.
- LinkedIn data comes only from **his own exports and archive** (uploaded),
  what he **shares or pastes**, the URNs our own publishing returns, and
  **LinkedIn's emails to him**, pushed by a script on his own Gmail. Links in
  those emails are stored, never fetched.
- Fresh LinkedIn search is **links he opens himself**: the app builds the
  post-search and job-search URLs, LinkedIn shows the results to him.
- Cookie tools, extensions and scraping vendors are documented with their risks
  and **not wired into the app** (`docs/growth/unlocks.md`).
- Discovery of posts and leads uses **search APIs' own indexes** (URL and
  snippet), never fetching LinkedIn pages, with one opt-in exception: the
  public embed for a single post he shared without text.
- Jobs and leads come from **public, documented** job-board APIs and feeds,
  with their attribution and polling terms.

## Consequences

- No account risk, no vendor risk, $0 a month.
- "Hot" posts for commenting depend on Bilal sharing them in; the app makes
  that one tap (PWA share target, bookmarklet) and tells him where to look
  (rounds, today's topics). Search can't find posts younger than a few days.
- Analytics are as fresh as his last upload (weekly nudge), not live, unless he
  registers a company and gets the Community Management API approved.
- Comment, mention and job-alert events arrive within minutes through email.
- Spec: `docs/growth/README.md`.
