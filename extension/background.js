// The toolbar button opens the side panel, where the agent runs by hand. The
// desk's Agentic Apply button reaches here through bridge.js: it connects the
// extension and hands over jobs, which run in the agent window. A run lives in
// the panel or the window and stops when that closes.
const openOnClick = () => chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
chrome.runtime.onInstalled.addListener(openOnClick);
chrome.runtime.onStartup.addListener(openOnClick);

const WIDTH = 440;

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (!msg?.bridge || !sender.tab) return false;
  handle(msg, sender.tab).then(reply, (err) => reply({ ok: false, error: err.message }));
  return true;
});

async function handle(msg, tab) {
  const saved = await chrome.storage.local.get(["base", "token"]);
  const connected = Boolean(saved.base && saved.token);
  switch (msg.type) {
    case "hello":
      return { ok: true, version: chrome.runtime.getManifest().version, connected: connected && saved.base === msg.origin };
    case "connect": {
      const token = String(msg.payload?.token || "").trim();
      if (!token) return { ok: false, error: "No token came with the request." };
      // The desk that connects is the desk the agent calls.
      await chrome.storage.local.set({ base: msg.origin, token });
      return { ok: true };
    }
    case "apply": {
      if (!connected || saved.base !== msg.origin) return { ok: false, error: "Connect the agent first." };
      const jobs = (msg.payload?.jobs || [])
        .filter((j) => j && j.id && /^https?:/.test(j.url_apply || "") && !/linkedin\.com/i.test(j.url_apply))
        .map((j) => ({ id: j.id, title: String(j.title || ""), company: String(j.company || ""), url_apply: j.url_apply }))
        .slice(0, 50);
      if (!jobs.length) return { ok: false, error: "None of those jobs has a link the agent can apply on." };
      const { pending = [] } = await chrome.storage.session.get("pending");
      await chrome.storage.session.set({
        pending: [...pending, ...jobs.map((j) => ({ ...j, autoSubmit: msg.payload?.autoSubmit === true }))],
        targetWindowId: tab.windowId,
      });
      await openAgentWindow(tab.windowId);
      return { ok: true, queued: jobs.length };
    }
    default:
      return { ok: false, error: `Unknown request: ${msg.type}` };
  }
}

// One agent window at a time, docked on the right of his browser window, so the
// job tab stays in view (Chrome slows down tabs it can't see).
async function openAgentWindow(windowId) {
  const { agentWindowId } = await chrome.storage.session.get("agentWindowId");
  if (agentWindowId) {
    try {
      await chrome.windows.update(agentWindowId, { focused: true });
      return;
    } catch {
      // He closed it.
    }
  }
  const host = await chrome.windows.get(windowId);
  const created = await chrome.windows.create({
    url: "panel.html?window=1",
    type: "popup",
    width: WIDTH,
    height: host.height,
    left: Math.max(0, host.left + host.width - WIDTH),
    top: host.top,
  });
  await chrome.storage.session.set({ agentWindowId: created.id });
}

chrome.windows.onRemoved.addListener(async (id) => {
  const { agentWindowId } = await chrome.storage.session.get("agentWindowId");
  if (id === agentWindowId) await chrome.storage.session.remove("agentWindowId");
});
