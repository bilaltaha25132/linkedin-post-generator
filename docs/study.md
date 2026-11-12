# Study tab

`/study` tracks English-taught Master's programs in Germany (CS, AI, data, and
related subjects) for a non-EU applicant aiming at summer or winter 2027.

## Where the data comes from

- **Catalog:** `src/lib/study/programs.json`, generated from the study-abroad
  research (`research/data/windows.json` in the AI-StudyAbroad-Consultant
  project). Each row has the summer and winter windows for non-EU applicants,
  a status for summer 2027, an evidence label (Verified, DAAD, To confirm) and
  the source page. The catalog was built on 5 November 2026 (`CATALOG_AS_OF`); the rescan below keeps it honest since.
- **Extra facts per program** (`facts` in the JSON): fees, duration, intakes,
  IELTS and TOEFL, minimum grade, Bachelor's size, GRE/GATE/GMAT/TestAS flags,
  interview, letters, and a cut of DAAD's admission text. They come from the
  DAAD detail pages read for the research, so treat them as DAAD's claims.
- **Wider field** (`tier: "wider"`): maths, electrical and microelectronic
  engineering, media engineering, sensors and cognitive science, read from
  DAAD on 6 November 2026. Further from CS; each row says so.
- **State and type** come from the Hochschulkompass institution list (city to
  Bundesland) and the university's name (university, applied sciences,
  private). Baden-Württemberg's EUR 1,500 non-EU fee is added from the state,
  because DAAD often says "no tuition" there.
- **Live dates:** `summerSpan` and `winterSpan` hold each window's start and
  end day. `src/lib/study/windows.ts` pins them to the next summer and winter
  intake and works out open, opens soon, closed and days left from today, in
  UTC so the server and browser agree. Rows without a parseable date keep the
  researched status.
- **The repo is public,** so the catalog holds program facts only. The
  applicant's grade, credits and fit verdicts live in Supabase, never in a
  committed file. Regenerate the catalog from the research rather than
  editing rows by hand, and strip any line that refers to the applicant.
- **Personal state:** `study_tracked` (stage, intake, fit, fit note, notes per
  program) and `study_documents` (which shared documents are ready), from
  `supabase/migrations/0031_study.sql`.

## Keeping dates current

- **Rescan:** `src/lib/study/rescan.ts`, run by `.github/workflows/study.yml`
  through `/api/public/cron/study` (Bearer `CRON_SECRET`) twice a day. Each run
  takes the pages that are due: every program weekly, followed programs every
  20 hours, followed ones first, one page per host at a time, six hosts at once,
  stopping new reads at 230 s. `?only=id1,id2` rechecks named programs and
  `?force=1` rechecks everything.
- **Which page:** `checkUrl` in the catalog: the researched official page when
  there is one, else the page from `official-page-rules.json` that showed the
  most dates, else the DAAD page.
- **What is read:** `src/lib/study/extract.ts` keeps dates on lines that talk
  about applying or deadlines (and the line after, for tables), IELTS and TOEFL
  scores, and fees near tuition words, as short signals such as `date:01-15`.
  The verdict is `match` when a catalog closing date is on the page, `differs`
  when the page has other dates, `no-dates` otherwise.
- **Changes:** a change is recorded in `study_changes` only between two good
  reads of the same URL, so an outage or a new URL never raises one. Followed
  programs that change are emailed through Resend (`src/lib/study/notify.ts`).
- **Refusals:** a 401, 403, 429 or a bot challenge is stored as `blocked` and
  never worked around; PDFs are `skipped`. The card says so and keeps the last
  good read.
- **Second source:** `compassUrl` and `compassDeadline` link a program to its
  Higher Education Compass entry (study-in-germany.com, Hochschulkompass data)
  and its next non-EU deadline month there, matched by city and close name only.
- Tables: `study_checks` (latest read per program) and `study_changes`, from
  `supabase/migrations/0032_study_checks.sql`.

## Views

| View | What it does |
| --- | --- |
| Programs | Summary tiles and what closes in the next 45 days, then the catalog filtered by subject, state, type, summer window, fees, tests and search; each card expands to its facts |
| Following | Followed programs by stage (Shortlist to Admitted), soonest deadline first, with intake, fit and notes |
| Documents | The documents every application is built from, ticked off as they arrive (`src/lib/study/documents.ts`) |
| Changes | How many pages were read, confirmed, show other dates or couldn't be read, then every recorded change with before and after |

Program ids are the DAAD id where there is one, otherwise `direct:n` or
`federal:n` from the research build. Those two depend on build order, so after
regenerating the catalog check that followed programs still resolve; the page
skips any that don't rather than failing.
