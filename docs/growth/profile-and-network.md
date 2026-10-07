# Profile review and network

Two jobs: make his profile the one recruiters and clients find and trust, and
grow his network with the right people, at a human pace, by his own clicks.

Research: [research/growth-strategy.md](research/growth-strategy.md#5-profile-optimization-for-an-ai-engineer-recruiters--clients)
and [section 6](research/growth-strategy.md#6-networking).

## Profile review

### Input

No self-serve API returns his headline, About or experience, so the review
reads what he gives it:

- the data archive's Profile, Positions, Skills, Education, Recommendations
  files (best: complete and structured), or
- a paste of each section, or the "Save to PDF" of his profile.

### What it checks

| Element | Check | Why |
|---|---|---|
| Headline (220 chars, ~70 visible on mobile) | Starts with "AI Engineer" or "Full Stack AI Engineer"; follows *role, what he builds, stack, proof*; contains his top 3 pillar keywords | Recruiter search is keyword-based, and the feed ranker reads the headline to decide who sees his posts |
| About | First 2-3 lines say who he helps and the outcome; 3 shipped systems with numbers; stack keywords in sentences; how to engage (full-time, projects, remote) | The visible lines decide whether anyone clicks "see more" |
| Skills | Top 5 match the skills in the jobs he fits (from the Jobs tab's skill-demand radar); at least 5 listed | Skills are hard filters in Recruiter |
| Featured | A post from the last 60 days, his best carousel, portfolio/GitHub, the Services page | Proof at a glance |
| Services page | Exists, lists AI integration, LLM apps, RAG and agent builds | Clients can request a proposal without connecting |
| Open to Work | If job hunting: "Recruiters only" (no green frame) | LinkedIn reports ~40% more recruiter messages |
| Verification, photo, custom URL, banner | Present; banner states the value line | LinkedIn: verified profiles get ~60% more views |
| Location | Karachi kept, "remote, open to UAE/UK/US" stated | Recruiter location filters |

### Output

A report card (pass / improve per element) and **rewrites in his voice**: three
headline options, an About draft, a skills order, a Featured order. Every
suggestion cites why ("LangGraph appears in 31% of your job matches and nowhere
in your headline"). He edits and pastes them into LinkedIn himself.

**Recruiter-query test.** Recruiters now search LinkedIn in plain language
("remote LangGraph engineer Pakistan", "RAG contractor UAE"). The review writes
20-30 such queries from the jobs he fits, scores his profile text against each,
and lists the ones he would not match with a sentence that would fix it. The
weekly "appeared in N searches" email (via the email bridge) shows whether the
fixes move the number.

Runs on demand, and a monthly reminder in the weekly report re-checks
headline keywords against the current skill-demand radar.

## Network

### Who to connect with (suggestions only)

Ranked queue, about 10 a weekday, never more than 60 a week (LinkedIn's soft
cap is ~100 a week; staying at half keeps acceptance high):

1. **Warm**: people who commented on or reacted to his posts, or whose posts he
   commented on, in the last 14 days (from the email bridge's comment and
   reaction notices, the archive, and his logged comments). Incoming
   invitations from `invitations@` emails land here too, with a "who is this" line.
2. **Paper and repo authors**: people behind the papers, model cards and repos
   he posts about (names come from the wire's own sources; he finds them on
   LinkedIn with one search link). A post about their work is the perfect opener.
3. **Hiring managers and founders** behind his saved jobs and open leads.
4. **Peers**: AI engineers in his pillar topics who show up repeatedly in the
   threads he comments in (added by him from Engage with one tap).
5. **Follow, don't connect**: top voices (tier A) are suggested as follows.

Each suggestion: who, why ("commented twice on your agent-evals posts"), a
**LinkedIn search link** or profile link to open in his browser, and a status
(Suggested → Sent → Accepted → Talking / Ignored).

### Notes

Free accounts get only a handful of personalised invites a month (reports say
3-10) at 200 characters. Data across 20M requests: notes don't raise acceptance
(26.4% either way) but roughly double replies. So:

- Blank invites for warm people (they already know him from comments).
- A drafted note (under 200 characters, specific, no pitch) only for top
  targets: hiring managers, potential clients, paper authors he wrote about.
  Budget shown: "3 notes left this month".

### Guards

- If acceptance falls under 30% across his last 50 logged invites, the queue
  pauses and suggests tightening targets.
- He sends every invite himself. The app never clicks Connect.

### First messages

For leads and accepted hiring managers, an opener draft: reference something
specific of theirs, one low-friction ask, no pitch in message one, a single
follow-up nudge after 5-7 days.

## Done when

- A real archive upload produces a report card he agrees with, and at least one
  headline option he would use.
- The connection queue for one week has no one he'd call irrelevant.
