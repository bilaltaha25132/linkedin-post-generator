# The landscape: who does this, what works, where we win

Full report: [research/competitors.md](research/competitors.md).

## The market in one paragraph

The LinkedIn creator-tool market (Taplio, Kleo, Supergrow, EasyGen, AuthoredUp,
Typegrow, MagicPost, ContentIn, Brandled, Postiv, Engage AI) sells the same
bundle at $20-200 a month: an AI writer trained on your past posts, a library of
viral posts to borrow from, scheduling, analytics, and a comment assistant.
Most of them got their LinkedIn data by riding the user's logged-in session
through a Chrome extension. In 2025-2026 LinkedIn and Google shut that layer
down: Kleo's free extension (about 70k users) was killed in June 2025, Taplio X
was pulled from the Chrome Web Store in April 2026, Shield Analytics closed in
May 2026 and users lost years of history, HeyReach's company page and founders'
profiles were restricted in March 2026, and LinkedIn publicly committed to
making engagement pods "entirely ineffective".

## What the winners get right

| Pattern | Who does it well | What we take from it |
|---|---|---|
| Draft in your own voice from your past posts | Taplio, Supergrow, MagicPost | Already built (voice corpus + pgvector). Keep improving. |
| Substance to write about | Supergrow's 15-minute interview, Typegrow's viral library | We have something better: a live wire of AI news, papers and model releases. |
| Formatting and preview inside LinkedIn's editor | AuthoredUp (30k+ users, survived the purge by not automating) | Our copy-for-LinkedIn spacing and carousel PDFs cover this. |
| Scheduling with best-time suggestions | Taplio, Buffer, Typegrow (official API) | Official Posts API plus our cron, one approval per post. |
| Analytics with long history | Shield (now dead), AuthoredUp | Upload LinkedIn's own exports; history lives in our Postgres forever. |
| Comment assistant plus a watchlist | Taplio Engage, Engage AI, Kleo | Same UX, but fed by Bilal's own sharing, not an extension. |
| A CRM of people who engaged with you | Taplio, Kleo | From his data archive (comments, reactions, invitations). |
| Explained match score for jobs | Jobright (1.25M users), Hiring Cafe | Score each job against his profile and say why. |
| Jobs straight from company boards | Hiring Cafe, Simplify | Ashby, Greenhouse, Lever, Workable public APIs. |

## Where every one of them falls short (our gaps to fill)

1. **Templates, not substance.** They remix viral posts. LinkedIn's 2026 ranker
   reads text with an LLM and suppresses generic AI writing. Our posts start
   from a real paper, release or incident, with real numbers and figures.
2. **No learning loop that survives.** Shield died and took users' history with
   it. Ours stores every export Bilal uploads, permanently, and turns it into
   "post this next".
3. **Comment drafts with nothing to say.** Comment assistants rephrase the
   post. Ours can ground a comment in the paper or release the post is about,
   because the wire already read it, plus Bilal's own project experience.
4. **Jobs and content are separate products.** Nobody connects "which skills
   companies are hiring for" to "what you should post about". We can: the Jobs
   tab feeds a skill-demand signal into the Strategist.
5. **No AI-engineer specifics.** Profile reviews are generic. Ours checks his
   profile against the keywords in the jobs he actually matches.
6. **People to meet are generic.** We can suggest the authors of the papers,
   repos and model cards he posts about, the people hiring for roles he fits,
   and the people who already engage with him.
7. **Cost and platform risk.** $0 a month, nothing that can get his account
   restricted, nothing a vendor shutdown can take away.

## What we will not copy

- Auto-commenting, auto-liking, auto-connecting, auto-messaging (Waalaxy,
  Expandi, Dripify, HeyReach): account-restriction risk, against section 8.2 of
  the User Agreement.
- Engagement pods (Lempod, Engage AI's pod product): LinkedIn is actively
  neutralising them, and they train the ranker on the wrong audience.
- Extensions that read LinkedIn pages or inject buttons into them.
- Any third-party "LinkedIn data API" (Proxycurl was sued and shut down in 2025,
  ProAPIs sued in October 2025).
