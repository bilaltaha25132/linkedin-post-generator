// Runs in the jobs workflow. Some job boards hang every request from Vercel's
// addresses, so this runner fetches their pages and posts the bodies back to the
// app, which parses them with the same pullers (src/lib/jobs/sources.ts).
//
//   APP_URL=… CRON_SECRET=… node scripts/relay.mjs jobs

const pass = process.argv[2];
const app = process.env.APP_URL;
const auth = { Authorization: `Bearer ${process.env.CRON_SECRET}` };
if (!app || !process.env.CRON_SECRET || pass !== "jobs") {
  console.error("Usage: APP_URL=… CRON_SECRET=… node scripts/relay.mjs jobs");
  process.exit(1);
}

const plan = await fetch(`${app}/api/public/cron/${pass}/relay`, { headers: auth }).then((r) => r.json());
if (!plan.ok) {
  console.error("Plan failed:", plan.error);
  process.exit(1);
}

let failed = 0;
for (const source of plan.sources) {
  const responses = [];
  for (const { url, headers } of source.requests) {
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(25_000) });
      if (res.ok) responses.push({ url, body: await res.text() });
      else console.log(`  ${source.name}: HTTP ${res.status} from ${new URL(url).host}`);
    } catch (err) {
      console.log(`  ${source.name}: ${err.message}`);
    }
    // One request at a time, with a pause, as a person browsing would.
    await new Promise((r) => setTimeout(r, 500));
  }
  const res = await fetch(`${app}/api/public/cron/${pass}/relay`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ id: source.id, responses }),
  });
  const out = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
  console.log(`${source.name}: ${out.ok ? `pulled ${out.pulled}, added ${out.added}` : `failed: ${out.error}`}`);
  if (!out.ok) failed++;
}
console.log(`${plan.sources.length} relayed ${pass} sources, ${failed} failed.`);
