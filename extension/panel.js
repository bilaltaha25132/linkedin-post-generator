// The agent's run loop. It lives in the side panel, so closing the panel ends
// the run. Each turn: read the page (page.js), ask Signal Desk for the next
// action, check it against the rules below, then act with real mouse and
// keyboard input through the debugger. The rules are enforced here, in code,
// whatever the model says: the final submit waits for his Approve, fields that
// are his are never typed into, sign-ins and human checks are handed to him,
// nothing is paid for, and LinkedIn is off limits.

const MAX_STEPS = 60;
const HISTORY = 40;
const LINKEDIN = /(^|\.)linkedin\.com$/i;

const $ = (id) => document.getElementById(id);
const els = {
  state: $("state"),
  settingsToggle: $("settings-toggle"),
  settings: $("settings"),
  base: $("base"),
  token: $("token"),
  settingsCancel: $("settings-cancel"),
  pageChip: $("page-chip"),
  job: $("job"),
  log: $("log"),
  empty: $("empty"),
  chips: $("chips"),
  controls: $("controls"),
  count: $("count"),
  pause: $("pause"),
  stop: $("stop"),
  composer: $("composer"),
  task: $("task"),
  send: $("send"),
};

const ICONS = {
  settings:
    '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  send: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  click: '<path d="m9 9 5 12 1.8-5.2L21 14Z"/><path d="M7.2 2.2 8 5.1"/><path d="m5.1 8-2.9-.8"/><path d="M14 4.1 12 6"/><path d="m6 12-1.9 2"/>',
  type: '<path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>',
  select: '<path d="m6 9 6 6 6-6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
  key: '<rect width="20" height="14" x="2" y="5" rx="2"/><path d="M7 15h10"/>',
  scroll: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
  navigate: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  wait: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  ask: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  submit: '<path d="M14.5 2.5 21.5 9.5"/><path d="m22 2-7 20-4-9-9-4Z"/>',
  done: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>',
  think: '<path d="M21 12a9 9 0 1 1-6.22-8.56"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
};

function icon(name) {
  const span = document.createElement("span");
  span.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.click}</svg>`;
  return span.firstChild;
}

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of children) if (c) node.append(c);
  return node;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const trim = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

// ---------- Settings and Signal Desk calls ----------

let settings = { base: "", token: "" };
let context = { job: null, jobs: [], name: "" };

async function loadSettings() {
  const saved = await chrome.storage.local.get(["base", "token"]);
  settings = { base: saved.base || "", token: saved.token || "" };
  els.base.value = settings.base;
  if (!settings.base || !settings.token) openSettings(true);
}

function openSettings(open) {
  els.settings.hidden = !open;
  els.settingsToggle.setAttribute("aria-expanded", String(open));
  if (open) els.base.focus();
}

els.settingsToggle.append(icon("settings"));
els.settingsToggle.addEventListener("click", () => openSettings(els.settings.hidden));
els.settingsCancel.addEventListener("click", () => openSettings(false));
els.settings.addEventListener("submit", async (e) => {
  e.preventDefault();
  const base = els.base.value.trim().replace(/\/+$/, "");
  const token = els.token.value.trim() || settings.token;
  let origin;
  try {
    origin = new URL(base).origin;
  } catch {
    els.base.focus();
    return;
  }
  // Calls to Signal Desk itself need its origin; this click is the gesture Chrome asks for.
  await chrome.permissions.request({ origins: [`${origin}/*`] }).catch(() => false);
  settings = { base, token };
  await chrome.storage.local.set(settings);
  els.token.value = "";
  openSettings(false);
  refreshContext();
});

async function api(path, init = {}) {
  if (!settings.base || !settings.token) {
    openSettings(true);
    throw new Error("Add the Signal Desk address and extension token in Settings first.");
  }
  const res = await fetch(`${settings.base}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${settings.token}`, ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
  });
  if (res.status === 401) {
    openSettings(true);
    throw new Error("Signal Desk refused the token. Check it in Settings.");
  }
  return res;
}

async function apiJSON(path, init) {
  const res = await api(path, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Signal Desk answered ${res.status}.`);
  return body;
}

// ---------- The page in view ----------

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

async function refreshContext() {
  if (run) return;
  const tab = await activeTab().catch(() => null);
  const url = tab?.url || "";
  els.pageChip.replaceChildren(icon("globe"), el("span", { text: url ? hostOf(url) || url : "Open the toolbar button on a page, or allow sites below" }));
  if (!settings.base || !settings.token) return renderJobs();
  try {
    context = await apiJSON(`/api/public/ext/context?url=${encodeURIComponent(url)}`);
  } catch {
    context = { job: null, jobs: [], name: context.name };
  }
  renderJobs();
}

function renderJobs() {
  const keep = els.job.value;
  const options = [el("option", { value: "", text: "No job: a general task" })];
  const seen = new Set();
  const add = (job, note) => {
    if (seen.has(job.id)) return;
    seen.add(job.id);
    options.push(el("option", { value: job.id, text: `${job.title} · ${job.company}${note ? ` (${note})` : ""}` }));
  };
  if (context.job) add(context.job, "this page");
  for (const job of context.jobs || []) add(job);
  els.job.replaceChildren(...options);
  els.job.value = context.job ? context.job.id : seen.has(keep) ? keep : "";
  renderChips();
}

function selectedJob() {
  const id = els.job.value;
  if (!id) return null;
  return [context.job, ...(context.jobs || [])].find((j) => j && j.id === id) || null;
}

function renderChips() {
  const job = selectedJob();
  const chips = [];
  if (job) {
    chips.push({
      title: "Apply to this job",
      note: `${job.title} at ${job.company}`,
      task: `Apply to ${job.title} at ${job.company} on this page. Fill every field you can from my facts, attach my resume, and get it ready for me to approve the submit.`,
    });
  }
  chips.push(
    { title: "Fill the form on this page", note: "From your facts and reviewed answers", task: "Fill the form on this page from my facts. Leave anything you don't know blank and tell me." },
    { title: "Find the application", note: "Open the apply flow from a job post", task: "Find the button that starts the application on this job post, open the application form, and fill it." },
  );
  els.chips.replaceChildren(
    ...chips.map((c) =>
      el("button", { class: "chip", type: "button", onclick: () => start(c.task) }, el("strong", { text: c.title }), el("span", { text: c.note })),
    ),
  );
}

els.job.addEventListener("change", renderChips);
chrome.tabs.onActivated.addListener(() => refreshContext());
chrome.tabs.onUpdated.addListener((id, change) => {
  if (change.status === "complete") refreshContext();
});

// ---------- Timeline and cards ----------

function setState(state, label) {
  els.state.dataset.state = state;
  els.state.textContent = label;
}

function scrollLog() {
  els.log.scrollTop = els.log.scrollHeight;
}

function addYou(text) {
  els.empty.hidden = true;
  els.log.append(el("div", { class: "you", text }));
  scrollLog();
}

function addStep(kind, text) {
  const textNode = el("div", { class: "step-text" }, el("span", { class: "step-main", text }));
  const row = el("div", { class: "step", "data-status": "pending" }, el("span", { class: "step-icon" }, icon(kind)), textNode);
  els.log.append(row);
  scrollLog();
  return {
    update(nextKind, nextText) {
      row.querySelector(".step-icon").replaceChildren(icon(nextKind));
      row.querySelector(".step-main").textContent = nextText;
    },
    // The model's reason sits under the step, so he can follow along.
    why(reason) {
      textNode.append(el("span", { class: "step-why", text: reason }));
    },
    finish(status, result) {
      row.dataset.status = status;
      if (result && status !== "ok") textNode.append(el("span", { class: "step-result", text: result }));
      scrollLog();
    },
  };
}

let pendingCard = null;

// A card that waits for him. Resolves with the button he pressed and any text he typed.
function waitFor({ kind = "warn", iconName = "alert", title, body, fields, missing, input, buttons }) {
  setState("waiting", "Waiting for you");
  const box = input ? el("textarea", { rows: "3", placeholder: input }) : null;
  const card = el("div", { class: `card card-${kind}`, role: "group", "aria-label": title }, el("h3", {}, icon(iconName), el("span", { text: title })));
  if (body) card.append(el("p", { text: body }));
  if (fields?.length) {
    const dl = el("dl", { class: "fields" });
    for (const f of fields) dl.append(el("dt", { text: f.label, title: f.label }), el("dd", { text: f.value }));
    card.append(dl);
  }
  if (missing?.length) card.append(el("div", { class: "leftover" }, el("strong", { text: "Still blank and required" }), document.createTextNode(missing.join(", "))));
  if (box) card.append(box);
  const row = el("div", { class: "row" });
  card.append(row);
  els.log.append(card);
  scrollLog();
  return new Promise((resolve) => {
    const settle = (value) => {
      card.classList.add("settled");
      pendingCard = null;
      setState("running", "Working");
      resolve({ value, text: box ? box.value.trim() : "" });
    };
    for (const b of buttons) {
      row.append(el("button", { type: "button", class: `btn ${b.primary ? "btn-primary" : ""} ${b.danger ? "btn-danger" : ""}`, text: b.label, onclick: () => (b.run ? b.run(settle) : settle(b.value)) }));
    }
    pendingCard = settle;
    (box || row.querySelector(".btn-primary") || row.firstChild)?.focus();
  });
}

function note(kind, title, body) {
  const card = el("div", { class: `card card-${kind} settled` }, el("h3", {}, icon(kind === "done" ? "done" : "alert"), el("span", { text: title })));
  if (body) card.append(el("p", { text: body }));
  els.log.append(card);
  scrollLog();
}

// ---------- Talking to the tab ----------

let run = null;

async function exec(frameId, name, ...args) {
  const [res] = await chrome.scripting.executeScript({
    target: { tabId: run.tabId, frameIds: [frameId] },
    func: (fn, a) => (window.__sd ? window.__sd[fn](...a) : "__missing"),
    args: [name, args],
  });
  if (res?.result === "__missing") throw new Error("The page changed under me. I'll read it again.");
  return res?.result;
}

async function inject() {
  try {
    await chrome.scripting.executeScript({ target: { tabId: run.tabId, allFrames: true }, files: ["page.js"] });
  } catch {
    await chrome.scripting.executeScript({ target: { tabId: run.tabId }, files: ["page.js"] });
  }
}

function parseRef(ref) {
  const m = /^f(\d+):(\d+)$/.exec(String(ref).trim());
  return m ? { frameId: Number(m[1]), local: `§:${m[2]}` } : { frameId: 0, local: String(ref).trim().replace(/^\[|\]$/g, "") };
}

async function overlay(on) {
  if (!run) return;
  await chrome.scripting
    .executeScript({ target: { tabId: run.tabId }, func: (v) => window.__sd?.overlay(v), args: [on] })
    .catch(() => {});
}

// Real input through Chrome's debugger: sites see trusted clicks and keystrokes.
// Attaching shows Chrome's "started debugging" bar, which moves the page down, so
// attach before measuring where anything is.
async function attach() {
  if (run.attached === run.tabId) return;
  await detach();
  await chrome.debugger.attach({ tabId: run.tabId }, "1.3");
  run.attached = run.tabId;
  await sleep(300);
}

async function cdp(method, params) {
  await attach();
  return chrome.debugger.sendCommand({ tabId: run.tabId }, method, params);
}

async function detach() {
  if (run?.attached) {
    const tabId = run.attached;
    run.attached = null;
    await chrome.debugger.detach({ tabId }).catch(() => {});
  }
}

chrome.debugger.onDetach.addListener((source, reason) => {
  if (!run || source.tabId !== run.attached) return;
  run.attached = null;
  if (reason === "canceled_by_user") stopRun("You closed Chrome's debugging bar, so I stopped.");
});

async function mouseClick(x, y) {
  const base = { x, y, button: "left", clickCount: 1 };
  await cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  await cdp("Input.dispatchMouseEvent", { type: "mousePressed", ...base });
  await sleep(40);
  await cdp("Input.dispatchMouseEvent", { type: "mouseReleased", ...base });
}

const KEYS = {
  Enter: { code: "Enter", keyCode: 13, text: "\r" },
  Tab: { code: "Tab", keyCode: 9 },
  Escape: { code: "Escape", keyCode: 27 },
  ArrowDown: { code: "ArrowDown", keyCode: 40 },
  ArrowUp: { code: "ArrowUp", keyCode: 38 },
  Backspace: { code: "Backspace", keyCode: 8 },
  Space: { code: "Space", keyCode: 32, text: " ", key: " " },
};

async function pressKey(name) {
  const k = KEYS[name];
  const common = { key: k.key || name, code: k.code, windowsVirtualKeyCode: k.keyCode, nativeVirtualKeyCode: k.keyCode };
  await cdp("Input.dispatchKeyEvent", { type: k.text ? "keyDown" : "rawKeyDown", text: k.text, ...common });
  await cdp("Input.dispatchKeyEvent", { type: "keyUp", ...common });
}

async function settle() {
  await sleep(500);
  const until = Date.now() + 10000;
  while (Date.now() < until) {
    try {
      const tab = await chrome.tabs.get(run.tabId);
      if (tab.status === "complete") {
        await inject();
        if (await exec(0, "settled")) return;
      }
    } catch {
      // Mid-navigation the frame can vanish for a moment.
    }
    await sleep(400);
  }
}

// ---------- Reading the page ----------

async function originGranted(url) {
  const u = new URL(url);
  return chrome.permissions.contains({ origins: [`${u.protocol}//${u.hostname}/*`] });
}

async function askForAccess(url) {
  const host = url ? hostOf(url) : "";
  const request = (origins) => async (done) => {
    const ok = await chrome.permissions.request({ origins }).catch(() => false);
    if (ok) done("granted");
  };
  const buttons = [];
  if (host) buttons.push({ label: `Allow on ${host}`, primary: true, run: request([`${new URL(url).protocol}//${host}/*`]) });
  buttons.push({ label: "Allow on all sites", primary: !host, run: request(["https://*/*", "http://*/*"]) });
  buttons.push({ label: "Stop", value: "stop", danger: true });
  const { value } = await waitFor({
    iconName: "shield",
    title: host ? `Let me work on ${host}?` : "Let me see this tab?",
    body: "Chrome needs your OK before I can read this site and act on it. You can remove it any time from the extension's details page.",
    buttons,
  });
  return value === "granted";
}

async function readPage() {
  const tab = await chrome.tabs.get(run.tabId);
  const url = tab.url || "";
  if (url && !/^https?:/.test(url)) throw new Error("I can only work on regular web pages.");
  if (LINKEDIN.test(hostOf(url))) throw new Error("I don't work on LinkedIn.");
  if (!url || !(await originGranted(url))) {
    if (!(await askForAccess(url))) return null;
  }
  await inject();
  const results = await chrome.scripting.executeScript({ target: { tabId: run.tabId, allFrames: true }, func: () => window.__sd?.snapshot() }).catch(() => []);
  const main = results.find((r) => r.frameId === 0)?.result;
  if (!main) throw new Error("I couldn't read this page.");
  const flags = { ...main.flags };
  let text = main.text;
  for (const r of results) {
    if (r.frameId === 0 || !r.result?.text) continue;
    flags.captcha ||= r.result.flags.captcha;
    flags.password ||= r.result.flags.password;
    text += `\n\n# Inside a frame (${hostOf(r.result.url)})\n${r.result.text.replaceAll("[§:", `[f${r.frameId}:`)}`;
  }
  return { url: main.url, title: main.title, text: trim(text, 58000), flags };
}

// ---------- Acting, with the rules ----------

function describe(action, info) {
  const name = info?.name ? `"${trim(info.name, 60)}"` : action.ref ? `[${action.ref}]` : "";
  switch (action.type) {
    case "click":
      return `Click ${name}`;
    case "type":
      return `Type into ${name}: ${trim(action.text, 80) || "(clear it)"}`;
    case "select":
      return `Choose "${action.option}" in ${name}`;
    case "check":
      return `${action.checked ? "Tick" : "Untick"} ${name}`;
    case "upload":
      return `Attach your resume to ${name}`;
    case "key":
      return `Press ${action.key}`;
    case "scroll":
      return `Scroll ${action.direction}`;
    case "navigate":
      return `Open ${trim(action.url, 80)}`;
    case "wait":
      return `Wait ${action.seconds}s`;
    case "ask":
      return "Ask you";
    case "submit":
      return `Submit with ${name}`;
    case "done":
      return "Finished";
    default:
      return action.type;
  }
}

const refused = (msg) => ({ status: "refused", result: msg });
const ok = (msg) => ({ status: "ok", result: msg });
const failed = (msg) => ({ status: "failed", result: msg });

async function approveSubmit(target, summary, info) {
  const form = await exec(target.frameId, "filled", target.local).catch(() => ({ fields: [], missing: [] }));
  const { value, text } = await waitFor({
    kind: "approve",
    iconName: "submit",
    title: `Submit with "${trim(info.name || "this button", 40)}"?`,
    body: summary,
    fields: form.fields,
    missing: form.missing,
    input: "Not yet? Tell me what to change (optional)",
    buttons: [
      { label: "Approve and submit", value: "yes", primary: true },
      { label: "Not yet", value: "no" },
    ],
  });
  if (value === "stop") return refused("Stopped.");
  if (value !== "yes") return refused(`He didn't approve the submit.${text ? ` He said: ${text}` : " Ask what to change, or finish without submitting."}`);
  await clickAt(target, info);
  run.approved = true;
  return ok("He approved, and I clicked it. Check the next page for a confirmation before saying it's submitted.");
}

async function clickAt(target, info) {
  await exec(target.frameId, "mark", target.local).catch(() => {});
  if (target.frameId === 0 && info.w > 0) await mouseClick(info.x, info.y);
  else await exec(target.frameId, "click", target.local);
}

async function perform(action, step) {
  if (!["ask", "done", "wait", "navigate"].includes(action.type)) await attach();
  const needsRef = "ref" in action;
  const target = needsRef ? parseRef(action.ref) : null;
  const info = needsRef ? await exec(target.frameId, "info", target.local).catch(() => ({ found: false })) : null;
  step.update(action.type, describe(action, info));
  if (needsRef && !info.found) return failed(`[${action.ref}] isn't on the page any more. Read the new snapshot.`);

  switch (action.type) {
    case "click": {
      if (info.pay) return refused("That looks like a payment. Paying is his to do.");
      if (info.submitLike) return approveSubmit(target, "This button looks like the final submit, so I'm asking first.", info);
      if (info.his && /checkbox|radio|switch/.test(info.role)) return refused("That choice is his to make. Ask him, or leave it.");
      await clickAt(target, info);
      return ok("Clicked.");
    }
    case "type": {
      if (info.his) return refused("That field is his to fill. Leave it, or ask him.");
      if (!info.editable) return failed("That isn't a text field. Click it first, or pick another ref.");
      await exec(target.frameId, "mark", target.local).catch(() => {});
      if (target.frameId === 0) {
        if (!(await exec(0, "prime", target.local))) await mouseClick(info.x, info.y);
        if (action.text) await cdp("Input.insertText", { text: action.text });
        else await pressKey("Backspace");
      } else {
        await exec(target.frameId, "setValue", target.local, action.text);
      }
      if (action.enter) {
        if (await exec(target.frameId, "enterRisk")) return ok("Typed. I didn't press Enter, because it could submit the form; click the button instead.");
        await pressKey("Enter");
      }
      return ok("Typed.");
    }
    case "select": {
      if (info.his) return refused("That choice is his to make. Ask him, or leave it.");
      const r = await exec(target.frameId, "selectOption", target.local, action.option);
      return r.startsWith("selected") ? ok(r) : failed(r);
    }
    case "check": {
      if (info.his) return refused("That box is his to tick. Ask him to do it.");
      const before = await exec(target.frameId, "checked", target.local);
      if (before === action.checked) return ok("Already set.");
      await clickAt(target, info);
      await sleep(150);
      const after = await exec(target.frameId, "checked", target.local);
      if (after !== action.checked && after !== null) {
        await exec(target.frameId, "click", target.local);
        await sleep(150);
      }
      return ok("Set.");
    }
    case "upload": {
      let pdf;
      try {
        pdf = await run.pdf();
      } catch (err) {
        return failed(err.message);
      }
      const r = await exec(target.frameId, "upload", target.local, pdf.b64, pdf.filename);
      return r.startsWith("attached") ? ok(r) : failed(r);
    }
    case "key": {
      if (action.key === "Enter" && (await exec(0, "enterRisk").catch(() => false))) {
        return refused("Enter here could submit the form without his approval. Click the right button instead.");
      }
      await pressKey(action.key);
      return ok("Pressed.");
    }
    case "scroll": {
      const vp = await exec(0, "viewport");
      await cdp("Input.dispatchMouseEvent", { type: "mouseWheel", x: vp.w / 2, y: vp.h / 2, deltaX: 0, deltaY: (action.direction === "down" ? 1 : -1) * vp.h * 0.75 });
      return ok("Scrolled.");
    }
    case "navigate": {
      if (!/^https?:/.test(action.url) || LINKEDIN.test(hostOf(action.url))) return refused("I can't open that address.");
      await chrome.tabs.update(run.tabId, { url: action.url });
      return ok("Opened.");
    }
    case "wait":
      await sleep(action.seconds * 1000);
      return ok("Waited.");
    case "ask": {
      const { value, text } = await waitFor({
        iconName: "ask",
        title: "I need you",
        body: action.question,
        input: "Your answer",
        buttons: [
          { label: "Send answer", value: "reply", primary: true },
          { label: "Skip it", value: "skip" },
        ],
      });
      if (value === "stop") return refused("Stopped.");
      return ok(value === "reply" && text ? `He answered: ${text}` : "He skipped it. Leave that field blank and carry on.");
    }
    case "submit":
      if (info.pay) return refused("That looks like a payment. Paying is his to do.");
      return approveSubmit(target, action.summary, info);
    case "done":
      return ok("Done.");
  }
  return failed("I don't know that action.");
}

// ---------- The run ----------

function pdfLoader(jobId) {
  let promise = null;
  const name = context.name ? `${context.name} Resume.pdf` : "Resume.pdf";
  const load = async () => {
    const res = await api(`/api/public/ext/file${jobId ? `?job=${jobId}` : ""}`);
    if (!res.ok) throw new Error((await res.text()) || "Signal Desk couldn't build the resume PDF.");
    const bytes = new Uint8Array(await res.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return { b64: btoa(bin), filename: name };
  };
  return () => {
    promise ??= load();
    promise.catch(() => (promise = null));
    return promise;
  };
}

// An apply button that opens the form in a new tab: follow it.
chrome.tabs.onCreated.addListener(async (tab) => {
  if (!run || tab.openerTabId !== run.tabId) return;
  await detach();
  run.tabId = tab.id;
  run.history.push({ thought: "", action: "(the page opened a new tab)", result: "I moved to the new tab." });
  addStep("navigate", "Followed the new tab").finish("ok");
});

async function gate() {
  while (run && run.paused && !run.stopped) await sleep(200);
}

function renderCount() {
  els.count.textContent = `Step ${run.steps} of ${run.cap}`;
}

async function start(task) {
  task = task.trim();
  if (!task || run) return;
  const tab = await activeTab();
  if (!tab) return;
  const jobId = els.job.value || null;
  run = { tabId: tab.id, task, jobId, history: [], steps: 0, cap: MAX_STEPS, approved: false, paused: false, stopped: false, attached: null, acks: new Set() };
  run.pdf = pdfLoader(jobId);
  if (jobId || /\b(apply|application|resume|cv)\b/i.test(task)) run.pdf().catch(() => {});

  els.task.value = "";
  addYou(task);
  els.controls.hidden = false;
  els.composer.hidden = true;
  els.pause.textContent = "Pause";
  setState("running", "Working");
  renderCount();

  try {
    await loop();
  } catch (err) {
    if (!run?.stopped) {
      setState("error", "Stopped");
      note("error", "I had to stop", err.message);
    }
  } finally {
    await overlay(false);
    await detach();
    run = null;
    els.controls.hidden = true;
    els.composer.hidden = false;
    if (els.state.dataset.state === "running") setState("idle", "Ready");
    els.task.focus();
    refreshContext();
  }
}

async function loop() {
  let overlayOn = false;
  while (!run.stopped) {
    await gate();
    if (run.stopped) return;

    if (run.steps >= run.cap) {
      const { value } = await waitFor({
        title: `That's ${run.steps} steps`,
        body: "I've been at this a while. Keep going, or stop and pick it up yourself?",
        buttons: [
          { label: "Keep going", value: "more", primary: true },
          { label: "Stop", value: "stop", danger: true },
        ],
      });
      if (value !== "more") return stopRun();
      run.cap += 30;
    }

    const thinking = addStep("think", "Reading the page");
    const page = await readPage();
    if (run.stopped) return;
    if (!page) {
      thinking.finish("refused", "No access to this site.");
      return stopRun();
    }
    if (!overlayOn) {
      await overlay(true);
      overlayOn = true;
    }

    if (page.flags.captcha && !run.acks.has(`c ${page.url}`)) {
      thinking.finish("refused", "There's a human check on the page.");
      const { value } = await waitFor({
        iconName: "shield",
        title: "Your turn: a human check",
        body: "This page wants to know a person is here. Solve it yourself, then press Continue.",
        buttons: [
          { label: "Continue", value: "go", primary: true },
          { label: "Stop", value: "stop", danger: true },
        ],
      });
      if (value !== "go") return stopRun();
      run.acks.add(`c ${page.url}`);
      continue;
    }
    if (page.flags.password && !run.acks.has(`p ${hostOf(page.url)}`)) {
      thinking.finish("refused", "This page asks for a password.");
      const { value } = await waitFor({
        iconName: "shield",
        title: "Your turn: sign in",
        body: "I don't enter passwords or create accounts. Sign in yourself (or skip if there's a guest option), then press Continue.",
        buttons: [
          { label: "Continue", value: "go", primary: true },
          { label: "Stop", value: "stop", danger: true },
        ],
      });
      if (value !== "go") return stopRun();
      run.acks.add(`p ${hostOf(page.url)}`);
      continue;
    }

    thinking.update("think", "Deciding the next step");
    let reply;
    try {
      reply = await apiJSON("/api/public/ext/step", {
        method: "POST",
        body: JSON.stringify({
          task: run.task,
          url: page.url,
          title: trim(page.title || "", 300),
          snapshot: page.text,
          jobId: run.jobId,
          history: run.history.slice(-HISTORY),
        }),
      });
    } catch (err) {
      thinking.finish("failed", err.message);
      const { value } = await waitFor({
        kind: "error",
        title: "Signal Desk didn't answer",
        body: err.message,
        buttons: [
          { label: "Try again", value: "retry", primary: true },
          { label: "Stop", value: "stop", danger: true },
        ],
      });
      if (value !== "retry") return stopRun();
      continue;
    }
    if (run.stopped) return;

    run.steps++;
    renderCount();
    const action = reply.action;
    thinking.update(action.type, describe(action));
    if (reply.thought) thinking.why(reply.thought);
    const outcome = await perform(action, thinking).catch((err) => failed(err.message));
    if (run.stopped) return;
    thinking.finish(outcome.status, outcome.result);
    run.history.push({ thought: trim(reply.thought || "", 600), action: trim(JSON.stringify(action), 1200), result: trim(outcome.result, 600) });

    if (action.type === "done") {
      await finish(action);
      return;
    }
    if (outcome.status !== "refused" || action.type === "submit" || action.type === "click") await settle();
  }
}

async function finish(action) {
  let summary = action.summary;
  if (action.submitted && run.approved && run.jobId) {
    try {
      await apiJSON("/api/public/ext/applied", { method: "POST", body: JSON.stringify({ jobId: run.jobId }) });
      summary += "\n\nMarked as submitted in Signal Desk.";
    } catch (err) {
      summary += `\n\nI couldn't mark it submitted in Signal Desk (${err.message}). Do it from the job page.`;
    }
  }
  setState("done", action.submitted && run.approved ? "Submitted" : "Done");
  note("done", action.submitted && run.approved ? "Submitted" : "Done", summary);
}

function stopRun(message) {
  if (!run || run.stopped) return;
  run.stopped = true;
  run.paused = false;
  if (pendingCard) pendingCard("stop");
  setState("idle", "Stopped");
  note("warn", "Stopped", message || "Nothing more will happen on the page. Start a new task any time.");
}

els.pause.addEventListener("click", () => {
  if (!run) return;
  run.paused = !run.paused;
  els.pause.textContent = run.paused ? "Resume" : "Pause";
  setState(run.paused ? "waiting" : "running", run.paused ? "Paused" : "Working");
});
els.stop.addEventListener("click", () => stopRun());

els.send.append(icon("send"));
els.composer.addEventListener("submit", (e) => {
  e.preventDefault();
  start(els.task.value);
});
els.task.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    start(els.task.value);
  }
});
els.task.addEventListener("input", () => {
  els.task.style.height = "auto";
  els.task.style.height = `${Math.min(els.task.scrollHeight, 160)}px`;
});

loadSettings().then(refreshContext);
