# Connecting LinkedIn (one-time setup Bilal does)

What this unlocks: publishing and scheduling posts from Signal Desk (Phase 5).
Nothing else; the self-serve API can't read analytics or the feed (see
[data-and-rules.md](data-and-rules.md)). About 15 minutes.

We never create accounts for Bilal, and the client secret never goes in chat,
in the repo, or in a URL.

## 1. A LinkedIn Page (if he has none)

Every developer app must be tied to a Page that he admins.

1. LinkedIn → **For Business** → **Create a Company Page** → *Company*.
2. Name: his studio or brand name (for example "Bilal Taha AI"). Don't use
   "LinkedIn" or "In" in it. Add a logo and a one-line description.

## 2. The developer app

1. Open <https://www.linkedin.com/developers/apps> → **Create app**.
2. App name: `Signal Desk` (again, no "Linked" or "In"). LinkedIn Page: the
   Page from step 1. Privacy policy URL: optional for now. Logo: any square image.
3. Accept the API terms, create.
4. **Settings** tab → **Verify** next to the Page → open the generated link
   while logged in as the Page admin → **Verify**.
5. **Products** tab → request both (they're self-serve and approved instantly):
   - **Sign In with LinkedIn using OpenID Connect** (scopes `openid profile email`)
   - **Share on LinkedIn** (scope `w_member_social`)
6. **Auth** tab → **Authorized redirect URLs** → add both:
   - `https://<his-app>.vercel.app/api/linkedin/callback` (the `APP_URL` value)
   - `http://localhost:3000/api/linkedin/callback` (local development)
7. On the same tab, check that the scopes listed are `openid`, `profile`,
   `email`, `w_member_social`.

Do **not** add any other product to this app. If he ever applies for the
Community Management API, that must be a separate, new app
([unlocks.md](unlocks.md#3-the-official-upgrade)).

## 3. Put the keys where the app reads them

From the **Auth** tab, copy the **Client ID** and **Primary Client Secret**.

1. In `.env.local` (git-ignored), add:

   ```
   LINKEDIN_CLIENT_ID=...
   LINKEDIN_CLIENT_SECRET=...
   TOKEN_ENCRYPTION_KEY=...   # 32 random bytes, base64
   ```

   Generate the encryption key with
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
2. Vercel → Project → Settings → Environment Variables: add the same three
   for Production (and Preview if used), then redeploy.
3. Tell Claude "LinkedIn keys are in". The Client ID is fine to share; the
   secret and the encryption key are not, and never need to be.

## 4. Connect

Settings → **Connect LinkedIn** → LinkedIn's consent screen → **Allow**. The
app stores the token encrypted, server-side only. Tokens last 60 days and
self-serve apps get no refresh token, so from day 55 every page shows a
reconnect notice (one click while he's logged into LinkedIn).

Then every unposted card has **Publish**: it opens a confirm step (with
"Attach the carousel" when the post has one), and only **Publish to LinkedIn**
sends it. The card then moves to Posted with a link to the live post.

If Settings shows "LinkedIn said: …redirect_uri…", the URL the app is running
on isn't in the app's Authorized redirect URLs (step 2.6).

## Other keys the plan uses (all free, all his own accounts)

| Key | Where | Needed for |
|---|---|---|
| `TAVILY_API_KEY` | tavily.com | Leads (Phase 3) |
| `EXA_API_KEY` | exa.ai | Leads (Phase 3) |
| `SERPAPI_API_KEY` | serpapi.com (free, 250 searches a month) | Google Jobs for Saudi, the Gulf, Europe, PK (Phase 1) |
| `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` | developer.adzuna.com | Ten European countries (Phase 1) |
| `EXTENSION_TOKEN` | random string, pasted into the extension's options | Apply kit fill helper (Phase 1.5) |
| `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` | reddit.com/prefs/apps, "script" app | Leads (Phase 3) |
| `EMAIL_INGEST_SECRET` | random string, also pasted into the Apps Script's Script Properties | Email bridge (Phase 0.5) |

`FIRECRAWL_API_KEY` already exists. Each goes in `.env.local` and Vercel, never
in chat or git.
