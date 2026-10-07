# Apply: tailored resume and form help for every job

On any job card in the Jobs tab, **Apply kit** does three things:

1. **Tailors his resume** for that job from his master LaTeX resume and gives
   him a PDF to download.
2. **Reads the application form** (every field and custom question) and drafts
   an exact answer for each.
3. **Helps him fill it** on the employer's site, field by field, on his clicks.
   He reviews and presses Submit himself.

Research with live tests: [research/resume-and-apply.md](research/resume-and-apply.md).

## Rules

- **Nothing invented.** The tailored resume and every answer use only facts
  from his master resume plus facts he adds himself. Employers, titles, dates
  and degrees are locked. A requirement he doesn't meet goes into a gap list
  for him, never into the resume.
- **He submits.** No code path clicks Submit, Apply or Send. No bulk applying.
  Many forms carry hCaptcha or reCAPTCHA anyway.
- **Left to him, never filled or stored**: EEO and demographic questions
  (gender, race, veteran, disability), legal and consent checkboxes, "I certify
  this is true", and employers' AI-use policy questions (Anthropic and Hugging
  Face both ask candidates about AI help; the kit shows their notice text).
- **Not on LinkedIn.** The form helper never runs on `linkedin.com`. For Easy
  Apply jobs, the kit shows drafted answers with copy buttons inside Signal Desk.
- **Private.** His resume, ledger and tailored PDFs live in Supabase (private
  bucket, signed URLs). None of it goes in the public repo, a GitHub Actions
  input, a log or an artifact.

## 1. The master resume and facts ledger

He pastes his LaTeX source once (Settings → Resume).

- The app normalises the preamble for the compiler (see below), compiles it,
  and checks the PDF.
- It parses the source into a **facts ledger** in Postgres: roles (employer,
  title, dates, location, locked), bullets (LaTeX source, plain text, numbers,
  skills), skills with the bullets that prove them, projects, education,
  certifications, links.
- He reviews the ledger once and can add true facts the resume leaves out
  (projects, tools, results). Those become usable in tailoring and answers.
- A **candidate profile** row holds form facts: contact details, links, notice
  period, salary ranges per region (monthly SAR/AED for the Gulf, annual EUR/GBP
  for Europe), languages, and a work-authorisation table per country (Pakistan
  yes; Saudi, UAE, EU, UK: needs sponsorship).

Best template: a one-column layout such as Jake's Resume. Two-column sidebars
get read in the wrong order by parsers, and icon fonts (Awesome-CV's
FontAwesome) turn into junk characters in the PDF's text layer.

## 2. Tailoring a resume to a job

1. **Read the job**: full description and requirements, from the job's source
   API or its page.
2. **Plan**: DeepSeek in JSON mode returns edits, not LaTeX:
   `{ edits: [{ bullet_id, new_text, uses_facts }], reorder, drop, skills_order, summary, gaps }`.
   It may reword and reorder bullets, choose projects, order skills, and write
   a one-line summary, mirroring the job's exact terms where they're true
   ("RAG", "LLM evaluation", "PyTorch"), spelling out acronyms once.
3. **Check, deterministically, before compiling**:
   - every number, percentage, money amount and date in new text exists in the
     source bullet or the ledger;
   - every tech term or skill exists in the ledger;
   - no new employer, title, degree or date;
   - LaTeX special characters are escaped, and raw backslashes from the model
     are rejected;
   - each bullet stays within about 1.15x its original length so the page count holds.
   A failed check drops that edit and says why.
4. **Write the LaTeX**: the edits are applied only inside known macros
   (`\resumeItem{…}`, the skills lines, the summary); everything else is kept
   byte for byte.
5. **Compile and verify** (section 3).
6. **Review**: per-bullet before/after diff, keyword coverage before and after,
   the gap list ("asks for Kubernetes; not in your ledger"), and the PDF.
   Accept all, or bullet by bullet.
7. **Download** as `Bilal-Taha-Resume-<Company>-<Role>.pdf`. Every accepted
   version is stored against the job, so he always knows what he sent.

**Region presets** decide optional header lines and the cover letter:

| Region | Photo | Personal details | Length | Cover letter |
|---|---|---|---|---|
| Saudi, UAE, Gulf | Common, often expected | Nationality, visa status, often DOB; notice period and expected salary near the top | 2 pages | Short cover email |
| Germany | Optional (legally), common at traditional firms | DOB optional | 1-2 pages | Anschreiben expected, except at English-first startups |
| Netherlands | Optional | Usually none | 1-2 pages | Motivation letter, read closely |
| UK, remote, US | None | No age, DOB, marital status or nationality (UK guidance) | 1-2 pages | Optional, valued |

The kit drafts the cover letter or motivation letter in his voice (same voice
profile and no-dash rule as his posts), from the same ledger.

## 3. Compiling LaTeX to PDF, free and private

- **Primary: Tectonic inside a Vercel function.** Tectonic 0.17 is a 26 MB
  static Linux binary. It ships with the function plus a pre-built package
  cache (about 44 MB for Jake's Resume) through `outputFileTracingIncludes`,
  and runs with `--only-cached` so it never reaches the network. Tested
  locally: 0.9-1.7 s warm. Vercel Hobby with Fluid compute allows 300 s per
  function (Vercel docs, August 2026), so time is not a constraint. No third
  party sees the resume.
- Tectonic uses XeTeX, so the preamble needs one guard, added automatically:
  `\usepackage{iftex}\ifPDFTeX\input{glyphtounicode}\pdfgentounicode=1\fi`.
- **Fallback: the same binary in GitHub Actions** (`workflow_dispatch`), about
  30-90 s. The repo is public, so the workflow gets only a build ID and reads
  the `.tex` from Supabase with a secret, writing the PDF to the private bucket.
- **Escape hatch**: an "Open in Overleaf" button for manual edits.
- **Verify every PDF** (one test build produced a PDF with the whole body
  missing and still reported success):
  1. compile with halt-on-error;
  2. extract the text (`unpdf`) and assert his name, email, every employer and
     the start of every edited bullet are present;
  3. assert the page count (1 or 2);
  4. assert no replacement or private-use characters;
  5. surface "line too long" warnings from the log.
- **Spike first**: a 20-line route that compiles a tiny file on Vercel. It is
  the one link not yet tested.

## 4. Reading the application form

Detected from the apply URL's host. Live-tested without logging in:

| ATS | How we get the fields | Notes |
|---|---|---|
| Greenhouse | `boards-api.greenhouse.io/v1/boards/{board}/jobs/{id}?questions=true` | Exact labels, types, required flags, options; EEO in a separate block |
| Lever | Apply page HTML: standard inputs plus `cards[…][baseTemplate]` JSON for custom questions | The postings API has no questions |
| Ashby | `jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobPosting` → `applicationForm` | Internal endpoint; may change |
| Workable | `apply.workable.com/api/v1/jobs/{shortcode}/form` | Rate-limited by Cloudflare; space requests or read it from his browser |
| Recruitee | `{company}.recruitee.com/api/offers/` → `open_questions` | Includes video questions, flagged for him |
| SmartRecruiters | `screeningQuestions` JSON embedded in the public apply page | The config API needs a partner token |
| Teamtailor, Personio, others | Page HTML via Firecrawl, labels parsed in code | |
| Workday, Taleo, SuccessFactors, iCIMS | Not readable without his account | Helper works in his browser only |

Firecrawl's own JSON extraction paraphrased labels and guessed types in the
test, so for unknown forms the app takes the **HTML** and parses labels in code
(`<label for>`, `aria-label`, `aria-labelledby`, fieldset `legend`); the LLM
only classifies each field.

## 5. Drafting the answers

Each field is classified, then filled from the right source:

| Kind | Examples | Source |
|---|---|---|
| Identity, contact, links | name, email, phone, city, LinkedIn, GitHub, portfolio | profile |
| Resume, cover letter | file upload, "paste your resume" | tailored version (PDF and its text) |
| Work authorisation, sponsorship | "authorised to work in {country}?", "require sponsorship?" | per-country table; flagged as a common knockout question |
| Location, relocation, on-site days | "open to relocating to Riyadh?" | profile, he confirms |
| Start date, notice | "earliest start" | today + his notice period |
| Salary | "expected salary" | his own range for that region and currency; never invented; "open within the posted range" if a range is published |
| Languages, education | CEFR level, degree, dates | profile, ledger |
| Source | "how did you hear about us?" | the real source of the job card |
| Custom free text | "Why us?", "proudest project", "experience with X" | drafted (below) |
| EEO, consent, AI policy, certification | | **left to him** |

Free-text drafts:
- read the whole job ad first; some forms test attention ("start your answer
  with the phrase …", seen in a Workable form);
- answer the question in the first sentence, one concrete story with a real
  metric from the ledger, tied to one specific thing in the job ad;
- 80-150 words unless the form sets a limit (honoured when the form exposes it);
- his voice: polished natural English, no em dashes, no buzzword lists;
- similar past answers he approved are retrieved with pgvector, the same way
  posts stay cohesive with his voice;
- if the question asks about something he lacks, an honest adjacent-experience
  answer, flagged for him.

## 6. Filling the form on the employer's site

Three ways, from simplest to fastest:

1. **Copy buttons** in Signal Desk, one per field in form order. Works
   everywhere, including Workday and LinkedIn Easy Apply.
2. **Bookmarklet**: limited. Page security policies block it from fetching the
   answers, it can't reach forms embedded in cross-origin iframes (most
   Greenhouse embeds), and React inputs need special handling. Not recommended.
3. **A personal Chrome extension** (recommended): loaded unpacked, never
   published.
   - A side panel shows the drafted answers for the page he's on, fetched from
     Signal Desk with a personal token.
   - Buttons: "Fill this field", "Fill standard fields", "Highlight unmatched".
     Each fill highlights the input so he sees what changed. It sets React
     inputs correctly (native value setter plus input and change events) and
     can attach the tailored PDF to the file input.
   - Runs only on ATS hosts (Greenhouse, Lever, Ashby, Workable, Recruitee,
     SmartRecruiters, Workday, Teamtailor, Personio, Taleo, iCIMS,
     SuccessFactors), in all frames. Never on `linkedin.com`.
   - Has no code that clicks a submit-type button; a unit test asserts it.
   - Never touches EEO, consent or certification fields.

Simplify Copilot does similar autofill but keeps the profile on Simplify's
servers and writes generic answers. Ours keeps everything in his Supabase and
drafts per job in his voice.

## 7. After he applies

He clicks **Submitted** in Signal Desk. The job moves to Applied with the
resume version, the answers and the date. Application-update emails from the
email bridge ("your application was viewed") move it further.

## Data

New tables, added to [data-model.md](data-model.md):

```sql
resume_master (id int pk default 1, latex text, template text, compiled_at timestamptz, pdf_path text)
ledger_roles (id uuid pk, employer text, title text, start_date text, end_date text, location text, sort int)
ledger_bullets (id uuid pk, role_id uuid null references ledger_roles, section text,
  latex text, plain text, numbers text[], skills text[], sort int)
ledger_skills (id uuid pk, name text unique, evidence uuid[])
candidate_profile (id int pk default 1, contact jsonb, links jsonb, notice_weeks int,
  salary jsonb, languages jsonb, work_auth jsonb, updated_at timestamptz)
resume_versions (id uuid pk, job_id uuid references jobs, edits jsonb, latex text,
  pdf_path text, checks jsonb, accepted_at timestamptz)
applications (id uuid pk, job_id uuid references jobs, resume_version_id uuid,
  form jsonb, answers jsonb, cover_letter text, submitted_at timestamptz, status text)
```

Storage: private bucket `resumes`. Secret: `EXTENSION_TOKEN` for the extension.

## Done when

- His real master resume compiles in the app, and the text check passes.
- A tailored version for a real Greenhouse job shows a sensible diff, passes the
  fact checks with nothing invented, and downloads as a one- or two-page PDF.
- The extension fills every standard field on a real Greenhouse, Lever and
  Ashby form without touching EEO fields or Submit, and he submits it himself.
