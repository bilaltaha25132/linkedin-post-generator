# Data model and jobs (proposed)

New tables, each owned by a domain folder in `src/lib/<domain>/` with the usual
`queries.ts` / `actions.ts` split. Migrations continue from `0019`. Embeddings
use the existing 1024-dim Gemini model.

## Career

Built in `0020_jobs.sql` as `job_sources`, `job_profile` and `jobs`; that file
is the source of truth. It differs from the sketch below: one `job_sources`
table holds company boards and job boards (`kind`, `token`, `region`, pull
health), `job_profile.regions` is an ordered list, and `jobs` adds `region`,
`nationals_only` and `visa_flag`.

```sql
companies (
  id uuid pk, name text, domain text,
  ats text check (ats in ('ashby','greenhouse','lever','workable','smartrecruiters','recruitee')),
  board_token text, tier text,            -- seeded | discovered | added
  last_pulled_at timestamptz, last_ok boolean,
  unique (ats, board_token)
)

job_profile (                              -- single row
  id int pk default 1, titles text[], must_have text[], nice_to_have text[],
  locations text[], min_pay int, seniority text, dealbreakers text[],
  summary text, embedding vector(1024), updated_at timestamptz
)

jobs (
  id uuid pk, source text, source_id text, company_id uuid null,
  company text, title text, location_raw text, countries text[],
  remote_scope text,                      -- worldwide|region|country|onsite|unknown
  employment_type text, is_contract boolean,
  pay_min int, pay_max int, currency text,
  url_apply text, url_source text, source_credit text,
  posted_at timestamptz, first_seen_at timestamptz, last_seen_at timestamptz,
  missed_pulls int default 0, closed_at timestamptz,
  description_md text, embedding vector(1024),
  dedup_key text, score int, score_detail jsonb,
  status text default 'new',              -- new|saved|applied|interviewing|offer|closed|hidden
  notified_at timestamptz,
  unique (source, source_id)
)

leads (
  id uuid pk, kind text,                  -- hiring_post|client_post|gig|contract_role|recruiter_message
  source text, url text unique, activity_id text, posted_at timestamptz,
  who text, wants text, stack text[], region text, remote text, budget text,
  snippet text, score int, score_detail jsonb, opener text,
  status text default 'new',              -- new|contacted|talking|won|lost|hidden
  nudge_at timestamptz, notified_at timestamptz, created_at timestamptz
)
```

## Apply kit

Resume, ledger, candidate profile, resume versions and applications: see
[apply.md](apply.md#data). `jobs` also gains
`visa_flag text` (likely|possible|unlikely|unknown), `region text`,
`nationals_only boolean`, `pay_period text` (month|year).

## Email bridge

```sql
inbound_emails (
  id uuid pk, gmail_id text unique, sender text, subject text,
  received_at timestamptz, body_text text,   -- tracking tokens stripped before insert
  kind text, parsed_at timestamptz, parse_count int, error text
)

engagement_events (
  id uuid pk, email_id uuid references inbound_emails, kind text,  -- comment|reaction|mention|profile_view|follower|post_perf
  actor_name text, preview text, post_url text, occurred_at timestamptz
)

weekly_stats (week date pk, search_appearances int, found_by text[])
```

Job alert cards go straight into `jobs` with `source = 'linkedin_alert'` and
`source_id` = the LinkedIn job ID; application updates move `jobs.status`.
InMail previews and invitations land in `leads` (kind `recruiter_message`) and
`connections` (status `incoming`).

## Grow

```sql
watch_people (
  id uuid pk, name text, profile_url text, kind text,   -- person|company
  tier text,                                            -- A|B|C|target|warm
  topics text[], notes text, last_visited_at timestamptz, confirmed boolean
)

captured_posts (
  id uuid pk, url text unique, activity_id text, posted_at timestamptz,
  author_name text, author_id uuid null references watch_people,
  text text, via text,                    -- share|bookmarklet|paste|search
  matched_discovery_id uuid null, embedding vector(1024), created_at timestamptz
)

comment_drafts (
  id uuid pk, captured_post_id uuid references captured_posts on delete cascade,
  shape text, body text, rubric jsonb, edited_body text,
  posted_at timestamptz null              -- set when Bilal logs it as posted
)

connections (                             -- suggestions and his logged actions
  id uuid pk, name text, profile_url text, reason text, source text,
  note_draft text, status text,           -- suggested|incoming|sent|accepted|talking|ignored
  created_at timestamptz, updated_at timestamptz
)

pillars (id uuid pk, name text, description text, target_share real, embedding vector(1024))
```

## Analytics and publishing

```sql
linkedin_posts (                          -- every post he published, from any source
  id uuid pk, post_id uuid null references posts,       -- our draft, when matched
  urn text unique, url text, published_at timestamptz,
  text text, format text, pillar_id uuid null, hook_type text
)

post_metrics (                            -- one row per post per import
  linkedin_post_id uuid references linkedin_posts, imported_at timestamptz,
  impressions int, reached int, reactions int, comments int, reposts int,
  saves int, sends int, profile_views int, followers_gained int
)

account_daily (day date pk, impressions int, engagements int, new_followers int, total_followers int)
audience_snapshot (imported_at timestamptz, kind text, label text, share real)  -- titles, locations, …

-- built (0019_linkedin.sql), with posts.linkedin_urn and the private `outbox` bucket
linkedin_auth (id int pk default 1, person_urn text, name text, token text,
  scope text, expires_at timestamptz, connected_at timestamptz)
-- token AES-GCM encrypted with TOKEN_ENCRYPTION_KEY; never sent to the browser

schedule (
  id uuid pk, post_id uuid references posts, run_at timestamptz,
  format text, approved_at timestamptz, published_at timestamptz,
  urn text, error text
)
```

`posts.status` gains `scheduled`. Imports are idempotent: re-uploading the same
export upserts by URN and day.

## Cron endpoints

All under `/api/public/cron/*`, bearer-protected with `CRON_SECRET`, each with
a time budget well under Vercel's limit (300 s on Hobby with Fluid compute), triggered from GitHub Actions (free on a
public repo):

| Endpoint | Schedule | Work |
|---|---|---|
| `monitor` (exists) | hourly light, daily full | the wire; now also feeds Today's topics |
| `jobs` | hourly at :07 | a round-robin slice of boards and feeds, score new jobs, alert 80+ |
| `jobs?mode=discover` | weekly | yc-oss company discovery, ATS detection |
| `leads` | 3x a day | Tavily/Exa queries, Reddit, HN, Freelancer.com; classify, alert 75+ |
| `publish` | every 10 min | publish approved, due rows in `schedule` |
| `digest` | daily 9am PKT, weekly Monday | jobs/leads digest; weekly report |
| `ingest/email` | pushed by his Apps Script every 10-15 min | parse LinkedIn emails (not a cron; HMAC instead of the bearer) |

## New secrets (names only)

`LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY`,
`TAVILY_API_KEY`, `EXA_API_KEY`, `JSEARCH_API_KEY` (or `SERPAPI_API_KEY`),
`REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `EMAIL_INGEST_SECRET` (the
HMAC key shared with the Apps Script), `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`,
`EXTENSION_TOKEN` (the Chrome extension's personal token). All free tiers, all in `.env.local`
and Vercel, never committed.

## LLM budget

DeepSeek calls added per day, at steady state: ~30-60 job scorings (after
regex and embedding filters), ~20-40 lead classifications, ~5-15 comment
drafts, 1 weekly report, a few profile and strategy calls. Small next to the
wire's scoring, and the scoring work runs in the off-peak window where possible.
