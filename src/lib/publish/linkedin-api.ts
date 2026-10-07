import "server-only";

import { env } from "@/lib/env";
import { forLinkedIn } from "@/lib/linkedin";

// The self-serve "Share on LinkedIn" and "Sign In with LinkedIn using OpenID
// Connect" products. Tokens last 60 days and come with no refresh token, so
// renewing means running the sign-in again (no consent screen the second time).

const API = "https://api.linkedin.com";
// Versioned API month (YYYYMM). LinkedIn sunsets each version after about a
// year; when calls start failing with a version error, move this forward.
const VERSION = "202609";
const SCOPES = "openid profile email w_member_social";

/** Holds the OAuth state between /api/linkedin/connect and the callback. */
export const STATE_COOKIE = "li_oauth_state";

export function callbackUrl(origin: string): string {
  return `${origin}/api/linkedin/callback`;
}

export function authorizeUrl(origin: string, state: string): string {
  const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: env.linkedin().clientId,
    redirect_uri: callbackUrl(origin),
    state,
    scope: SCOPES,
  }).toString();
  return url.toString();
}

export async function exchangeCode(
  code: string,
  origin: string,
): Promise<{ accessToken: string; expiresIn: number; scope: string }> {
  const { clientId, clientSecret } = env.linkedin();
  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: callbackUrl(origin),
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    scope?: string;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description ?? json.error ?? `HTTP ${res.status}`);
  }
  return { accessToken: json.access_token, expiresIn: json.expires_in ?? 60 * 24 * 3600, scope: json.scope ?? "" };
}

export async function revokeToken(token: string): Promise<void> {
  const { clientId, clientSecret } = env.linkedin();
  const res = await fetch("https://www.linkedin.com/oauth/v2/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, token }),
  });
  if (!res.ok) throw await apiError(res);
}

export async function fetchMember(token: string): Promise<{ personUrn: string; name: string | null }> {
  const res = await fetch(`${API}/v2/userinfo`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw await apiError(res);
  const json = (await res.json()) as { sub: string; name?: string };
  return { personUrn: `urn:li:person:${json.sub}`, name: json.name ?? null };
}

/**
 * Commentary is in LinkedIn's "little" format, where | { } @ [ ] ( ) < > # \ * _ ~
 * are markup: unescaped, a bracket or parenthesis silently cuts the post short.
 * A # that starts a word stays a live hashtag.
 */
export function toCommentary(body: string): string {
  const wordChar = /[\p{L}\p{N}]/u;
  return forLinkedIn(body).replace(/[\\|{}@[\]()<>*_~#]/g, (ch, i: number, text: string) => {
    const hashtag = ch === "#" && wordChar.test(text[i + 1] ?? "") && !wordChar.test(text[i - 1] ?? "");
    return hashtag ? ch : `\\${ch}`;
  });
}

/** Uploads a PDF as a LinkedIn document owned by the member, ready to attach. */
export async function uploadDocument(token: string, owner: string, pdf: Blob): Promise<string> {
  const init = await rest(token, "/documents?action=initializeUpload", {
    method: "POST",
    body: JSON.stringify({ initializeUploadRequest: { owner } }),
  });
  const { value } = (await init.json()) as { value: { uploadUrl: string; document: string } };

  const put = await fetch(value.uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/octet-stream" },
    body: pdf,
  });
  if (!put.ok) throw await apiError(put);

  await waitUntilAvailable(token, value.document);
  return value.document;
}

async function waitUntilAvailable(token: string, documentUrn: string): Promise<void> {
  const deadline = Date.now() + 40_000;
  while (Date.now() < deadline) {
    const res = await rest(token, `/documents/${encodeURIComponent(documentUrn)}`, { method: "GET" });
    const { status } = (await res.json()) as { status?: string };
    if (status === "AVAILABLE") return;
    if (status === "PROCESSING_FAILED") throw new Error("LinkedIn couldn't process the carousel PDF.");
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error("LinkedIn is still processing the carousel PDF. Nothing was posted; try Publish again in a minute.");
}

/** Publishes a public post and returns its URN (urn:li:share:… or urn:li:ugcPost:…). */
export async function createPost(
  token: string,
  author: string,
  commentary: string,
  document?: { urn: string; title: string },
): Promise<string> {
  const res = await rest(token, "/posts", {
    method: "POST",
    body: JSON.stringify({
      author,
      commentary,
      visibility: "PUBLIC",
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      ...(document && { content: { media: { id: document.urn, title: document.title } } }),
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });
  const urn = res.headers.get("x-restli-id");
  if (!urn) throw new Error("LinkedIn accepted the post but sent back no ID. Check your profile before publishing again.");
  return urn;
}

export function postUrl(urn: string): string {
  return `https://www.linkedin.com/feed/update/${urn}/`;
}

async function rest(token: string, path: string, init: RequestInit): Promise<Response> {
  const res = await fetch(`${API}/rest${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "LinkedIn-Version": VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw await apiError(res);
  return res;
}

// Thrown as plain Errors (no `status`), so friendlyError passes the text through
// instead of blaming an API key.
async function apiError(res: Response): Promise<Error> {
  const text = await res.text().catch(() => "");
  let detail = text;
  try {
    detail = (JSON.parse(text) as { message?: string }).message ?? text;
  } catch {}
  if (res.status === 401) return new Error("LinkedIn rejected the saved sign-in. Reconnect LinkedIn in Settings.");
  if (res.status === 429) return new Error("LinkedIn's posting limit for today is used up. Try again tomorrow.");
  return new Error(`LinkedIn said (HTTP ${res.status}): ${detail.slice(0, 300) || "no details"}`);
}
