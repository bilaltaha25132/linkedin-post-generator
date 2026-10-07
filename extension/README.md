# Signal Desk Fill

A personal Chrome extension. On a job application form, it shows the answers
you already reviewed on that job's Apply kit page in Signal Desk, and types one
into the form when you press **Fill**. You check the form, attach your PDF and
press Submit yourself.

What it won't do:

- click anything, submit a form, or press keys;
- fill file uploads, or consent, demographic (EEO) and certification questions;
- run on linkedin.com, or on any page you haven't opened it on (it uses
  `activeTab`, with no content scripts and no access to sites up front).

`node scripts/check-extension.mjs` checks these promises against the code.

## Install

1. Set `EXTENSION_TOKEN` in `.env.local` and in Vercel (see
   [docs/setup.md](../docs/setup.md)), and redeploy.
2. In Chrome, open `chrome://extensions`, turn on **Developer mode**, choose
   **Load unpacked** and pick this `extension/` folder.
3. Open the extension, choose **Settings**, enter your Signal Desk address and
   the token, and allow access to that address when Chrome asks.

## Use

1. On Signal Desk, open the job's **Apply kit**, read the form, and review the
   drafted answers.
2. Open the employer's application form, then the extension. Press **Fill** per
   answer, or **Fill everything I can**.
3. Fields it can't place say so; fill those by hand. Check every field before
   you submit.
