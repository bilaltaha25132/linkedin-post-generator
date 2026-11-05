# Study tab

`/study` tracks English-taught Master's programs in Germany (CS, AI, data, and
related subjects) for a non-EU applicant aiming at summer or winter 2027.

## Where the data comes from

- **Catalog:** `src/lib/study/programs.json`, generated from the study-abroad
  research (`research/data/windows.json` in the AI-StudyAbroad-Consultant
  project). Each row has the summer and winter windows for non-EU applicants,
  a status for summer 2027, an evidence label (Verified, DAAD, To confirm) and
  the source page. Dates were read on 5 November 2026 (`CATALOG_AS_OF`).
- **The repo is public,** so the catalog holds program facts only. The
  applicant's grade, credits and fit verdicts live in Supabase, never in a
  committed file. Regenerate the catalog from the research rather than
  editing rows by hand, and strip any line that refers to the applicant.
- **Personal state:** `study_tracked` (stage, intake, fit, fit note, notes per
  program) and `study_documents` (which shared documents are ready), from
  `supabase/migrations/0031_study.sql`.

## Views

| View | What it does |
| --- | --- |
| Programs | Filter the whole catalog by subject, summer window and search; Follow adds a program to the tracker |
| Following | Followed programs by stage (Shortlist to Admitted), with intake, fit and notes |
| Documents | The documents every application is built from, ticked off as they arrive (`src/lib/study/documents.ts`) |

Program ids are the DAAD id where there is one, otherwise `direct:n` or
`federal:n` from the research build. Those two depend on build order, so after
regenerating the catalog check that followed programs still resolve; the page
skips any that don't rather than failing.
