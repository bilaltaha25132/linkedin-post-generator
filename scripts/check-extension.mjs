// Guards the promises the Chrome extension makes: it never clicks or submits,
// never runs on LinkedIn, and only reaches pages he opens it on.
// Run: node scripts/check-extension.mjs
import { readFileSync } from "node:fs";

const dir = new URL("../extension/", import.meta.url);
const js = readFileSync(new URL("popup.js", dir), "utf8");
const manifest = JSON.parse(readFileSync(new URL("manifest.json", dir), "utf8"));
const failures = [];
const check = (ok, message) => ok || failures.push(message);

// Comments may describe what it won't do; only the code counts.
const code = js.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
check(!/\.click\s*\(/.test(code), "popup.js calls .click()");
check(!/\.(requestSubmit|submit)\s*\(/.test(code), "popup.js submits a form");
check(!/dispatchEvent\(\s*new\s+(MouseEvent|PointerEvent|SubmitEvent)/.test(code), "popup.js dispatches mouse or submit events");
check(!/KeyboardEvent/.test(code), "popup.js synthesises key presses");
check(/linkedin\\.com/.test(code), "popup.js no longer refuses linkedin.com");
check(!manifest.content_scripts, "the manifest injects content scripts into pages");
check(!(manifest.host_permissions ?? []).length, "the manifest asks for host permissions up front");
check(!JSON.stringify(manifest).includes("<all_urls>"), "the manifest asks for <all_urls>");
check(!JSON.stringify(manifest).toLowerCase().includes("linkedin"), "the manifest mentions LinkedIn");
check(!(manifest.permissions ?? []).some((p) => ["tabs", "webRequest", "cookies", "history"].includes(p)), "the manifest asks for a broad permission");

if (failures.length) {
  console.error(`Extension check failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("Extension check passed.");
