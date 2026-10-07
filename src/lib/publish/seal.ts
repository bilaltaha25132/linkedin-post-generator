import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { env } from "@/lib/env";

// AES-256-GCM, stored as "v1.<iv>.<tag>.<ciphertext>" in base64url. The tag
// makes a tampered or wrongly-keyed value fail loudly instead of decrypting to junk.

function key(): Buffer {
  const bytes = Buffer.from(env.linkedin().encryptionKey, "base64");
  if (bytes.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must be 32 random bytes, base64-encoded.");
  return bytes;
}

export function seal(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const parts = [iv, cipher.getAuthTag(), data].map((bytes) => bytes.toString("base64url"));
  return ["v1", ...parts].join(".");
}

export function unseal(sealed: string): string {
  const [version, iv, tag, data] = sealed.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("The saved LinkedIn token is unreadable. Reconnect LinkedIn in Settings.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  try {
    return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("The saved LinkedIn token doesn't match TOKEN_ENCRYPTION_KEY. Reconnect LinkedIn in Settings.");
  }
}
