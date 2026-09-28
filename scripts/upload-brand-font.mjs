// Upload a licensed brand font (woff2) to the private Supabase bucket the
// carousel loads it from, via the auth-gated /api/brand-font route. The file
// never enters git, so a font whose licence forbids redistribution stays off
// the public repo. Without it, slides fall back to Inter Tight.
//
//   node --env-file=.env.local scripts/upload-brand-font.mjs path/to/font.woff2

import fs from "node:fs";

const BUCKET = "brand";
const OBJECT = "slide-font.woff2";

const [file] = process.argv.slice(2);
if (!file || !file.endsWith(".woff2")) {
  console.error("Usage: node --env-file=.env.local scripts/upload-brand-font.mjs <font.woff2>");
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const auth = { apikey: key, Authorization: `Bearer ${key}` };

// Creating an existing bucket fails harmlessly; the upload below upserts.
await fetch(`${url}/storage/v1/bucket`, {
  method: "POST",
  headers: { ...auth, "Content-Type": "application/json" },
  body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }),
});

const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${OBJECT}`, {
  method: "POST",
  headers: { ...auth, "Content-Type": "font/woff2", "x-upsert": "true" },
  body: fs.readFileSync(file),
});
if (!res.ok) {
  console.error(`Upload failed: HTTP ${res.status} ${await res.text()}`);
  process.exit(1);
}
console.log(`Uploaded ${file} to private bucket "${BUCKET}" as ${OBJECT}.`);
