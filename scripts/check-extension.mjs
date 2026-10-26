// Guards the promises the browser agent in extension/ makes: the final submit
// waits for his Approve unless he picked Auto-submit for the run, "Fill for
// review" never clicks it, secrets are never typed, demographic questions only
// get a decline, sign-ins and human checks go to him, nothing is paid for,
// LinkedIn is off limits, and the only script it puts in pages on its own is
// the bridge on Signal Desk's own origins.
// Run: node scripts/check-extension.mjs
import { readFileSync } from "node:fs";

const dir = new URL("../extension/", import.meta.url);
const read = (f) => readFileSync(new URL(f, dir), "utf8");
// Comments may describe what it won't do; only the code counts.
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const panel = strip(read("panel.js"));
const page = strip(read("page.js"));
const manifest = JSON.parse(read("manifest.json"));
const failures = [];
const check = (ok, message) => ok || failures.push(message);

// Each action's branch inside perform(), where the page is actually touched.
const perform = panel.slice(panel.indexOf("async function perform("), panel.indexOf("// ---------- The run"));
const caseBody = (name) => {
  const start = perform.indexOf(`case "${name}":`);
  if (start < 0) return "";
  const end = perform.indexOf("case ", start + 8);
  return perform.slice(start, end < 0 ? undefined : end);
};

// The submit gate.
check(/info\.submitLike\)\s*return approveSubmit/.test(caseBody("click")), "a click on a submit-looking button skips the approval");
check(/return approveSubmit/.test(caseBody("submit")), "the submit action skips the approval");
const approve = panel.slice(panel.indexOf("async function approveSubmit"), panel.indexOf("async function clickAt"));
const review = approve.slice(approve.indexOf('run.mode === "review"'), approve.indexOf("if (run.auto)"));
const auto = approve.slice(approve.indexOf("if (run.auto)"), approve.indexOf("await waitFor("));
const watch = approve.slice(approve.indexOf("await waitFor("));
check(approve.includes('run.mode === "review"') && !review.includes("clickAt("), "Fill for review clicks the submit");
check(auto.includes("clickAt(") && approve.indexOf("clickAt(") > approve.indexOf("if (run.auto)"), "approveSubmit clicks outside the auto-submit branch");
check(watch.indexOf('value !== "yes"') >= 0 && watch.indexOf('value !== "yes"') < watch.indexOf("clickAt("), "approveSubmit clicks before checking his answer");
check(/const auto = mode === "auto"/.test(panel), "auto-submit isn't tied to the mode he picked");
check(/enterRisk/.test(caseBody("key")) && /enterRisk/.test(caseBody("type")), "Enter can submit a form without the approval");
check(!/\.(requestSubmit|submit)\s*\(/.test(page + panel), "the extension submits a form directly");

// Fields that are his, payments, sign-ins and human checks.
for (const name of ["type", "select", "check"]) check(/hisRefusal\(info, action\)/.test(caseBody(name)), `the ${name} action ignores fields that are his`);
const his = panel.slice(panel.indexOf("function hisRefusal"), panel.indexOf("async function approveSubmit"));
check(/info\.his === "secret"[^\n]*return refused/.test(his), "secret fields can be filled");
check(/info\.his === "demographic"\)/.test(caseBody("select")) && /declineOnly && !DECLINE\.test/.test(page), "demographic questions can get a real answer");
check(/info\.pay\)\s*return refused/.test(caseBody("click")) && /info\.pay\)\s*return refused/.test(caseBody("submit")), "payments aren't refused");
check(/password/.test(page) && /cc-/.test(page) && /gender/.test(page) && /consent/.test(page), "page.js no longer marks passwords, cards, demographics or consent as his");
check(/flags\.password/.test(panel) && /flags\.captcha/.test(panel), "the panel no longer hands sign-ins and human checks to him");
check(/recaptcha\|hcaptcha\|turnstile/.test(page), "page.js no longer spots CAPTCHAs");
// Human checks and passwords wait for him; the only sign-in it does alone is the site's Google or LinkedIn button.
const gates = panel.slice(panel.indexOf("page.flags.captcha"), panel.indexOf("/api/public/ext/step\""));
check(/waitForHim/.test(gates.slice(0, gates.indexOf("page.flags.password"))), "a CAPTCHA no longer waits for him");
check(/flags\.sso/.test(gates) && /Never type a password/.test(gates) && /waitForHim/.test(gates.slice(gates.indexOf("page.flags.password"))), "a password form no longer waits for him");
check(/waitForHim/.test(caseBody("handoff")), "the handoff action no longer waits for him");
check(/captchaFrames\?\.has\(target\.frameId\)/.test(panel) && /CAPTCHA_HOST\.test/.test(panel), "the agent can click inside a CAPTCHA frame");
// Tabs he opens himself are his: only a tab opened right after the agent's own action is followed.
check(/run\.lastAct/.test(panel.slice(panel.indexOf("tabs.onCreated"), panel.indexOf("tabs.onRemoved"))), "the agent follows any new tab, including his");

// Where it may go.
check(/linkedin\\\.com/.test(panel), "panel.js no longer refuses linkedin.com");
check(/LINKEDIN\.test/.test(caseBody("navigate")), "navigate can open LinkedIn");

// What Chrome lets it reach.
const json = JSON.stringify(manifest);
const DESK = /^(https:\/\/linkedin-post-generator-eight-rosy\.vercel\.app|http:\/\/localhost)\/\*$/;
check((manifest.content_scripts ?? []).every((c) => c.js.join() === "bridge.js" && c.matches.every((m) => DESK.test(m))), "the manifest injects scripts beyond the bridge on Signal Desk");
check(!/querySelector|innerText|\.value\b|\.forms\b/.test(strip(read("bridge.js"))), "bridge.js reads the page");
// Queued runs open job sites with nobody there to grant access, so http(s) sites are allowed up front.
check((manifest.host_permissions ?? []).every((h) => h === "https://*/*" || h === "http://*/*"), "the manifest asks for unusual host permissions");
check(!json.includes("<all_urls>"), "the manifest asks for <all_urls>");
check(!/linkedin\.com/i.test(json), "the manifest mentions LinkedIn");
check(!(manifest.permissions ?? []).some((p) => ["tabs", "webRequest", "cookies", "history", "downloads", "management"].includes(p)), "the manifest asks for a broad permission");

if (failures.length) {
  console.error(`Extension check failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("Extension check passed.");
