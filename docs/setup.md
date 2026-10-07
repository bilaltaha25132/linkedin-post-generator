# Setup

## 1. Install

```
npm install
```

`.env.local` already holds the Firecrawl key, the Gemini embeddings key, and
generated secrets (`APP_PASSWORD`, `AUTH_SECRET`, `CRON_SECRET`). Your login
passphrase is `APP_PASSWORD` in that file.

Add your **DeepSeek** key (powers writing + scoring): get one at
[platform.deepseek.com](https://platform.deepseek.com) → API keys, and paste it
into `.env.local`:

```
LLM_API_KEY=sk-...your DeepSeek key...
```

## 2. Create the Supabase project (free)

1. Sign in at [supabase.com](https://supabase.com) → **New project**. Save the
   database password.
2. In the project: **Settings → API**, copy the **Project URL** and the
   **`service_role`** key (not the anon key).
3. Put them in `.env.local`:

   ```
   SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<service-role key>
   ```

4. Open **SQL Editor** and run each file in `supabase/migrations/` in order
   (`0001_init.sql`, then `0002_seed_sources.sql`). `0001` enables `pgvector`,
   creates the tables, and adds the `match_*` functions.

   Or set `SUPABASE_DB_URL` and run `node --env-file=.env.local scripts/migrate.mjs`,
   which applies them all (they're idempotent). The direct `db.<ref>.supabase.co`
   host is IPv6-only; on an IPv4-only network use the **Session pooler** URI from
   Supabase → Connect instead (user `postgres.<ref>`, host
   `aws-0-<region>.pooler.supabase.com`, port 5432).

## 3. Load your voice

```
node --env-file=.env.local scripts/import-voice.mjs
```

This embeds your portfolio `blog.ts` + `work.ts` and anything in
`voice-corpus/`, and fills the `voice_corpus` table. Re-run whenever you add
writing. If your portfolio lives elsewhere, set `PORTFOLIO_DATA_DIR`.

### Optional: a licensed slide font

Carousels render in Season Sans when it has been uploaded to the private
`brand` bucket, otherwise in Inter Tight. The font never goes in git:

```
node --env-file=.env.local scripts/upload-brand-font.mjs path/to/font.woff2
```

### Optional: publishing to LinkedIn

Create the LinkedIn developer app and add `LINKEDIN_CLIENT_ID`,
`LINKEDIN_CLIENT_SECRET` and `TOKEN_ENCRYPTION_KEY`
([growth/linkedin-setup.md](growth/linkedin-setup.md)), then **Settings →
Connect LinkedIn**. Locally, run the dev server on port 3000: that's the only
localhost callback registered with LinkedIn.

Scheduled posts are sent by `.github/workflows/publish.yml` every 10 minutes,
with the same `APP_URL` and `CRON_SECRET` secrets as the other workflows.
GitHub can start scheduled runs late, so a post goes out within about 10 to 20
minutes of its time.

## 4. Run

```
npm run dev
```

Open the local URL, sign in with `APP_PASSWORD`, and hit **Scan now** on the
feed to pull the first batch.

## 5. Deploy (Vercel, free)

1. Push to a GitHub repo and import it at [vercel.com](https://vercel.com).
2. Add every var from `.env.local` under **Settings → Environment Variables**.
3. Deploy. Note the production URL.

## 6. Schedule monitoring (GitHub Actions, free)

Vercel Hobby cron only runs once a day, so `.github/workflows/monitor.yml`
drives it instead. In the GitHub repo, **Settings → Secrets and variables →
Actions**, add:

- `APP_URL` — your Vercel production URL (no trailing slash)
- `CRON_SECRET` — the same value as in `.env.local`

The workflow runs every 6 hours; trigger it manually from the **Actions** tab to
test. It calls `/api/public/cron/monitor` with the bearer token.

`.github/workflows/jobs.yml` uses the same two secrets. It calls
`/api/public/cron/jobs` every hour, and once a day at 04:00 UTC with
`?digest=1` for the email digest. Optional tuning in Vercel: `JOBS_MAX_SOURCES_PER_RUN`
(24), `JOBS_MAX_SCORED_PER_RUN` (30), `JOBS_ALERT_MIN_SCORE` (80),
`JOBS_DIGEST_MIN_SCORE` (60), `JOBS_BUDGET_MS` (200000).
