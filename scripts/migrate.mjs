// Apply every SQL file in supabase/migrations/ (in filename order) to the
// database at SUPABASE_DB_URL. Migrations are idempotent, so this is safe to
// re-run.
//
//   node --env-file=.env.local scripts/migrate.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../..");
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");

async function main() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error("Missing SUPABASE_DB_URL in .env.local (Supabase → Connect → URI).");
    process.exit(1);
  }

  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      await client.query(sql);
      console.log(`  ✓ applied ${file}`);
    }
    // Make the REST API pick up the new tables/functions immediately.
    await client.query("notify pgrst, 'reload schema';");
    console.log("Done. Schema applied and API reload signalled.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
