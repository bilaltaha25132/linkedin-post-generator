// Guards the promises the browser agent in extension/ makes: the final submit
// waits for his Approve, fields that are his are never typed into, sign-ins and
// human checks go to him, nothing is paid for, LinkedIn is off limits, and it
// only reaches sites he allows.
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
check(approve.indexOf('value !== "yes"') > 0 && approve.indexOf('value !== "yes"') < approve.indexOf("clickAt("), "approveSubmit clicks before checking his answer");
check(/enterRisk/.test(caseBody("key")) && /enterRisk/.test(caseBody("type")), "Enter can submit a form without the approval");
check(!/\.(requestSubmit|submit)\s*\(/.test(page + panel), "the extension submits a form directly");

// Fields that are his, payments, sign-ins and human checks.
for (const name of ["type", "select", "check"]) check(/info\.his\)\s*return refused/.test(caseBody(name)), `the ${name} action ignores fields that are his`);
check(/info\.pay\)\s*return refused/.test(caseBody("click")) && /info\.pay\)\s*return refused/.test(caseBody("submit")), "payments aren't refused");
check(/password/.test(page) && /cc-/.test(page) && /gender/.test(page) && /consent/.test(page), "page.js no longer marks passwords, cards, demographics or consent as his");
check(/flags\.password/.test(panel) && /flags\.captcha/.test(panel), "the panel no longer hands sign-ins and human checks to him");
check(/recaptcha\|hcaptcha\|turnstile/.test(page), "page.js no longer spots CAPTCHAs");

// Where it may go.
check(/linkedin\\\.com/.test(panel), "panel.js no longer refuses linkedin.com");
check(/LINKEDIN\.test/.test(caseBody("navigate")), "navigate can open LinkedIn");

// What Chrome lets it reach.
const json = JSON.stringify(manifest);
check(!manifest.content_scripts, "the manifest injects content scripts into pages");
check(!(manifest.host_permissions ?? []).length, "the manifest asks for host permissions up front");
check(!json.includes("<all_urls>"), "the manifest asks for <all_urls>");
check(!json.toLowerCase().includes("linkedin"), "the manifest mentions LinkedIn");
check(!(manifest.permissions ?? []).some((p) => ["tabs", "webRequest", "cookies", "history", "downloads", "management"].includes(p)), "the manifest asks for a broad permission");

if (failures.length) {
  console.error(`Extension check failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("Extension check passed.");
