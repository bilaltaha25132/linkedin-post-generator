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
