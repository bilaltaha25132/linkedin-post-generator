import { env } from "@/lib/env";

// Signed session cookie. HMAC-SHA256 via Web Crypto so the same code verifies in
// both edge middleware and Node route handlers.

export const SESSION_COOKIE = "lpg_session";
const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const encoder = new TextEncoder();

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(env.authSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function b64url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

export async function createSessionToken(ttlMs = DEFAULT_TTL_MS): Promise<string> {
  const payload = b64url(encoder.encode(JSON.stringify({ exp: Date.now() + ttlMs })));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(), encoder.encode(payload));
  return `${payload}.${b64url(new Uint8Array(sig))}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;

  const expected = await crypto.subtle.sign("HMAC", await hmacKey(), encoder.encode(payload));
  if (b64url(new Uint8Array(expected)) !== sig) return false;

  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { exp: number };
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

/** Constant-time password check, so a wrong guess can't be timed. */
export async function passwordMatches(candidate: string): Promise<boolean> {
  const a = await sha256(candidate);
  const b = await sha256(env.appPassword());
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function sha256(text: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(text)));
}
