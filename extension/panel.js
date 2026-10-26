// The agent's run loop. It lives in the side panel, or in the agent window that
// the desk's Agentic Apply button opens, so closing either ends the run. Each
// turn: read the page (page.js), ask Signal Desk for the next action, check it
// against the rules below, then act with real mouse and keyboard input through
// the debugger. The rules are enforced here, in code, whatever the model says:
// secrets are never typed, passwords, codes and human checks are handed to him,
// nothing is paid for, and LinkedIn is off limits. A site's own "Continue with
// Google" button is the one sign-in the agent may use. The final submit waits
// for his Approve, unless he started the run with auto-submit on: then the agent
// submits, may tick consent boxes, and may only decline demographic questions.
// In a queued run, anything only he can do waits for him on Signal Desk; what
// still can't be done marks the job "needs you" and the queue moves on.

const MAX_STEPS = 60;
const AUTO_MAX_STEPS = 80;
const HISTORY = 40;
// How long a queued run waits for him to sign in or solve a check before it moves on.
const WAIT_MS = 20 * 60_000;
// The same action this many times in a row is a loop, not progress.
const REPEATS = 6;
// The same button this many times in the last dozen clicks on a page, other clicks in between or not.
const CLICK_LOOP = 4;
const LINKEDIN = /(^|\.)linkedin\.com$/i;
const WINDOW_MODE = new URLSearchParams(location.search).has("window");

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

// The agent window has no tabs of its own: it works in the browser window it was opened from.
async function targetWindow() {
  if (!WINDOW_MODE) return null;
  const { targetWindowId } = await chrome.storage.session.get("targetWindowId");
  return targetWindowId ?? null;
}

async function activeTab() {
  const windowId = await targetWindow();
  const [tab] = await chrome.tabs.query(windowId ? { active: true, windowId } : { active: true, currentWindow: true });
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

// Jobs with a draft application and a link to open, for the queue.
function readyJobs() {
  return (context.jobs || []).filter((j) => /^https?:/.test(j.url_apply || "") && !/linkedin\.com/i.test(j.url_apply));
}

// "auto" submits; "review" fills and stops at the submit; anything else waits for his Approve.
const applyTask = (job, mode) =>
  mode === "auto"
    ? `Apply to ${job.title} at ${job.company} on this page. Open the application form if this is the job post, fill every field you can from my facts, attach my resume, and submit it. Then confirm the page says it was received.`
    : mode === "review"
      ? `Apply to ${job.title} at ${job.company} on this page. Open the application form if this is the job post, fill every field you can from my facts, attach my resume, go through every page of the form, and then use the submit action on the final submit button. The extension stops there and leaves it for me to check and send.`
      : `Apply to ${job.title} at ${job.company} on this page. Fill every field you can from my facts, attach my resume, and get it ready for me to approve the submit.`;

function renderChips() {
  const job = selectedJob();
  const chips = [];
  if (job) {
    chips.push({
      title: "Apply to this job",
      note: `${job.title} at ${job.company}`,
      task: applyTask(job),
    });
  }
  const ready = readyJobs();
  if (ready.length > 1) {
    chips.push({
      title: `Apply to all ${ready.length} ready jobs`,
      note: "One at a time, each in its own tab. You approve every submit.",
      queue: ready,
    });
  }
  chips.push(
    { title: "Fill the form on this page", note: "From your facts and reviewed answers", task: "Fill the form on this page from my facts. Leave anything you don't know blank and tell me." },
    { title: "Find the application", note: "Open the apply flow from a job post", task: "Find the button that starts the application on this job post, open the application form, and fill it." },
  );
  els.chips.replaceChildren(
    ...chips.map((c) =>
      el(
        "button",
        { class: "chip", type: "button", onclick: () => (c.queue ? runQueue(c.queue) : start(c.task)) },
        el("strong", { text: c.title }),
        el("span", { text: c.note }),
      ),
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
  if (run) run.lastAct = Date.now();
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
  try {
    await inject();
  } catch (err) {
    // Chrome's own "site can't be reached" page: a blip is common, so reload once.
    if (!/error page/i.test(err.message) || run.reloaded) throw new Error(`The page didn't load (${err.message}).`);
    run.reloaded = true;
    await chrome.tabs.reload(run.tabId);
    await tabLoaded(run.tabId);
    await sleep(1500);
    return readPage();
  }
  const results = await chrome.scripting.executeScript({ target: { tabId: run.tabId, allFrames: true }, func: () => window.__sd?.snapshot() }).catch(() => []);
  const main = results.find((r) => r.frameId === 0)?.result;
  if (!main) throw new Error("I couldn't read this page.");
  const flags = { ...main.flags };
  let text = main.text;
  for (const r of results) {
    if (r.frameId === 0 || !r.result?.text) continue;
    flags.captcha ||= r.result.flags.captcha;
    flags.password ||= r.result.flags.password;
    flags.sso ||= r.result.flags.sso;
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
    case "handoff":
      return "Hand over to you";
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

// Whether a field marked as his may be touched by this action, in this run.
// Returns the refusal, or null when it's allowed.
function hisRefusal(info, action) {
  if (!info.his) return null;
  const leave = action.type === "type" ? "That field is his to fill. Leave it, or ask him." : "That choice is his to make. Ask him, or leave it.";
  if (info.his === "secret" || !run.unattended) return refused(leave);
  if (info.his === "consent") return action.type === "type" ? refused(leave) : null;
  // Demographic: only a decline-to-answer option, never a real answer.
  if (action.type === "select") return null;
  if ((action.type === "click" || action.type === "check") && info.declines) return null;
  return refused("On demographic questions I may only pick a decline-to-answer option. Leave it if there isn't one.");
}

async function approveSubmit(target, summary, info) {
  const form = await exec(target.frameId, "filled", target.local).catch(() => ({ fields: [], missing: [] }));
  run.fields = form.fields;
  // A form with required fields still blank never goes out unattended, and isn't "ready" either.
  if (run.unattended && form.missing.length) {
    return handOff(`Filled what I could. Still blank and required: ${form.missing.join(", ")}. I didn't submit.`);
  }
  if (run.mode === "review") {
    run.outcome = "ready";
    run.blocker = form.missing.length ? `Filled and waiting for you to submit. Still blank and required: ${form.missing.join(", ")}.` : "Filled and waiting for you to check and submit.";
    run.stopped = true;
    setState("done", "Ready for you");
    note("done", "Ready for you to submit", `${run.blocker}

I didn't click "${trim(info.name || "submit", 40)}". The tab stays open.`);
    return refused("Left for him to submit.");
  }
  if (run.auto) {
    await clickAt(target, info);
    run.approved = true;
    return ok(
      `Auto-submit is on, so I clicked it.${form.missing.length ? ` Still blank and required: ${form.missing.join(", ")}.` : ""} Check the next page for a confirmation, or fix any errors it shows, before saying it's submitted.`,
    );
  }
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

// The same button clicked again and again on one page is a loop, even when other clicks come between
// and the page renumbers its refs (Himalayas' Apply modal: "Apply now", "I'm ready to apply", repeat).
// Buttons that move a multi-page form along are exempt: "Next" on every page is progress.
function clickLoop(info) {
  if (/\b(next|continue|add|save)\b/i.test(info.name || "")) return false;
  const key = `${run.tabId}|${info.name}`;
  run.clicks = [...(run.clicks || []), key].slice(-12);
  return run.clicks.filter((k) => k === key).length >= CLICK_LOOP;
}

async function clickAt(target, info) {
  run.lastAct = Date.now();
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
  if (action.type === "click" && clickLoop(info)) {
    const why = `I clicked "${trim(info.name, 60)}" ${CLICK_LOOP} times on this page without getting anywhere, so I stopped on this job.`;
    if (run.unattended) return handOff(why);
    run.clicks = [];
    return refused(`${why} Try something else, or ask him.`);
  }

  switch (action.type) {
    case "click": {
      if (info.pay) return refused("That looks like a payment. Paying is his to do.");
      if (info.submitLike) return approveSubmit(target, "This button looks like the final submit, so I'm asking first.", info);
      if (/checkbox|radio|switch|option/.test(info.role)) {
        const no = hisRefusal(info, action);
        if (no) return no;
      }
      await clickAt(target, info);
      return ok("Clicked.");
    }
    case "type": {
      const no = hisRefusal(info, action);
      if (no) return no;
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
      const no = hisRefusal(info, action);
      if (no) return no;
      const r = await exec(target.frameId, "selectOption", target.local, action.option, info.his === "demographic");
      return r.startsWith("selected") ? ok(r) : r.startsWith("refused") ? refused(r) : failed(r);
    }
    case "check": {
      const no = hisRefusal(info, action);
      if (no) return no;
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
        run.problems = [...new Set([...(run.problems || []), `The resume wasn't attached: ${trim(err.message, 200)}`])];
        return failed(`${err.message} Retrying won't help. Leave the resume, carry on with the rest of the form, and name it in your summary.`);
      }
      const r = await exec(target.frameId, "upload", target.local, pdf.b64, pdf.filename);
      if (r.startsWith("attached")) return ok(pdf.tailored ? `${r} (his resume tailored to this job)` : r);
      return r.startsWith("refused") ? refused(r) : failed(r);
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
      if (run.unattended) {
        run.questions = [...(run.questions || []), action.question];
        return ok("He isn't watching this run. Leave that field blank, carry on with the rest, and name it in your summary.");
      }
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
    case "handoff": {
      const go = await waitForHim("Your turn", action.reason);
      if (!go) return refused("Handed to him.");
      return ok("He says he's done his part. Read the page again and carry on from where it is now.");
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

function pdfLoader(jobId, tailor) {
  let promise = null;
  const name = context.name ? `${context.name} Resume.pdf` : "Resume.pdf";
  const load = async () => {
    const res = await api(`/api/public/ext/file${jobId ? `?job=${jobId}${tailor ? "&tailor=1" : ""}` : ""}`);
    if (!res.ok) throw new Error((await res.text()) || "Signal Desk couldn't build the resume PDF.");
    const tailored = res.headers.get("X-Resume") === "tailored";
    const bytes = new Uint8Array(await res.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return { b64: btoa(bin), filename: name, tailored };
  };
  // One retry for a network blip; a second failure (a build error) sticks for the run.
  let failures = 0;
  return () => {
    promise ??= load();
    promise.catch(() => {
      if (++failures < 2) promise = null;
    });
    return promise;
  };
}

// An apply button that opens the form in a new tab, or a sign-in popup: follow it.
// Only a tab that opens right after the agent's own click or keypress counts.
// Chrome also names the agent's tab as the opener of tabs he opens himself while
// it's in front, and those are his.
chrome.tabs.onCreated.addListener(async (tab) => {
  if (!run || tab.openerTabId !== run.tabId || Date.now() - (run.lastAct || 0) > 6000) return;
  // A new tab page's address is hidden from the extension, so only a web address counts.
  const url = tab.pendingUrl || tab.url || (await addressOf(tab.id));
  if (!run || tab.openerTabId !== run.tabId || !/^https?:/.test(url)) return;
  await detach();
  run.tabStack = [...(run.tabStack || []), run.tabId];
  run.tabId = tab.id;
  run.history.push({ thought: "", action: "(the page opened a new tab)", result: "I moved to the new tab." });
  addStep("navigate", "Followed the new tab").finish("ok");
});

// A tab opened by a link (Himalayas' "I'm ready to apply") often has no address yet when it appears.
async function addressOf(tabId) {
  for (let i = 0; i < 20; i++) {
    await sleep(150);
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (!tab) return "";
    if (tab.pendingUrl || tab.url) return tab.pendingUrl || tab.url;
  }
  return "";
}

// A sign-in popup closes itself when it's done: go back to the page that opened it.
chrome.tabs.onRemoved.addListener((tabId) => {
  if (!run || tabId !== run.tabId || !run.tabStack?.length) return;
  run.attached = null;
  run.tabId = run.tabStack.pop();
  run.history.push({ thought: "", action: "(the tab closed)", result: "I went back to the page that opened it." });
  addStep("navigate", "Back to the page that opened it").finish("ok");
});

async function gate() {
  while (run && run.paused && !run.stopped) await sleep(200);
}

function renderCount() {
  els.count.textContent = `Step ${run.steps} of ${run.cap}`;
}

// In an auto-submit run nobody is watching the panel, so anything only he can
// do ends the run as "needs you", with the reason, and the queue moves on. The
// tab stays open for him.
function handOff(blocker) {
  run.outcome = "needs_you";
  run.blocker = blocker;
  run.stopped = true;
  if (pendingCard) pendingCard("stop");
  setState("waiting", "Needs you");
  note("warn", "Left for you", `${blocker}\n\nThe tab is still open. It's on your Applications tab in Signal Desk.`);
  return refused("Handed to him.");
}

// Something only he can do: a password, a code, a human check. A watched run asks
// on the panel. A queued run marks itself "waiting" on Signal Desk, where the
// Agentic Apply button and Applications show why, and waits for his "Carry on"
// from there or from this window. No answer in WAIT_MS hands the job to him.
// Resolves true when he's done his part.
async function waitForHim(title, body) {
  if (!run.unattended) {
    const { value } = await waitFor({
      iconName: "shield",
      title,
      body,
      buttons: [
        { label: "Continue", value: "go", primary: true },
        { label: "Stop", value: "stop", danger: true },
      ],
    });
    if (value !== "go") stopRun();
    return value === "go";
  }
  if (!run.serverId) {
    handOff(body);
    return false;
  }
  await report({ status: "waiting", blocker: body, activity: title });
  // Signal Desk's "Show me" button brings this tab to the front.
  await chrome.storage.session.set({ waitingRun: { id: run.serverId, tabId: run.tabId } });
  const answer = waitFor({
    iconName: "shield",
    title,
    body: `${body}\n\nPress Carry on here or on Signal Desk once it's done.`,
    buttons: [
      { label: "Carry on", value: "go", primary: true },
      { label: "Skip this job", value: "skip" },
    ],
  });
  let value = null;
  answer.then((r) => (value = r.value));
  const until = Date.now() + WAIT_MS;
  while (value === null && Date.now() < until) {
    await sleep(3000);
    const r = await apiJSON(`/api/public/ext/runs/${run.serverId}`).catch(() => null);
    if (r?.reply && value === null) {
      pendingCard?.(r.reply);
      break;
    }
  }
  if (value === null) pendingCard?.("timeout");
  ({ value } = await answer);
  await chrome.storage.session.remove("waitingRun");
  if (run.stopped) return false;
  if (value !== "go") {
    handOff(value === "timeout" ? `${body}\n\nNobody answered for ${WAIT_MS / 60_000} minutes, so I moved on.` : `${body}\n\nYou skipped it.`);
    return false;
  }
  await report({ status: "running", blocker: "", activity: "Carrying on" });
  return true;
}

// A small update to his run record. Never fatal: the run carries on without it.
function report(patch) {
  if (!run?.serverId) return Promise.resolve();
  return apiJSON(`/api/public/ext/runs/${run.serverId}`, { method: "PATCH", body: JSON.stringify(patch) }).catch(() => {});
}

// The record on his Applications tab: opened when a job run starts, closed when it ends.
async function openRecord(url) {
  if (!run.jobId) return;
  try {
    const { id } = await apiJSON("/api/public/ext/runs", { method: "POST", body: JSON.stringify({ jobId: run.jobId, autoSubmit: run.auto, url }) });
    run.serverId = id;
  } catch {
    // The run still works without its record; the old "applied" call covers the submit.
  }
}

async function closeRecord(outcome) {
  if (!run.serverId) return false;
  const tab = await chrome.tabs.get(run.tabId).catch(() => null);
  if (!run.fields?.length && tab) {
    const form = await exec(0, "filled", null).catch(() => null);
    if (form?.fields?.length) run.fields = form.fields;
  }
  // A queued job that ended short of the final submit isn't finished: it needs him.
  const short = outcome === "done" && run.unattended;
  const status = short ? "needs_you" : { submitted: "submitted", ready: "ready", done: "done", stopped: "stopped", needs_you: "needs_you", error: "failed" }[outcome] || "failed";
  // The agent's own summary says why it stopped; the stock line is only for when there's none.
  const notes = [run.blocker, short && !run.blocker && !run.summary ? "It stopped before the final submit." : "", ...(run.problems || [])];
  if (run.questions?.length) notes.push(`Left blank, I didn't know: ${run.questions.join(" | ")}`);
  run.blocker = notes.filter(Boolean).join("\n");
  try {
    await apiJSON(`/api/public/ext/runs/${run.serverId}`, {
      method: "PATCH",
      body: JSON.stringify({
        status,
        steps: run.steps,
        url: tab?.url?.slice(0, 2000),
        summary: trim(run.summary || "", 4000),
        blocker: trim(run.blocker || "", 1200),
        fields: (run.fields || []).slice(0, 120).map((f) => ({ label: trim(f.label, 300), value: trim(f.value, 2000) })),
      }),
    });
    return true;
  } catch {
    return false;
  }
}

// Resolves with how the run ended: "submitted", "done", "needs_you", "stopped" or "error".
async function start(task, target = {}) {
  task = task.trim();
  if (!task || run) return null;
  const tab = target.tabId ? await chrome.tabs.get(target.tabId).catch(() => null) : await activeTab();
  if (!tab) return null;
  const jobId = target.jobId !== undefined ? target.jobId : els.job.value || null;
  const mode = target.mode === "auto" || target.mode === "review" ? target.mode : "watch";
  const auto = mode === "auto";
  run = { tabId: tab.id, task, jobId, mode, auto, unattended: mode !== "watch", history: [], steps: 0, cap: mode === "watch" ? MAX_STEPS : AUTO_MAX_STEPS, approved: false, paused: false, stopped: false, attached: null, acks: new Set(), outcome: "stopped" };
  run.pdf = pdfLoader(jobId, target.tailor === true);
  if (jobId || /\b(apply|application|resume|cv)\b/i.test(task)) run.pdf().catch(() => {});
  await openRecord(tab.url);

  els.task.value = "";
  addYou(task);
  els.controls.hidden = false;
  els.composer.hidden = true;
  els.pause.textContent = "Pause";
  setState("running", "Working");
  renderCount();

  let outcome = "stopped";
  try {
    await loop();
    outcome = run.outcome;
  } catch (err) {
    outcome = "error";
    run.blocker = err.message;
    if (!run?.stopped) {
      setState("error", "Stopped");
      note("error", "I had to stop", err.message);
    }
  } finally {
    await closeRecord(outcome);
    await overlay(false);
    await detach();
    run = null;
    if (!queue) {
      els.controls.hidden = true;
      els.composer.hidden = false;
      if (els.state.dataset.state === "running") setState("idle", "Ready");
      els.task.focus();
      refreshContext();
    }
  }
  return outcome;
}

// ---------- The queue ----------

let queue = null;

function tabLoaded(tabId, timeoutMs = 30_000) {
  return new Promise((resolve) => {
    const done = () => {
      chrome.tabs.onUpdated.removeListener(listen);
      clearTimeout(timer);
      resolve();
    };
    const listen = (id, change) => {
      if (id === tabId && change.status === "complete") done();
    };
    const timer = setTimeout(done, timeoutMs);
    chrome.tabs.onUpdated.addListener(listen);
  });
}

// Works through the jobs one by one, each in a new tab. A job with autoSubmit
// is submitted by the agent; any other waits for his Approve. Stop on a card
// moves on to the next job, the Stop under the log ends the whole queue. Jobs
// the desk sends while it runs join the end.
async function runQueue(jobs) {
  if (run || queue) return;
  queue = { stopped: false, results: [], jobs };
  els.stop.textContent = "Stop all";
  addYou(jobs.length === 1 ? `Apply to ${jobs[0].title} at ${jobs[0].company}` : `Apply to ${jobs.length} jobs`);
  try {
    for (const [i, job] of jobs.entries()) {
      if (queue.stopped) break;
      els.log.append(el("div", { class: "queue-mark" }, el("strong", { text: `Job ${i + 1} of ${jobs.length}` }), el("span", { text: `${job.title} at ${job.company}` })));
      const windowId = await targetWindow();
      const tab = await chrome.tabs.create({ url: job.url_apply, active: true, ...(windowId ? { windowId } : {}) });
      await tabLoaded(tab.id);
      await sleep(1200);
      const mode = job.autoSubmit ? "auto" : "review";
      const outcome = await start(applyTask(job, mode), { tabId: tab.id, jobId: job.id, mode, tailor: job.tailor });
      queue.results.push({ job, outcome: outcome || "error" });
    }
  } finally {
    const label = { submitted: "submitted", ready: "filled, ready for you to submit", done: "finished, not submitted", needs_you: "needs you", stopped: "skipped", error: "hit a problem" };
    const lines = queue.results.map((r) => `${r.job.company}: ${label[r.outcome] || r.outcome}`);
    const sent = queue.results.filter((r) => r.outcome === "submitted").length;
    queue = null;
    els.stop.textContent = "Stop";
    els.controls.hidden = true;
    els.composer.hidden = false;
    setState("done", `${sent} submitted`);
    note("done", `Queue finished: ${sent} of ${lines.length} submitted`, lines.join("\n"));
    refreshContext();
    takePending();
  }
}

// Jobs the desk handed over (background.js keeps them until the window takes them).
async function takePending() {
  if (!WINDOW_MODE) return;
  const { pending = [] } = await chrome.storage.session.get("pending");
  if (!pending.length) return;
  await chrome.storage.session.set({ pending: [] });
  if (queue) queue.jobs.push(...pending);
  else if (!run) runQueue(pending);
}

if (WINDOW_MODE) {
  document.body.classList.add("window");
  chrome.storage.session.onChanged.addListener((changes) => {
    if (changes.pending?.newValue?.length) takePending();
  });
}

async function loop() {
  let overlayOn = false;
  while (!run.stopped) {
    await gate();
    if (run.stopped) return;

    if (run.steps >= run.cap) {
      if (run.unattended) return handOff(`I spent ${run.steps} steps on this without finishing. Have a look at where it got to.`);
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
    // A "Continue with LinkedIn" popup: the agent never works on LinkedIn, so he confirms it there.
    const current = await chrome.tabs.get(run.tabId).catch(() => null);
    if (current && LINKEDIN.test(hostOf(current.url || current.pendingUrl || ""))) {
      thinking.finish("refused", "LinkedIn's sign-in is open.");
      if (!(await waitForHim("Your turn: confirm on LinkedIn", "The site's LinkedIn sign-in opened. I don't work on LinkedIn, so confirm it there yourself."))) return;
      // The popup closes itself once he confirms, and the agent goes back to the page that opened it.
      await sleep(2000);
      continue;
    }
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
      if (!(await waitForHim("Your turn: a human check", `${hostOf(page.url)} wants to know a person is here. Solve the check on that tab.`))) return;
      run.acks.add(`c ${page.url}`);
      continue;
    }
    // A password form: the site's Google or LinkedIn button is tried first, once per site.
    const host = hostOf(page.url);
    if (page.flags.password && !run.acks.has(`p ${host}`)) {
      if (page.flags.sso && !run.acks.has(`s ${host}`)) {
        run.acks.add(`s ${host}`);
        run.history.push({ thought: "", action: "(a sign-in form)", result: "This page wants a sign-in. Click its Continue with Google button (LinkedIn only if there's no Google one). Never type a password." });
      } else {
        thinking.finish("refused", "This page asks for a password.");
        if (!(await waitForHim("Your turn: sign in", `${host} wants you signed in, and I don't type passwords. Sign in on that tab (Chrome can fill your saved password).`))) return;
        run.acks.add(`p ${host}`);
        continue;
      }
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
          mode: run.mode,
          history: run.history.slice(-HISTORY),
        }),
      });
    } catch (err) {
      thinking.finish("failed", err.message);
      if (run.unattended) {
        run.apiErrors = (run.apiErrors || 0) + 1;
        if (run.apiErrors < 3) {
          await sleep(4000);
          continue;
        }
        return handOff(`Signal Desk kept failing to answer: ${err.message}`);
      }
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
    report({ steps: run.steps, activity: trim(`${describe(action)} on ${host}`, 300) });

    const said = JSON.stringify(action);
    run.repeats = said === run.lastSaid ? (run.repeats || 0) + 1 : 1;
    run.lastSaid = said;
    if (run.repeats >= REPEATS && action.type !== "wait") {
      thinking.finish("refused", "Going round in circles.");
      const why = `I tried "${describe(action)}" ${run.repeats} times in a row without getting anywhere, so I stopped on this job.`;
      if (run.unattended) return handOff(why);
      run.history.push({ thought: "", action: said, result: `${why} Try something else, or ask him.` });
      run.repeats = 0;
      continue;
    }
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
  run.summary = summary;
  if (action.submitted && run.approved && run.jobId && !run.serverId) {
    try {
      await apiJSON("/api/public/ext/applied", { method: "POST", body: JSON.stringify({ jobId: run.jobId }) });
      summary += "\n\nMarked as submitted in Signal Desk.";
    } catch (err) {
      summary += `\n\nI couldn't mark it submitted in Signal Desk (${err.message}). Do it from the job page.`;
    }
  }
  run.outcome = action.submitted && run.approved ? "submitted" : "done";
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
els.stop.addEventListener("click", () => {
  if (queue) queue.stopped = true;
  stopRun();
});

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

loadSettings().then(refreshContext).then(takePending);
