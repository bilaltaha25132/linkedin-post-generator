import "server-only";

import { execFile } from "node:child_process";
import { access, chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { gunzipSync } from "fflate";

// Tectonic is a self-contained TeX engine. It fetches only the packages a
// document uses, so the resume never leaves this deployment; the package
// server sees file names, not content. /tmp keeps the binary and packages
// for as long as the function instance stays warm.
const VERSION = "0.17.0";
const ROOT = path.join(tmpdir(), "tectonic");
const CACHE = path.join(ROOT, "cache");

let binary: Promise<string> | null = null;

/** Tectonic runs XeTeX; Jake's Resume carries two pdfTeX-only lines that XeTeX doesn't need. */
export function forXetex(latex: string): string {
  return latex.replace(/^[ \t]*\\(input\{glyphtounicode\}|pdfgentounicode\s*=\s*1)/gm, "%$&");
}

/** The one file named `name` in an uncompressed tar. */
function untarOne(tar: Uint8Array, name: string): Uint8Array {
  for (let at = 0; at + 512 <= tar.length; ) {
    const header = tar.subarray(at, at + 512);
    const text = (from: number, to: number) => new TextDecoder().decode(header.subarray(from, to)).split("\0")[0];
    const entry = text(0, 100);
    if (!entry) break;
    const size = parseInt(text(124, 136).trim() || "0", 8);
    if (path.posix.basename(entry) === name) return tar.subarray(at + 512, at + 512 + size);
    at += 512 + Math.ceil(size / 512) * 512;
  }
  throw new Error(`${name} isn't in the Tectonic download.`);
}

async function install(): Promise<string> {
  if (process.env.TECTONIC_BIN) return process.env.TECTONIC_BIN;
  if (process.platform !== "linux" || process.arch !== "x64") {
    throw new Error("PDF builds run on the deployed app. Locally, set TECTONIC_BIN to a Tectonic binary.");
  }
  const bin = path.join(ROOT, "tectonic");
  try {
    await access(bin);
    return bin;
  } catch {}
  const url = `https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%40${VERSION}/tectonic-${VERSION}-x86_64-unknown-linux-musl.tar.gz`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Couldn't fetch the TeX engine (${res.status}).`);
  const tar = gunzipSync(new Uint8Array(await res.arrayBuffer()));
  await mkdir(ROOT, { recursive: true });
  await writeFile(bin, untarOne(tar, "tectonic"));
  await chmod(bin, 0o755);
  return bin;
}

/** TeX's own complaint, from the first "!" line, without the whole transcript. */
function texError(output: string): string {
  const lines = output.split(/\r?\n/);
  const bang = lines.findIndex((l) => l.startsWith("!"));
  if (bang >= 0) return lines.slice(bang, bang + 3).join("\n").trim();
  return lines.filter((l) => /^error:/.test(l)).join("\n").trim() || "The TeX engine stopped without saying why.";
}

/** Compiles a whole .tex document to PDF bytes. */
export async function compilePdf(latex: string): Promise<Uint8Array> {
  binary ??= install().catch((err) => {
    binary = null;
    throw err;
  });
  const bin = await binary;
  const dir = await mkdtemp(path.join(tmpdir(), "resume-"));
  try {
    await writeFile(path.join(dir, "resume.tex"), forXetex(latex));
    await new Promise<void>((resolve, reject) =>
      execFile(
        bin,
        ["-c", "minimal", "--untrusted", "--outdir", dir, "resume.tex"],
        {
          cwd: dir,
          timeout: 270_000,
          maxBuffer: 8 * 1024 * 1024,
          env: { ...process.env, HOME: ROOT, XDG_CACHE_HOME: CACHE, TECTONIC_CACHE_DIR: CACHE },
        },
        (err, stdout, stderr) => (err ? reject(new Error(err.killed ? "The PDF build ran out of time. Try again." : texError(`${stdout}\n${stderr}`))) : resolve()),
      ),
    );
    return new Uint8Array(await readFile(path.join(dir, "resume.pdf")));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
