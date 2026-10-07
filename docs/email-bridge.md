# Email bridge

LinkedIn already emails you job alerts, comments on your posts, new posts from
people you follow, invitations and messages. The bridge forwards those emails
from your Gmail to Signal Desk, which turns them into job cards, Engage items,
Network entries and leads. Nothing logs in to LinkedIn and nothing is scraped.

```
LinkedIn ─email─> Gmail (filter adds label li/inbox)
                    │ Apps Script on your account, every 10 minutes,
                    │ HMAC-signed POST, then labels the thread li/sent
                    ▼
        /api/public/ingest/email ─> inbound_emails (raw, unique Gmail ID)
                    │ src/lib/email/parse.ts (sender + subject, /jobs/view/ links)
                    ▼
  jobs · engagement_events · captured_posts · connections · leads · weekly_stats
```

## Set it up (about 10 minutes)

1. **Secret.** Generate one and add it as `EMAIL_INGEST_SECRET` in `.env.local`
   and in Vercel (Production), then redeploy:
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. **Gmail filter.** Gmail → Settings → Filters → Create a filter.
   From: `(linkedin.com) -from:security-noreply@linkedin.com`. Choose
   *Apply the label* → new label `li/inbox`. Leave *Skip the inbox* off if you
   still want to see them.
3. **Apps Script.** Go to [script.google.com](https://script.google.com) → New
   project. Paste [`scripts/gmail-bridge.gs`](../scripts/gmail-bridge.gs) over
   the default code and save.
4. **Properties.** Project Settings → Script Properties: add `APP_URL` (your
   Vercel URL, no trailing slash) and `EMAIL_INGEST_SECRET` (the same value).
5. **Run it once.** Select `forwardLinkedInEmails` and click Run. Google shows
   an "unverified app" screen because the script is yours alone: Advanced →
   Go to project → Allow. Then run `installTrigger` once; it checks every 10
   minutes from then on.
6. **Turn on the emails** listed on Settings → Email bridge in LinkedIn's
   notification settings, and set a job alert or two in LinkedIn's job search.

Settings → Email bridge shows the last emails received and any that didn't
parse.

## Rules

- Links from emails are never opened or fetched. They are stored cleaned of
  tracking and login parameters (`trackingId`, `midToken`, `otpToken` and
  others; see `cleanLinkedInUrl` in `src/lib/links/deep.ts`).
- Security emails (sign-in codes, password resets) are excluded by the filter
  and again by the script.
- Raw emails are kept so the parsers can be re-run when LinkedIn changes a
  template. A known sender that parses to nothing is flagged on Settings.
- A job-alert email whose layout no longer matches falls back to the utility
  model, and every job ID it returns must appear in the email.
