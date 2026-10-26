// Runs only on Signal Desk's own pages (see manifest.json). It lets the desk
// find the extension and hand it work: the page posts a message, this passes
// it to background.js and posts the answer back. Nothing else on the page is
// read or touched.
(() => {
  const VERSION = chrome.runtime.getManifest().version;
  document.documentElement.dataset.sdAgent = VERSION;

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    const msg = event.data;
    if (!msg || msg.source !== "sd-desk" || typeof msg.id !== "string") return;
    chrome.runtime
      .sendMessage({ bridge: true, type: msg.type, payload: msg.payload ?? null, origin: location.origin })
      .then((reply) => window.postMessage({ source: "sd-agent", id: msg.id, reply }, location.origin))
      .catch((err) => window.postMessage({ source: "sd-agent", id: msg.id, reply: { ok: false, error: err.message } }, location.origin));
  });

  window.postMessage({ source: "sd-agent", type: "ready", version: VERSION }, location.origin);
})();
