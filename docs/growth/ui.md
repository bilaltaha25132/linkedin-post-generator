# UI: new tabs and how they fit

Same app shell, same design language (the feed's cards, score rings, chips and
filter bar). Jobs and Leads get their own tabs, as Bilal asked.

## Sidebar

```
Wire        Feed · Saved · Rejected                 (unchanged)
Posts       Write · Library · To post · Posted      (unchanged)
Grow        Today · Plan · Engage · Network         (new)
Career      Jobs · Leads                            (new)
Desk        Sources · Usage · Settings              (Settings new)
```

- **Today**: the day on one screen. Next post slot and what to put in it,
  comments due, rounds due, new 80+ jobs and leads, replies waiting.
- **Plan**: the Strategist ("Post this next", the week's slots, pillars,
  analytics and insights, uploads).
- **Engage**: share-in inbox with drafts, Rounds, Today's topics, Threads still alive.
- **Network**: connection queue, notes budget, profile review.
- **Jobs**, **Leads**: see [jobs.md](jobs.md), [leads.md](leads.md).
- **Settings**: LinkedIn connection, job profile, pillars, watchlist, alert
  thresholds, the opt-in embed fetch.

Phone tab bar: Feed · Today · Engage · Jobs · More.

## Today

```
┌ Today, Wed 8 Oct ─────────────────────────────────────────────┐
│ NEXT POST  6:00 pm PKT (in 4h)                                │
│  Carousel: Mistral Large 4's cyber benchmark     [Open draft] │
│                                                               │
│ COMMENTS  3 of 8 today       ROUNDS  4 due     REPLIES  2     │
│  [Open Engage]                                                │
│                                                               │
│ JOBS  2 new at 80+           LEADS  1 new at 75+              │
│  Applied AI Engineer, Cohere · Remote EMEA · 86   [View]      │
│  Founder needs RAG over legal docs · Dubai · 81   [View]      │
└───────────────────────────────────────────────────────────────┘
```

## Jobs

```
[Search roles…]  Fit: All 60+ 80+   Where: Saudi·UAE·Gulf·DE·NL·UK·EU·Remote·PK   Visa ▾   Type   Posted ▾
24 roles · 6 new today

( 86 )  Applied AI Engineer                  [Apply kit] [Save] [Hide]
        Cohere · Remote, EMEA · $140-170k · 9h ago · visa: possible
        Agents and RAG for enterprise customers; your LangGraph and
        pgvector work maps directly.
        RAG  LangGraph  Python  Postgres  ·  Kubernetes (gap)
        via Ashby
```

Tabs inside Jobs: **Matches** · **Saved** · **Applied** (tracker columns:
Applied, Interviewing, Offer, Closed) · **Companies** (seeded list, add by
careers URL) · **Skills** (skill-demand radar chart).

## Apply kit

```
┌ Apply kit: AI Engineer, Mozn · Riyadh ────────────────────────┐
│ RESUME   Gulf preset · 2 pages · 7 bullets reworded, 2 moved  │
│  [Review diff]  [Download PDF]   Gaps: Arabic NLP, Kubernetes │
│ COVER    Short cover email, drafted          [Edit] [Copy]    │
│ FORM     Workable · 14 fields · 11 drafted · 3 left to you    │
│  Notice period ......... 4 weeks                     [Copy]   │
│  Expected salary ....... SAR 22,000 / month          [Copy]   │
│  Why Mozn? ............. "Your Arabic-first …"  [Edit] [Copy] │
│  Open the form; the extension fills on your clicks. [Open]    │
│                                          [Mark submitted]     │
└───────────────────────────────────────────────────────────────┘
```

## Leads

```
Kind: All · Hiring posts · Client posts · Gigs · Contract roles    Region ▾

( 81 )  Founder: "need someone to build RAG over our case files"
        LinkedIn · Dubai · posted 2 days ago · budget unknown
        Small legal-tech team, wants a contractor for 6-8 weeks.
        RAG  Next.js                 [Open] [Draft reply] [Contacted ▾] [Hide]
```

## Engage

```
┌ Share a post ─────────────────────────────────────────────────┐
│ [paste a LinkedIn link or the post text]           [Draft]    │
│ Tip: share from the LinkedIn app, or use the bookmarklet.     │
└───────────────────────────────────────────────────────────────┘
TODAY'S TOPICS  Mistral Large 4 · Agent sandbox escape · DeepSWE

INBOX
 Harrison Chase · posted 38 min ago · Comment now
 "Most agent failures we see are state, not reasoning…"
  Matched: your LangGraph checkpointing work · wire: LangGraph 1.2 notes
  ① Field note (11/12)   ② Counterpoint (10/12)   ③ Question (9/12)
  [editor with draft ①]                       [Copy (edit first?)] [Log as posted]

ROUNDS (4 due)
 Jerry Liu · A · last visited 6 days ago        [Open activity] [Note]
```

## Network

Queue cards with who, why, a search or profile link, status buttons, and the
notes budget. Profile review is a section below with the report card and rewrites.

## Plan

"Post this next" cards (what, why, format, slot, [Draft it]), the week strip
(three slots), pillar balance bar, then Analytics: upload box, headline metrics
(follower conversion, profile-view rate, reach multiplier), tables for topic,
hook, format and timing, each showing n.

## Accessibility and phone

Every new list is a semantic list of cards with real buttons; filter controls
are labelled selects (as the feed's "From" filter). The share target and Today
are designed phone-first: that's where LinkedIn scrolling happens.
