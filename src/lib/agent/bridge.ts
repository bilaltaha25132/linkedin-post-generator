/**
 * Talks to the Signal Desk Agent extension from the desk's own pages. The
 * extension's bridge.js content script listens for these window messages and
 * answers on the same channel; no extension ID is needed. Browser only.
 */

export interface AgentJob {
  id: string;
  title: string;
  company: string;
  url_apply: string;
}

export type AgentReply = { ok: true; [key: string]: unknown } | { ok: false; error: string };

/** The version the extension stamped on the page, or null when it isn't installed. */
export function agentVersion(): string | null {
  return document.documentElement.dataset.sdAgent ?? null;
}

export function askAgent(type: "hello" | "connect" | "apply" | "show", payload?: unknown, timeoutMs = 4000): Promise<AgentReply> {
  return new Promise((resolve) => {
    const id = crypto.randomUUID();
    const done = (reply: AgentReply) => {
      window.removeEventListener("message", listen);
      clearTimeout(timer);
      resolve(reply);
    };
    const listen = (event: MessageEvent) => {
      if (event.source !== window || event.data?.source !== "sd-agent" || event.data.id !== id) return;
      done(event.data.reply ?? { ok: false, error: "The extension sent an empty answer." });
    };
    const timer = setTimeout(() => done({ ok: false, error: "The extension didn't answer. Reload it at chrome://extensions and this page." }), timeoutMs);
    window.addEventListener("message", listen);
    window.postMessage({ source: "sd-desk", id, type, payload }, window.location.origin);
  });
}

/**
 * Boards the agent can't get through for him: LinkedIn is refused outright, Sabbar only registers Saudi
 * mobile numbers, Naukrigulf links land on a search page, and a Hacker News thread has no form.
 */
const UNREACHABLE = /(^|\.)(linkedin\.com|sabbar\.com|naukrigulf\.com|news\.ycombinator\.com)$/i;

export function agentCanApply(url: string | null | undefined): boolean {
  if (!/^https?:/.test(url ?? "")) return false;
  try {
    return !UNREACHABLE.test(new URL(url!).hostname);
  } catch {
    return false;
  }
}
