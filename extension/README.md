# Signal Desk Agent

A personal Chrome extension. Open it from the toolbar and a side panel appears
next to the page. Tell it what to do ("Apply to this job", "Fill the form on
this page", or anything else) and it works through the page step by step while
you watch: it reads the page, clicks, types, picks options, attaches your
resume and moves through multi-step forms, using your Signal Desk facts,
reviewed answers and cover letter.

What stays with you:

- **Submitting.** Before the final submit it stops and shows what the form
  holds, with anything still blank. Nothing is sent until you press
  **Approve and submit**. A click that looks like a submit, or Enter in a form,
  gets the same stop.
- **Your own fields.** It never touches demographic (EEO), consent,
  attestation, signature, password, card or ID fields.
- **Sign-ins and human checks.** It pauses on password fields and CAPTCHAs; you
  handle them and press Continue. It doesn't create accounts.
- **Money and LinkedIn.** It refuses payment buttons and won't run on
  linkedin.com.
- **Which sites.** It reaches only sites you allow when it asks (or all sites,
  if you choose). No content scripts, nothing up front.

While it works, Chrome shows a "started debugging this browser" bar: that is
how it sends real clicks and keystrokes. Closing that bar, pressing **Stop**,
or closing the panel ends the run. `node scripts/check-extension.mjs` checks
these promises against the code.

## Install

1. Set `EXTENSION_TOKEN` in `.env.local` and in Vercel (see
   [docs/setup.md](../docs/setup.md)), and redeploy.
2. In Chrome, open `chrome://extensions`, turn on **Developer mode**, choose
   **Load unpacked** and pick this `extension/` folder. If you had the older
   Signal Desk Fill loaded, press its reload button instead.
3. Click the toolbar button to open the panel, then the gear: enter your
   Signal Desk address and the token, and allow that address when Chrome asks.

## Use

1. Open the job post or application form, then the panel. If Signal Desk
   knows the job, the panel picks it; otherwise choose it from the list (jobs
   with a draft application are there).
2. Press **Apply to this job**, or type a task. Allow the site when asked.
3. Answer its questions in the panel when it needs something it doesn't know.
   **Pause** and **Stop** are under the log.
4. Read the approval card and press **Approve and submit**, or **Not yet** with
   what to change. After a confirmed submit it marks the job submitted in
   Signal Desk.
