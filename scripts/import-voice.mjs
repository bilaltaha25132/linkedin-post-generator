// Rebuild the voice_corpus table from Bilal's real writing so the generator can
// imitate his voice. Sources: the portfolio blog + case-study data files, plus
// anything you drop into voice-corpus/ as .md or .txt.
//
//   node --env-file=.env.local scripts/import-voice.mjs
//
// Safe to re-run: it replaces the whole corpus each time.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../..");

// Portfolio data files. Override with PORTFOLIO_DATA_DIR if the path differs.
const PORTFOLIO_DATA_DIR =
  process.env.PORTFOLIO_DATA_DIR ?? "C:/Users/bilal/Desktop/Portfolio/portfolio/data";

const TS_SOURCES = [
  { file: "blog.ts", exportName: "blogPosts", kind: "blog" },
  { file: "work.ts", exportName: "workCases", kind: "work" },
];

function loadTsArray(filePath, exportName) {
  const src = fs.readFileSync(filePath, "utf8");
  const js = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", js)(mod, mod.exports);
  return mod.exports[exportName] ?? [];
}

function collectSamples() {
  const samples = [];

  for (const { file, exportName, kind } of TS_SOURCES) {
    const full = path.join(PORTFOLIO_DATA_DIR, file);
    if (!fs.existsSync(full)) {
      console.warn(`skip ${file}: not found at ${full}`);
      continue;
    }
    for (const item of loadTsArray(full, exportName)) {
      if (item?.content?.trim()) {
        samples.push({ kind, title: item.title ?? null, content: item.content.trim() });
      }
    }
  }

  const dir = path.join(ROOT, "voice-corpus");
  if (fs.existsSync(dir)) {
    for (const name of fs.readdirSync(dir)) {
      if (!/\.(md|txt)$/i.test(name)) continue;
      if (/^readme\.md$/i.test(name)) continue; // the folder's own instructions
      const content = fs.readFileSync(path.join(dir, name), "utf8").trim();
      if (content) samples.push({ kind: "linkedin", title: name.replace(/\.(md|txt)$/i, ""), content });
    }
  }

  return samples;
}

async function main() {
  const samples = collectSamples();
  if (samples.length === 0) {
    console.error("No voice samples found. Check PORTFOLIO_DATA_DIR or add files to voice-corpus/.");
    process.exit(1);
  }

  const embedder = new OpenAI({ apiKey: process.env.EMBEDDING_API_KEY, baseURL: process.env.EMBEDDING_BASE_URL });
  const dims = Number(process.env.EMBEDDING_DIMENSIONS ?? 1024);
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  console.log(`Embedding ${samples.length} samples…`);
  const rows = [];
  for (const s of samples) {
    const res = await embedder.embeddings.create({
      model: process.env.EMBEDDING_MODEL,
      input: `${s.title ?? ""}\n\n${s.content}`.slice(0, 8000),
      dimensions: dims,
    });
    rows.push({ ...s, embedding: res.data[0].embedding });
    console.log(`  ✓ ${s.kind}: ${s.title}`);
  }

  // Full refresh — the corpus is small and this keeps it clean.
  await db.from("voice_corpus").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  const { error } = await db.from("voice_corpus").insert(rows);
  if (error) throw new Error(error.message);

  console.log(`Done. voice_corpus now holds ${rows.length} samples.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
