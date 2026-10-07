# H. Resume tailoring (LaTeX to PDF) and application form fill help

Research date: 2026-10-07. Labels: [V] verified by me today (live request, local test, or primary doc), [S] supported by a secondary source or strong inference, [U] unverified or my judgment.

Test files were kept in a local scratch folder, not the repo. No accounts were created, nothing was logged in to, no form was submitted.

---

## 0. Headline answers

1. **Compile:** Run **Tectonic inside a Vercel Node function** with a pre-warmed package cache bundled into the function (no network at runtime). Binary 26 MB + cache about 44 MB, well under the 250 MB limit. Warm compile of Jake's Resume was 0.9 to 1.7 s locally. **Fallback:** the same Tectonic binary and cache in a GitHub Actions `workflow_dispatch` job that uploads to a private Supabase bucket (about 30 to 90 s end to end). **Dev or emergency only:** the hosted LaTeX-On-HTTP API at latex.ytotech.com (works, 1.5 to 3.6 s, but a third party with no privacy statement sees the resume).
2. **Important correction to the brief:** Vercel's docs (updated 2026-08-24) now list **Hobby max duration as 300 s** with Fluid compute, not 60 s. Memory 2 GB / 1 vCPU, bundle 250 MB uncompressed, 4.5 MB request/response body. [V] (vercel.com/docs/functions/limitations)
3. **Tectonic is XeTeX only.** Jake's Resume fails as written (`\input{glyphtounicode}` / `\pdfgentounicode=1` are pdfTeX primitives). A one-line `\ifPDFTeX ... \fi` guard fixes it. Do this normalization once, when the user pastes his master `.tex`. [V]
4. **Form fields without login:** Greenhouse, Lever, Ashby, Workable, Recruitee and SmartRecruiters all expose the exact question list (labels, types, required flags, options) without an account. Workday, Taleo, SuccessFactors, iCIMS and Oracle do not. [V] for the six, with real responses below.
5. **Fill help:** a small unpacked Chrome extension (content script) is the right tool. A bookmarklet works for simple pages but breaks on cross-origin iframes (embedded Greenhouse forms) and cannot fetch from your API because of page CSP. The user always clicks Submit himself.
6. **Honesty:** keep a structured facts ledger; the LLM only rewrites text inside known macros and may only reference ledger IDs; a deterministic checker blocks any new employer, title, date, number, or skill that is not in the ledger. Compile with halt-on-error and then assert the expected text is in the PDF's text layer, because LaTeX can "succeed" and silently drop content (I hit this, see 1.6).

---

## Part 1. Compiling LaTeX to PDF at zero cost

### 1.1 Hosted compile APIs (all tested with curl today)

| Service | Result today | Latency (my tests) | Notes |
|---|---|---|---|
| **LaTeX-On-HTTP**, `POST https://latex.ytotech.com/builds/sync` | Works. pdflatex and xelatex. TeX Live 2026 (`version 2026-04-10-3`) [V] | tiny doc 3.6 s then 1.5 s; Jake's Resume 1.8 s; Awesome-CV xelatex 10.6 s cold then 1.1 s [V] | JSON body `{"compiler":"pdflatex","resources":[{"main":true,"content":"..."},{"path":"x.cls","url":"https://..."}]}`. Returns 201 + PDF. **By default it returns a PDF even when LaTeX hits errors** [V]; pass `"options":{"compiler":{"halt_on_error":true},"response":{"log_files_on_failure":true}}` to get `{"error":"COMPILATION_ERROR","log_files":{...}}` [V]. AGPL-3.0, repo pushed 2026-10-06 [V]. README has no rate limit, retention, privacy, or uptime statements [V]. Docker images exist for self-hosting [V]. |
| **latexonline.cc** `GET /compile?text=...` | Works for tiny doc (16.9 s) [V]. **Jake's Resume fails with HTTP 414 URI Too Long** via GET [V] | 17 s | Text must go in the query string. Multi-file needs a tarball POST to `/data?target=` or a public git URL. Repo last pushed 2024-10 [V]. Not suitable for a resume service. |
| **texlive.net** `POST /cgi-bin/latexcgi` (multipart `filecontents[]`, `filename[]`, `engine`, `return=pdf`) | Works [V]. Responds 301 to `/latexcgi/document_XXXX_NNNNNN.pdf`, then 200 PDF | 2.2 s | The PDF sits at a public URL on their server with a short random name [V]. Fine for learnlatex.org examples, not for personal data. My local DNS failed once on this host, transient. |
| **Overleaf** "open in Overleaf" | Documented at overleaf.com/devs [V] | n/a (manual) | Not a compile API. POST or link to `https://www.overleaf.com/docs` with `snip_uri` (URL or `data:` base64 URL), `encoded_snip`, `snip`, multi-file `snip_uri[]` + `snip_name[]`, `engine` (`pdflatex`/`xelatex`/`lualatex`/`latex_dvipdf`), `main_document` [V]. User must be logged in to his own Overleaf in the browser [S]. Good as a manual "edit by hand" escape hatch: a browser-side form POST with a `data:application/x-tex;base64,...` URL means the resume never touches a public URL. Overleaf has no public compile API for third parties [S]. |

Privacy view: a resume is personal data (name, phone, email, employment history). None of the hosted services publish a retention policy [V for ytotech and latexonline READMEs]. texlive.net writes the PDF to a public path [V]. Use hosted APIs only for templates and debugging, or strip contact lines before sending. [U, judgment]

### 1.2 Client-side WASM

| Option | Status today | Coverage | Verdict |
|---|---|---|---|
| **SwiftLaTeX** (PdfTeX, XeTeX, DviPdfmx wasm) | Repo AGPL-3.0, 2.3k stars, last push 2024-06, last release 2022-02 [V]. Packages fetched on demand from `texlive.swiftlatex.com` / `texlive2.swiftlatex.com`; **both return Cloudflare 522 (origin down) today** [V]. `setTexliveEndpoint()` lets you self-host the file server [V]. | Full TeX Live if you host the file server | Not usable without self-hosting the package server; AGPL. |
| **BusyTeX** (TeX Live 2023 in one wasm: pdftex, xetex, luahbtex, bibtex8, xdvipdfmx) | Active (pushed 2026-08-29), 76 stars [V]. Release assets: `busytex` 50 MB, `texlive-basic.tar.gz` 51 MB, `busytexextra` 465 MB [V]. | Good if you ship the extra bundles | Technically the most complete, but 100 to 500 MB of downloads to the browser. Too heavy for a phone, fine on desktop with caching. [S] |
| **texlive.js** | Last push 2017 [V] | Old pdfTeX, tiny package set | Dead. |
| **LaTeX.js** | Active (2026-09-24), MIT [V] | Translates LaTeX to HTML, not a TeX engine; no arbitrary packages | Good for a live preview, not for the final PDF. [S] |
| **Tectonic in wasm** | No official wasm build [S] | n/a | Not available. |

### 1.3 Tectonic (tested locally with the real binary)

- Latest release `tectonic@0.17.0` (2026-07-27) [V]. Linux `x86_64-unknown-linux-musl` tarball 10.2 MB, **binary 26.4 MB uncompressed, static** [V]. Windows msvc binary 51.5 MB [V].
- Engine is XeTeX plus xdvipdfmx (not pdfTeX) [V by the error message].
- **Jake's Resume as-is fails**: `! Undefined control sequence. l.7 \pdfglyphtounicode` [V]. Patch that worked [V]:
  ```latex
  \usepackage{iftex}\ifPDFTeX\input{glyphtounicode}\pdfgentounicode=1\fi
  ```
  (and delete the standalone `\pdfgentounicode=1` line).
- Packages are downloaded at runtime from the Tectonic bundle and cached [V]. Cache after Jake's Resume: 44 MB (`bundles/` 20 MB, `formats/` 24 MB) [V]. `TECTONIC_CACHE_DIR` moves it [V]. `--only-cached` compiles with no network [V].
- Timings on this Windows laptop [V]: first ever run about 4 min (bundle index plus files, my network), first successful compile 29.7 s, warm 1.7 s, `--only-cached` 0.9 s.
- Text layer with Tectonic is clean (Latin Modern OTF, `uni yes` in pdffonts, text extracts correctly) [V].

**Tectonic inside a Vercel function (recommended primary)** [S, not deployed today]:
1. Build step (local or CI on Linux): run `tectonic --only-cached` once over the master resume and every template you support, producing a cache dir.
2. Ship `bin/tectonic` (26 MB) and `tectonic-cache/` (about 44 MB per template family, more if you add Awesome-CV fonts) via `outputFileTracingIncludes` in `next.config` (Vercel docs say `includeFiles` is not supported in Next.js, use `outputFileTracingIncludes` [V]).
3. At runtime: copy the cache to `/tmp` on cold start if Tectonic needs to write (only `/tmp` is writable on Lambda-style runtimes; a known Tectonic-on-Lambda workaround symlinks cache/config to `/tmp` [S, github.com/tectonic-typesetting/tectonic/discussions/974]), write `main.tex` to a temp dir, `execFile('tectonic', ['--only-cached','-X','compile',...])` with `-Z` untrusted defaults (no shell escape), read the PDF, upload to Supabase Storage, return a signed URL.
4. Expected latency: 1 to 3 s warm, plus a few seconds on cold start. Fits the 300 s Hobby limit with huge margin; even the old 60 s figure is fine. [S]
5. Risks: musl static binary should run on Vercel's Amazon Linux base [S]; fontconfig warning appeared locally but did not matter [V]; if a template needs a package not in the bundled cache, `--only-cached` fails fast, so log the missing file and rebuild the cache. Alternative to bundling: let it fetch on first use into `/tmp` (cold run about 30 s), acceptable within 300 s but slower and depends on the bundle host.

**Tectonic in GitHub Actions (fallback)** [S]:
- App calls `POST /repos/{owner}/{repo}/actions/workflows/{file}/dispatches` with `{"ref":"main","inputs":{"build_id":"<uuid>"}}` using a fine-grained token with Actions write.
- **Public repo caveat:** workflow inputs, logs and artifacts of a public repo are visible to the public (artifacts to any signed-in user). Never pass resume text as an input, never upload it as an artifact, never echo it. Pass only a build id; the job reads the `.tex` from Supabase with a service key stored as a secret and writes the PDF back to a private bucket. [S]
- Use `actions/cache` for the Tectonic cache dir; a pinned binary download from the release. Latency is dominated by runner pickup and setup: roughly 30 to 90 s end to end [S]. The app polls a `builds` row or Supabase Realtime.
- Public-repo Actions minutes are free on standard runners [S].

**Other hosts** [S]: Cloudflare Workers free plan has a 10 ms CPU limit per request [V, developers.cloudflare.com/workers/platform/limits], so TeX cannot run there. Fly.io no longer has a real free tier (trial credit only) [S]. Self-hosting LaTeX-On-HTTP somewhere would cost money. Docker is not available on Vercel functions.

### 1.4 Template compatibility

| Template | pdflatex | Tectonic (XeTeX) | Notes |
|---|---|---|---|
| Jake's Resume (`jakegut/resume`) | ytotech OK [V] | OK after iftex guard [V] | One column, ATS safe, the default choice for an AI engineer. |
| moderncv | OK [S] | OK [S] | Two-column-ish header and date column; parses acceptably with `banking` or `classic` style [U]. |
| AltaCV | OK [S] | OK [S] | Two-column sidebar: avoid for ATS (see 2.3). |
| Awesome-CV | needs XeLaTeX | needs fonts | Via ytotech xelatex, `awesome-cv.cls` from master raised `Package fontspec Error` at cls line 91 and, without halt-on-error, still produced a PDF with **only the header; the whole body was missing** [V]. FontAwesome brand glyphs had no ToUnicode (`uni no`) and the text layer showed junk like "🖂" and "~" for icons [V]. Avoid for ATS submission. |

### 1.5 Recommendation (Part 1)

- **Primary:** Tectonic in a Vercel Node function, bundled cache, `--only-cached`, halt on error, then text-layer assertions. About 1 to 3 s. Zero cost, no third party sees the resume.
- **Fallback:** same binary and cache in GitHub Actions via `workflow_dispatch`, PDF to private Supabase bucket. About 30 to 90 s.
- **Escape hatches:** "Open in Overleaf" button (browser POST with base64 data URL) for manual edits; ytotech only for local development or a template smoke test.
- Spike first: deploy a 20-line route that compiles `tiny.tex` with the bundled binary on Vercel and time it. That is the one unverified link.

### 1.6 Post-compile validation (do this every time) [V lessons]

1. Compile with halt on error (Tectonic halts by default; ytotech needs `halt_on_error`).
2. Extract text (pdf.js or `unpdf` in Node) and assert: name, email, every company name, and every edited bullet's first 30 characters appear. This catches the "PDF built but body vanished" case I reproduced.
3. Assert page count (1 page for most roles, 2 max).
4. Assert no replacement characters (U+FFFD) or private-use glyphs in the text layer.
5. Keep the log; surface overfull hbox warnings as "line too long" hints.

---

## Part 2. Tailoring well and honestly

### 2.1 What ATS parsers actually do

- Greenhouse: parses PDF/DOCX into fields (name, contact, employment, education) to prefill the candidate record; parse can fail and recruiters still see the original file [S, support.greenhouse.io "Unsuccessful resume parse"]. Greenhouse does not auto-reject on keyword score; humans review with scorecards [S, Jobscan, Simplify blog]. Reality check on scale: Anthropic's Greenhouse board lists 638 jobs today [V], so human review is real but fast.
- Workday: "Autofill with resume" parses into "My Experience"; you then correct fields by hand [S]. Workday, iCIMS and Taleo support **knockout screening questions** (work authorization, sponsorship, location, degree) that can auto-disqualify; these matter far more than keyword density [S].
- Lever and Ashby: parse for search and profile prefill, recruiters search by keywords [S]. Several ATS vendors now ship AI match scoring (for example Workday's HiredScore); treat keyword coverage of real requirements as useful, stuffing as harmful [U].
- Practical keyword rule: mirror the JD's exact terms where they are true for you ("PyTorch", "RAG", "LLM evaluation", "Kubernetes"), spell out acronyms once ("Retrieval-Augmented Generation (RAG)"), and put them in context bullets, not a hidden keyword block. [S]

### 2.2 Layout rules

- **One column.** Every major parser reads in row order; sidebars get interleaved with job bullets [S, atsverification.com 2026 tests: Workday 86% single column vs 62% two column, treat numbers as indicative].
- Standard headings: Experience, Education, Skills, Projects, Publications.
- Dates as "Jan 2024 - Present" on the same line as the employer or title.
- No icons for contact info (they become junk text [V]), no text in images, no tables for layout. `\href` links are fine and extract correctly [V].
- Contact info in the body, not in a PDF header/footer region [S].

### 2.3 PDF text layer from LaTeX

- pdfTeX with default OT1 Computer Modern: modern extractors (poppler `pdftotext` 4.00 and `pypdf` 6.19) both extracted "fi", "ff", "ffi" ligatures correctly in my test even without glyphtounicode [V]. Older or cruder parsers can still split them [S], so keep `\input{glyphtounicode}\pdfgentounicode=1` under pdfTeX as cheap insurance, plus `\usepackage[T1]{fontenc}`.
- XeTeX / Tectonic with OpenType fonts emits ToUnicode maps automatically (`uni yes`) [V].
- Optional: `\usepackage{microtype}` with `\DisableLigatures{encoding = *, family = * }` if you want zero ligature risk [S].
- Set PDF metadata: `\hypersetup{pdftitle={Bilal Taha - AI Engineer Resume}, pdfauthor={Bilal Taha}}` [S].
- **File name:** `Bilal-Taha-Resume-<Company>-<Role>.pdf` (ASCII, hyphens, no spaces). Recruiters see the file name; never `resume_final_v7.pdf` [S]. For a German application package: `Bilal-Taha-Lebenslauf.pdf`, `Bilal-Taha-Anschreiben.pdf`, or one merged PDF if the form takes one file [S].

### 2.4 Safe LLM editing of LaTeX (design)

1. **Ingest once.** User pastes master `.tex`. App normalizes the preamble (iftex guard), compiles it, and parses it into a **facts ledger** stored in Postgres:
   - `roles(id, employer, title, start, end, location)`
   - `bullets(id, role_id, latex_src, plain_text, metrics[], skills[])`
   - `skills(id, name, evidence_bullet_ids[])`, `projects`, `education`, `certs`, `publications`.
   The user reviews the ledger once and can add true facts that are not in the resume (extra projects, tools used).
2. **Template, not free text.** Edits happen only inside known macros, for Jake's Resume: `\resumeItem{...}`, `\resumeSubheading{...}{...}{...}{...}` (employer/title/dates are **locked**, not editable), the Skills `\textbf{Languages}{: ...}` lines, and an optional summary line. Everything else in the file is byte-for-byte preserved. Use spans with hashes, not line numbers (the approach LatexO uses, below).
3. **Model output is structured JSON**, not LaTeX: `{ "edits":[{"bullet_id":"b12","new_text":"...","uses_facts":["b12","skill:pytorch"]}], "reorder":[...], "drop":[...], "skills_order":[...], "gaps":[...] }`. With DeepSeek, use JSON mode and validate with zod.
4. **Deterministic checks before compile:**
   - Every number, percentage, money amount and date in `new_text` must appear in the source bullet or ledger (regex extract and compare).
   - Every capitalized tech term or skill must exist in the ledger skills list or the source bullet.
   - No new employers, titles, degrees, or dates (those fields are locked).
   - Escape LaTeX specials (`& % $ # _ { } ~ ^ \`) in model text; reject raw backslashes from the model.
   - Length budget per bullet (for example 1.0 to 1.15x original) so the page count holds.
5. **Gap report instead of invention.** JD requirements with no ledger evidence go into a "gaps" list shown to the user ("JD asks for Rust, ledger has none"). The user may add a true fact to the ledger; the model never fills the gap itself.
6. **Diff view.** Show per-bullet before/after (word diff), keyword coverage before/after, and the compiled PDF side by side. One click accepts all or per bullet. Store each tailored version (`applications.resume_version_id`) so you know exactly what was sent.
7. **Compile and validate** (1.6). On failure, one automatic repair attempt limited to the failing span, then show the error.

### 2.5 Open-source projects and their approaches (checked via GitHub API today)

| Repo | Stars / last push [V] | Approach |
|---|---|---|
| `srbhr/Resume-Matcher` | 28.6k / 2026-10-04 | Local-first resume and cover letter builder with JD matching, many LLM providers. Keyword and similarity matching plus rewrite suggestions. [V repo meta, S approach] |
| `rendercv/rendercv` | 17.7k / 2026-05-01 | Resume as YAML data, rendered to a typeset PDF by a template. The "content as data, layout as code" idea is exactly what makes safe tailoring easy. [V meta, S] |
| `nvmaditya/LatexO` | 1 / 2026-08-19 | Model proposes **typed patches** over hash-identified spans; deterministic code applies them to a staging copy, compiles with no shell escape and no network, allows one repair, binds approval to a diff hash; a new metric or employer not in the doc or user facts triggers a question instead of invention. [V README] Best design reference. |
| `Schiao-Lee/evidence-grounded-cv-tailoring` | 3 / 2026-06-18 | Facts in one `profile.yaml`; "subset rule" (only facts in source) and "gap rule" (missing requirements become explicit gaps); 13 deterministic QA checks: numeric claims trace to source, page count, overfull boxes, pdftotext audits, keyword coverage. [V README] |
| `NoahMustafa/open-resume-agent` | 4 / 2026-06-28 | Markdown playbooks drive an agent; one `profile.json` source of truth; Tectonic compiles; outputs a gap report and ATS score per job; "refuses to invent experience". [V README] |
| `deepdotspace/resume` | 18 / 2026-08-20 | LaTeX templates incl. Jake's and Europass, cloud compile (pdf/xe/lua), per-section JD rewrites "that don't invent facts", version history with PDF snapshots. [V README] |
| `AnalyticAce/myresumo` | 69 / 2026-09-15 | FastAPI + MongoDB, tailors resume and skills to a JD. [V meta] |
| `adongwanai/LLM-Resume-Template` | 468 / 2026-08-12 | LaTeX template aimed at LLM/Agent engineers; useful section ideas for an AI engineer. [V meta] |
| `feder-cr/Jobs_Applier_AI_Agent_AIHawk` | now redirects to `feder-cr/dots` (an AI browser agent) [V] | Former auto-apply bot; an example of what not to build (auto submission, LinkedIn ToS risk). |

Common pattern across the good ones: single source of truth for facts, model edits limited and structured, deterministic verification, compile in a sandbox, human approval.

### 2.6 Regional CV conventions

| Region | Photo | DOB / nationality / marital | Length | Cover letter | Other |
|---|---|---|---|---|---|
| **UAE / Saudi (Gulf)** | Common and often expected, passport style, top right [S, VisualCV, LoopCV, atsverification] | Nationality usually included; DOB, marital status, visa or Iqama status, driving licence commonly included [S] | 2 pages, 3 tolerated for senior [S] | Short cover email common; not always required [U] | Put current location and visa status (for example "Employment visa, transferable") near the top; nationality matters because of Emiratization and Saudization quotas [S]. Notice period and expected salary (AED/SAR, monthly, often with housing/transport split) are routine form fields [S]. |
| **Germany (Lebenslauf)** | Legally optional under the AGG; still common at traditional firms, less so at international tech companies [S] | DOB optional but customary at traditional firms; nationality relevant for work permit [S] | 1 to 2 pages, tabular, reverse chronological [S] | **Anschreiben expected** at most German firms; English-first Berlin startups often skip it [S] | Optional "Ort, Datum, Unterschrift" at the end; Zeugnisse (certificates, references) attached [S]. Write in German unless the job ad is in English [S]. |
| **Netherlands** | Optional, sources split, no legal requirement [S] | Usually omitted [S] | 1 to 2 pages [S] | **Motivation letter (motivatiebrief) read closely**, about one page [S] | Direct, factual tone; mention 30% ruling eligibility or right to work if relevant [S]. |
| **UK** | No photo [S] | Official guidance: **do not include age, date of birth, marital status, or nationality** [V, nationalcareers.service.gov.uk] | 2 pages typical [S] | Cover letter often optional but valued [S] | Short personal statement at the top, tailored [V same page]; right to work stated if needed [S]. |

Implementation: a per-application `region` setting toggles which optional header fields render (photo, DOB, nationality, visa status) from the ledger, and which cover-letter style is drafted. Default for remote and US/UK roles: no photo, no DOB.

---

## Part 3. Application form field extraction and fill help

### 3.1 Per-ATS: can we get the field list without logging in? (live tests today)

**Greenhouse: YES** [V]
- `GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs` (Anthropic: 638 jobs today)
- `GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs/{job_id}?questions=true`
- Response keys: `questions`, `location_questions`, `compliance` (EEOC), `demographic_questions`, `data_compliance`, `content`, etc. Sample from Anthropic job 4461450008:
  ```json
  {"label":"Will you now or will you in the future require employment visa sponsorship...","required":true,
   "fields":[{"name":"question_8581811008","type":"multi_value_single_select",
              "values":[{"label":"Yes","value":1},{"label":"No","value":0}]}]}
  {"label":"Resume/CV","required":true,"fields":[{"name":"resume","type":"input_file"},{"name":"resume_text","type":"textarea"}]}
  {"label":"Why Anthropic?","required":true,"fields":[{"name":"question_8581808008","type":"textarea","values":[]}]}
  ```
  Field types seen: `input_text`, `input_file`, `textarea`, `multi_value_single_select`; docs also define `multi_value_multi_select` [S]. Anthropic also asks an "AI Policy for Application" Yes/No question; the tool should surface its description so the user reads the company's AI guidelines himself [V].
- Embedded boards on company sites use `?gh_jid=` and an iframe from `job-boards.greenhouse.io` [S].

**Lever: YES, from the apply page HTML** [V]
- `GET https://api.lever.co/v0/postings/{company}?mode=json` gives postings with `applyUrl`; **no questions in the postings API** [V].
- `GET https://jobs.lever.co/{company}/{posting_id}/apply` is server-rendered. Standard inputs: `name`, `email`, `phone`, `location`, `org`, `resume`, `urls[LinkedIn]`, `urls[GitHub]`, `urls[Portfolio]`, `comments` [V]. Custom questions are in hidden inputs `cards[{uuid}][baseTemplate]` whose HTML-escaped value is JSON [V]:
  ```json
  {"text":"Work Authorization","fields":[
    {"type":"multiple-choice","text":"Are you legally authorized to work in the country for which you are applying?","required":true,
     "options":[{"text":"Yes"},{"text":"No"}]},
    {"type":"multiple-choice","text":"Will you now or in the future require sponsorship for employment visa status (e.g., H-1B, etc.)?","required":true,...}]}
  ```
  Types seen at Palantir: `multiple-choice`, `multiple-select`, `dropdown`, `text`, `textarea` [V]. The page includes hCaptcha [V], another reason submission stays with the user.

**Ashby: YES** [V]
- Job list: `GET https://api.ashbyhq.com/posting-api/job-board/{org}?includeCompensation=true` (OpenAI: 823 jobs) with `applyUrl` [V]. No form in this API.
- Form: `POST https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobPosting` with
  ```graphql
  query ApiJobPosting($organizationHostedJobsPageName: String!, $jobPostingId: String!) {
    jobPosting(organizationHostedJobsPageName: $organizationHostedJobsPageName, jobPostingId: $jobPostingId) {
      id title applicationForm { id sections { title fieldEntries {
        ... on FormFieldEntry { id field isRequired descriptionHtml } } } } } }
  ```
  (`fieldType` is not a valid field, I got a validation error [V].) Sample entry:
  ```json
  {"field":{"path":"bed95633-...","title":"Are you authorized to work in the country where the job is located?","type":"Boolean"},"isRequired":true}
  ```
  Types seen: `String`, `Email`, `File`, `Phone`, `Location`, `Date`, `Boolean`, `LongText`, `MultiValueSelect` (with `selectableValues`) [V]. Undocumented internal endpoint: may change without notice [S]. EEO survey is a separate form (Firecrawl saw Gender/Race/Veteran on the page) [V].

**Workable: YES, but rate-limited** [V]
- `GET https://apply.workable.com/api/v1/widget/accounts/{subdomain}` lists jobs with `shortcode` [V].
- `GET https://apply.workable.com/api/v1/jobs/{shortcode}/form` returns sections and fields [V]. Hugging Face sample: `firstname`, `lastname`, `email`, `phone`, `resume`, `education`/`experience` groups, `cover_letter`, `CA_10626 "Expected salary" text`, `CA_10627 "Notice period / availability" dropdown`, `CA_10628 "Are you eligible to work..." boolean`, `QA_11844076 "Why Hugging Face..." paragraph (required)`, and one asking whether the first answer starts with an exact phrase from the job ad [V]. That last one is an attention check: the drafting step must read the full JD for instructions like this.
- Cloudflare returns `error code: 1015` (429) to plain curl after a few calls; a browser user agent and 2 to 3 s spacing worked [V]. Fetch from the user's browser (extension) rather than the server when possible.

**Recruitee: YES** [V]
- `GET https://{company}.recruitee.com/api/offers/` returns each offer with `open_questions` (`kind`: `boolean`, `string`, `video`, and others; `required`; `open_question_options`), plus `options_cv`, `options_cover_letter`, `options_phone`, `options_photo` (each `required`/`optional`/`off`) and `locations_question` [V]. Sample (Channable): "How many hours a week are you available to work?" `string`, required; a required 2-minute `video` question [V].

**SmartRecruiters: PARTLY** [V]
- `GET https://api.smartrecruiters.com/v1/companies/{company}/postings` and `/postings/{id}` work without auth [V].
- The Application API config `GET https://api.smartrecruiters.com/postings/{uuid}/configuration` returns `401 Authentication data missing` [V] (needs a partner token).
- But the public apply page `https://jobs.smartrecruiters.com/oneclick-ui/company/{company}/publication/{uuid}` embeds `screeningQuestions` JSON in its server-rendered HTML (labels, `type: select`, options) [V, Bosch sample].

**Teamtailor** [U]: public API needs a company key; career-site apply forms are server-rendered HTML, use Firecrawl or the extension. Not tested.

**Personio** [V partly]: `https://{company}.jobs.personio.de/xml` lists positions (tags: `position`, `jobDescriptions`, `department`, `seniority`, ...) with **no form fields** [V]. Use the page or the extension.

**Workday** [V partly]: `POST https://{tenant}.wd5.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs` with `{"appliedFacets":{},"limit":20,"offset":0,"searchText":"..."}` and `GET .../wday/cxs/{tenant}/{site}{externalPath}` return job details (`jobPostingInfo` keys: `title`, `jobDescription`, `location`, `canApply`, `includeResumeParsing`, ...) [V, NVIDIA]. The application questions are only shown after creating a candidate account and signing in, per tenant [S]. Fill help must happen in the browser.

**Taleo, SAP SuccessFactors, Oracle Recruiting Cloud, iCIMS** [S]: account or session walls, multi-step wizards. Browser-side help only.

### 3.2 Firecrawl on an apply page [V]

- `POST https://api.firecrawl.dev/v2/scrape` on the Ashby application URL with `formats:[{type:"json", schema:{fields:[{label,type,required,options}]}}, "html"]`, `waitFor: 3000`: success in 6.5 s, **5 credits**, 16 fields returned including the EEO radios, plus rendered HTML with 27 inputs [V].
- Quality caveat [V]: the LLM extraction **paraphrased labels** ("Sponsorship Requirement" instead of the exact question), **guessed types** (`Boolean` became `checkbox`), and renamed "When can you start a new role?" to "Start Date". For drafting answers and matching inputs, exact labels matter.
- Use: for ATS without an API, ask Firecrawl for `html` (or `rawHtml`) and parse labels deterministically (`<label for>`, `aria-label`, `aria-labelledby`, `legend` of fieldsets), then use the LLM only to classify each field into the taxonomy below. Workday and other login-walled forms cannot be scraped at all.

### 3.3 Filling fast without the app submitting

**Option A: copy buttons (baseline)** [U]. Application page in Signal Desk shows each question with its drafted answer and a Copy button, in form order. Zero integration risk, works everywhere including Workday. Slower (about 2 clicks per field).

**Option B: bookmarklet** [S]
- Runs in the page; reads `label`/`aria-*` text, matches to drafted answers, sets values.
- Problems: (1) it cannot `fetch` your API from the ATS page if the page's CSP `connect-src` blocks it, so answers must come via clipboard (`navigator.clipboard.readText()` prompts) or a `prompt()` paste of a JSON blob; (2) it cannot reach into **cross-origin iframes** (embedded Greenhouse forms on company sites); (3) React-controlled inputs (Ashby, Workday, Lever's newer pages) ignore `el.value = x`; you must call the native setter and dispatch events:
  ```js
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
  set.call(el, text); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true}));
  ```
  (use `HTMLTextAreaElement.prototype` for textareas). Custom dropdowns (React Select, Workday listboxes) need click sequences.

**Option C: personal unpacked Chrome extension (recommended)** [S]
- Manifest V3, content script with `all_frames: true` on `*.greenhouse.io`, `jobs.lever.co`, `jobs.ashbyhq.com`, `apply.workable.com`, `*.recruitee.com`, `jobs.smartrecruiters.com`, `*.myworkdayjobs.com`, `*.taleo.net`, `*.icims.com`, `*.successfactors.*`, `*.teamtailor.com`, `*.jobs.personio.*`.
- A side panel shows the drafted answers for the current URL (fetched by the extension's service worker from Signal Desk with a personal token; extension fetches are not subject to the page CSP).
- Buttons: "Fill this field", "Fill all standard fields", "Highlight unmatched". Each fill highlights the input; EEO and consent checkboxes are never touched. No code path clicks a submit button (assert this in code: ignore `type=submit` and buttons whose text matches /submit|apply|send/).
- Can also attach the tailored PDF to `input[type=file]` via `DataTransfer` (works on most ATS) [S], or the user drags it in.
- Stays unpacked, never published, so no Chrome Web Store review or privacy policy needed.

**Comparison: Simplify Copilot** [S]: free extension that autofills profile data (contact, education, work history, links, resume) on 100+ ATS including Workday, Greenhouse, Lever, Ashby, iCIMS, Taleo, offers AI answers to open questions and JD keyword gaps; requires a Simplify account where your profile and resume are stored; Simplify says it does not sell personal data to advertisers. Others in this class: Jobright, Teal, LazyApply (the last automates submission and is reported to get LinkedIn accounts restricted) [S]. Your own extension keeps data in your Supabase only and drafts per-job answers with your voice.

**ToS** [S]:
- LinkedIn explicitly prohibits third-party software, including browser extensions, that scrapes, modifies the appearance of, or automates activity on LinkedIn (help article a1341387, User Agreement 8.2) [S]. Do **not** run the extension on `linkedin.com`; for Easy Apply, show copy buttons in Signal Desk only.
- ATS vendors' candidate terms generally prohibit bots and automated submission, and many forms carry hCaptcha/reCAPTCHA (Lever [V]). User-initiated autofill that a human reviews and submits is the norm (password managers, Chrome autofill, Simplify) and is not a practical issue [U, judgment]. Keep it that way: no auto-submit, no bulk applying, no hidden form posts.

### 3.4 Field taxonomy and drafting rules

Store a **candidate profile** (one row) plus per-application overrides.

| Category | Typical labels | Source | Tool behavior |
|---|---|---|---|
| Identity | First, last, preferred name, pronunciation | profile | Fill |
| Contact | Email, phone (E.164 and local formats), city, country, address | profile | Fill; phone format per form |
| Links | LinkedIn, GitHub, portfolio, Google Scholar, Hugging Face | profile | Fill |
| Resume / cover letter | file upload, "paste resume text" | tailored version | Attach PDF, paste plain text from the text layer |
| Work authorization | "Authorized to work in {country}?" | per-country table in profile | Fill per job location; show the country the question refers to |
| Sponsorship | "Now or in the future require sponsorship?" | per-country table | Fill; flag that this is often a knockout |
| Location / relocation / on-site days | "Open to relocation?", "in office 3 days/week?" | profile + job | Draft, user confirms |
| Start date / notice period | "Earliest start", "Notice period" dropdowns | profile (notice in weeks) | Compute a date from today + notice |
| Salary | "Expected salary" with currency, period (monthly in Gulf, annual in EU/US), gross | per-region ranges in profile | Draft from the user's own range; never invent; offer "open to discuss within the posted range" if a range is published |
| Languages | proficiency, CEFR level | profile | Fill |
| Education details | school, degree, field, dates, GPA | ledger | Fill from ledger only |
| Source | "How did you hear about us?" | per application | Fill with the real source (job board, referral name) |
| Prior contact | "Interviewed with us before?", "Know anyone here?" | user | Ask user |
| Legal / consent | arbitration, data processing, AI policy, "I certify true" | none | **Leave to user**, show the text |
| EEO / demographics | gender, race, veteran, disability, pronouns | none | **Leave to user**, never stored by the tool |
| Custom free text | "Why {company}?", "Proudest project", "Experience with X", "Anything else?" | LLM draft | Draft, user edits |

Free-text drafting guidance:
- Inputs: the full JD (including hidden instructions such as "start your answer with the phrase..." [V Workable sample]), company page, the facts ledger, his past approved answers (pgvector retrieval, same as the post-voice cohesion trick already in Signal Desk).
- Answer the actual question in the first sentence; one concrete story with a real metric from the ledger; tie it to one specific thing from the JD; 80 to 150 words unless a limit is given (respect `maxLength`, Workable exposes it [V]).
- Same voice rules as his posts: polished natural English, no em dashes, no buzzword lists.
- Never claim skills, titles, or numbers outside the ledger; if the question asks about something he lacks, draft an honest "adjacent experience" answer and flag it.
- Respect AI-use policies: some employers ask candidates to write answers themselves or state their AI policy (Anthropic's AI Policy question [V], Hugging Face's "write it yourself" wording [V]). Show those notices prominently; for such questions offer bullet-point notes for him to write from rather than a finished paragraph. [U, judgment]

### 3.5 Suggested end-to-end flow [U]

1. User pastes a job URL. Server detects ATS by host and fetches JD + exact questions via the endpoints in 3.1 (Firecrawl HTML fallback; Workday/Taleo marked "fill in browser").
2. Tailor: JSON edits against the ledger, checks, Tectonic compile, text-layer validation, diff view, user accepts.
3. Draft answers per question; classify standard fields from the profile; EEO/consent left blank.
4. User opens the apply page; the extension side panel fills on his clicks; he uploads or the extension attaches the PDF; he reviews and presses Submit.
5. He marks "Submitted" in Signal Desk; store the resume version, answers, and date.

---

## Sources

- Vercel function limits: https://vercel.com/docs/functions/limitations
- Cloudflare Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- LaTeX-On-HTTP: https://github.com/YtoTech/latex-on-http and live API https://latex.ytotech.com/
- latex-online: https://github.com/aslushnikov/latex-online
- texlive.net runner: https://texlive.net/cgi-bin/latexcgi (live test)
- Overleaf open-in API: https://www.overleaf.com/devs
- SwiftLaTeX: https://github.com/SwiftLaTeX/SwiftLaTeX ; BusyTeX: https://github.com/busytex/busytex ; LaTeX.js: https://github.com/michael-brade/LaTeX.js ; texlive.js: https://github.com/manuels/texlive.js
- Tectonic releases: https://github.com/tectonic-typesetting/tectonic/releases ; Lambda discussion: https://github.com/tectonic-typesetting/tectonic/discussions/974 ; TeX Live Lambda layer: https://github.com/serverlesspub/latex-aws-lambda-layer
- Jake's Resume: https://github.com/jakegut/resume ; Awesome-CV: https://github.com/posquit0/Awesome-CV
- Greenhouse Job Board API: https://boards-api.greenhouse.io/v1/boards/anthropic/jobs ; parse failures: https://support.greenhouse.io/hc/en-us/articles/200989175-Unsuccessful-resume-parse
- Lever postings: https://api.lever.co/v0/postings/palantir?mode=json
- Ashby: https://api.ashbyhq.com/posting-api/job-board/openai ; https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobPosting
- Workable: https://apply.workable.com/api/v1/widget/accounts/huggingface ; https://apply.workable.com/api/v1/jobs/{shortcode}/form
- Recruitee: https://channable.recruitee.com/api/offers/
- SmartRecruiters: https://api.smartrecruiters.com/v1/companies/BoschGroup/postings
- Workday cxs: https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/NVIDIAExternalCareerSite/jobs
- Personio XML: https://personio.jobs.personio.de/xml
- ATS parsing (secondary): https://atsverification.com/blog/resume-templates-that-pass-ats-2026/ ; https://www.jobscan.co/blog/greenhouse-ats-what-job-seekers-need-to-know/ ; https://simplify.jobs/blog/debunking-applicant-tracking-system-ats-myths/
- Open-source tailoring repos: https://github.com/srbhr/Resume-Matcher ; https://github.com/rendercv/rendercv ; https://github.com/nvmaditya/LatexO ; https://github.com/Schiao-Lee/evidence-grounded-cv-tailoring ; https://github.com/NoahMustafa/open-resume-agent ; https://github.com/deepdotspace/resume ; https://github.com/AnalyticAce/myresumo ; https://github.com/adongwanai/LLM-Resume-Template
- CV conventions: https://nationalcareers.service.gov.uk/careers-advice/cv-sections ; https://www.visualcv.com/international/uae-resume/ ; https://visualcv.com/international/saudi-arabia-cv ; https://blog.loopcv.pro/gulf-cv-format/ ; https://resumegeni.com/blog/how-to-write-resume-germany ; https://resumegeni.com/blog/how-to-write-resume-netherlands ; https://www.visualcv.com/international/netherlands
- Simplify Copilot: https://help.simplify.jobs/articles/1749022-installing-and-setting-up-copilot ; https://simplify.jobs/privacy
- LinkedIn automation policy: https://www.linkedin.com/help/linkedin/answer/a1341387 ; https://www.linkedin.com/help/linkedin/answer/90586
- Firecrawl v2 scrape (live test, 5 credits)
