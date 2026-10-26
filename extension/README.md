# Signal Desk Agent

A personal Chrome extension: the agent behind Signal Desk's **Agentic Apply**.
It reads the page, clicks, types, picks options, attaches your resume and moves
through multi-step forms, using your Signal Desk facts, reviewed answers and
cover letter. Start it two ways:

- **From Signal Desk.** Press **Agentic Apply** on a job, or **Agentic Apply to
  recent** on Jobs, pick a mode, check the details it will type and whether
  to tailor your resume to each job, and press Start. The first time, it
  connects itself. An agent window docks on the right and works through the jobs one
  tab at a time. Each run shows up under **Applications**.
- **From the toolbar.** The side panel opens next to the page; tell it what to
  do ("Apply to this job", "Fill the form on this page", or anything else) and
  it works while you watch.

## The two modes

- **Fill for review** (the default). It fills every page of the form and
  attaches your resume, then stops at the final submit without clicking it.
  The tab stays open, and the run reads "Ready for you to submit". Check it,
  send it, then press **I submitted it** on Applications.
- **Auto-submit.** It clicks the final submit itself and checks for a
  confirmation; the job moves to Applied.

From the toolbar panel the final submit always waits for your **Approve and
submit** on a card listing what the form holds.

## What stays with you

- **Secrets.** It never types passwords, card numbers, bank details or ID
  numbers. The one sign-in it does alone is a site's "Continue with Google"
  button (LinkedIn's if there's no Google one), which can create an account
  on that site through your Google account.
- **Demographic questions** only ever get a "prefer not to say" option.
- **Consent boxes** are ticked only in runs you queued from Agentic Apply;
  from the toolbar panel they are left to you.
- **Passwords, codes and human checks.** In a queued run it waits, marked
  "Waiting for you" on the Agentic Apply button and Applications: press
  **Show me the tab**, do your part, then **I've done it, carry on** (or
  **Skip this job**). After 20 minutes with no answer it moves on and marks
  the job "Needs you". From the toolbar panel it pauses for you to press
  Continue.
- **Money and LinkedIn.** It refuses payment buttons and won't work on
  linkedin.com pages; a LinkedIn sign-in popup waits for you to confirm it.

Queued runs open job sites with nobody there to click "allow", so the
extension has access to http(s) sites up front. The only script it puts in a
page on its own is `bridge.js`, on Signal Desk's own address, which passes
messages between Signal Desk and the extension and reads nothing.

While it works, Chrome shows a "started debugging this browser" bar: that is
how it sends real clicks and keystrokes. Closing that bar, pressing **Stop**,
or closing the agent window ends the run. `node scripts/check-extension.mjs`
checks these promises against the code.

## Install

1. Set `EXTENSION_TOKEN` in `.env.local` and in Vercel (see
   [docs/setup.md](../docs/setup.md)), and redeploy.
2. In Chrome, open `chrome://extensions`, turn on **Developer mode**, choose
   **Load unpacked** and pick this `extension/` folder. If it's already loaded,
   press its reload button after every update.
3. Open Signal Desk and press **Agentic Apply**: it connects the extension
   with your address and token. (Or set them by hand under the panel's gear.)
