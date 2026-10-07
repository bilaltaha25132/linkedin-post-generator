// Signal Desk Fill. Runs only when he opens the popup on a tab (activeTab), asks
// Signal Desk for the answers he already reviewed, and types one into the page
// when he presses Fill. It never clicks, never submits, never touches file,
// consent, demographic or certification fields, and refuses LinkedIn.

const $ = (id) => document.getElementById(id);
const status = (text) => ($("status").textContent = text);

const BLOCKED_HOST = /(^|\.)linkedin\.com$/;

async function settings() {
  return chrome.storage.local.get(["base", "token"]);
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

/**
 * Injected into the form page. Finds the control whose label matches and sets
 * its value the way a typed value would arrive. Must stay self-contained.
 */
function fillField(label, value) {
  const norm = (s) =>
    (s || "")
      .toLowerCase()
      .replace(/\(required\)|[*✱]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const want = norm(label);
  const matches = (text) => {
    const t = norm(text);
    if (!t || t.length < 2) return false;
    return t === want || (want.length >= 12 && (t.startsWith(want) || want.startsWith(t)));
  };
  const usable = (el) =>
    el &&
    !el.disabled &&
    !["file", "hidden", "submit", "button", "image", "reset", "password"].includes((el.type || "").toLowerCase());

  let control = null;
  for (const l of document.querySelectorAll("label, legend, [id$='label'], .application-label, .text")) {
    if (!matches(l.textContent)) continue;
    control =
      l.control ||
      (l.htmlFor && document.getElementById(l.htmlFor)) ||
      l.querySelector("input, textarea, select") ||
      l.closest("fieldset, .field, .application-question, li, div")?.querySelector("input, textarea, select");
    if (usable(control)) break;
    control = null;
  }
  if (!control) {
    for (const el of document.querySelectorAll("input, textarea, select")) {
      if (usable(el) && (matches(el.getAttribute("aria-label")) || matches(el.getAttribute("placeholder")))) {
        control = el;
        break;
      }
    }
  }
  if (!control) return "not found, fill by hand";
  const own = norm(control.labels?.[0]?.textContent || control.getAttribute("aria-label") || "");
  if (/gender|race|ethnic|veteran|disabilit|sexual orientation|pronoun|consent|privacy|terms|certify|confirm|acknowledge/.test(own)) {
    return "that field is yours to answer";
  }

  if (control.type === "radio" || control.type === "checkbox") {
    const group = control.closest("fieldset, .application-question, .field, li, div");
    const wanted = value.split(" | ").map(norm);
    let set = 0;
    for (const box of group ? group.querySelectorAll(`input[type="${control.type}"]`) : []) {
      const text = norm(box.labels?.[0]?.textContent || box.value);
      if (wanted.includes(text) && !box.checked) {
        box.checked = true;
        box.dispatchEvent(new Event("input", { bubbles: true }));
        box.dispatchEvent(new Event("change", { bubbles: true }));
        set++;
      }
    }
    return set ? "filled" : "option not found, pick by hand";
  }

  if (control.tagName === "SELECT") {
    const option = [...control.options].find((o) => norm(o.textContent) === norm(value) || norm(o.value) === norm(value));
    if (!option) return "option not found, pick by hand";
    control.value = option.value;
  } else {
    // React and Vue listen to the native setter, not the property.
    const proto = control.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(control, value);
  }
  control.dispatchEvent(new Event("input", { bubbles: true }));
  control.dispatchEvent(new Event("change", { bubbles: true }));
  control.dispatchEvent(new Event("blur", { bubbles: true }));
  control.scrollIntoView({ block: "center", behavior: "smooth" });
  return "filled";
}

async function fill(tabId, answer) {
  const [{ result }] = await chrome.scripting.executeScript({ target: { tabId }, func: fillField, args: [answer.label, answer.value] });
  return result;
}

function render(tab, data) {
  $("job").textContent = `${data.job.title}, ${data.job.company}`;
  $("actions").hidden = false;
  const list = $("answers");
  list.replaceChildren();
  const fillable = [];
  for (const a of data.answers) {
    const li = document.createElement("li");
    const name = document.createElement("span");
    name.className = "label";
    name.textContent = a.label;
    li.append(name);
    if (a.yours) {
      const note = document.createElement("span");
      note.className = "yours";
      note.textContent = "Yours to answer. Not filled.";
      li.append(note);
    } else if (a.type === "file") {
      const note = document.createElement("span");
      note.className = "yours";
      note.textContent = "Attach the file yourself.";
      li.append(note);
    } else if (a.value) {
      const value = document.createElement("span");
      value.className = "value";
      value.textContent = a.value;
      const row = document.createElement("div");
      row.className = "row";
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Fill";
      const result = document.createElement("span");
      result.className = "result";
      button.addEventListener("click", async () => (result.textContent = await fill(tab.id, a)));
      const copy = document.createElement("button");
      copy.type = "button";
      copy.className = "ghost";
      copy.textContent = "Copy";
      copy.addEventListener("click", () => navigator.clipboard.writeText(a.value));
      row.append(button, copy, result);
      li.append(value, row);
      fillable.push({ a, result });
    } else {
      const note = document.createElement("span");
      note.className = "yours";
      note.textContent = "No answer drafted.";
      li.append(note);
    }
    if (a.flag) {
      const flag = document.createElement("span");
      flag.className = "flag";
      flag.textContent = a.flag;
      li.append(flag);
    }
    list.append(li);
  }
  $("fill-all").onclick = async () => {
    for (const { a, result } of fillable) result.textContent = await fill(tab.id, a);
    status("Filled what matched. Check every field before you submit.");
  };
}

async function load() {
  const { base, token } = await settings();
  if (!base || !token) {
    $("settings").hidden = false;
    status("Add your Signal Desk address and extension token.");
    return;
  }
  const tab = await activeTab();
  let host = "";
  try {
    host = new URL(tab.url).hostname;
  } catch {
    // chrome:// and other internal pages have no usable URL.
  }
  if (!host) return status("Open a job application form first.");
  if (BLOCKED_HOST.test(host)) return status("Signal Desk Fill doesn't run on LinkedIn.");

  status("Looking up this form…");
  try {
    const res = await fetch(`${base}/api/public/ext/answers?url=${encodeURIComponent(tab.url)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return status(data.error || `Signal Desk answered ${res.status}.`);
    status("");
    render(tab, data);
  } catch {
    status("Couldn't reach Signal Desk. Check the address in Settings.");
  }
}

$("settings-toggle").addEventListener("click", async () => {
  const { base } = await settings();
  $("base").value = base || "";
  $("settings").hidden = !$("settings").hidden;
});

$("settings").addEventListener("submit", async (e) => {
  e.preventDefault();
  let origin;
  try {
    origin = new URL($("base").value).origin;
  } catch {
    return status("That address isn't a URL.");
  }
  // Ask for access to his own Signal Desk only, not to every site.
  const granted = await chrome.permissions.request({ origins: [`${origin}/*`] });
  if (!granted) return status("Chrome needs permission to reach your Signal Desk.");
  await chrome.storage.local.set({ base: origin, token: $("token").value.trim() });
  $("token").value = "";
  $("settings").hidden = true;
  load();
});

load();
