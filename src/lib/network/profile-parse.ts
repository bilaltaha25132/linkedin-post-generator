import { strFromU8, unzipSync } from "fflate";

import { parseCsv } from "@/lib/plan/parse";

// Reads his profile out of the "Get a copy of your data" archive, in the
// browser, as plain text for the review: Profile, Positions, Skills, Education.

const FILES = /(^|\/)(profile|positions|skills|education|certifications|projects)\.csv$/i;

function table(csv: string): Record<string, string>[] {
  const rows = parseCsv(csv.replace(/^\uFEFF/, ""));
  const header = rows[0]?.map((h) => h.trim().toLowerCase()) ?? [];
  return rows
    .slice(1)
    .filter((r) => r.some((c) => c.trim()))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
}

export function parseProfileArchive(bytes: Uint8Array): string {
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error("That isn't a .zip. Upload the archive LinkedIn emailed you.");
  const files = unzipSync(bytes, { filter: (f) => FILES.test(f.name) });
  const get = (name: string) => {
    const key = Object.keys(files).find((f) => new RegExp(`(^|/)${name}\.csv$`, "i").test(f));
    return key ? table(strFromU8(files[key])) : [];
  };
  const profile = get("profile")[0];
  if (!profile) throw new Error("No Profile.csv in that archive. Request the archive with Profile (or Complete) selected.");

  const parts: string[] = [];
  if (profile["headline"]) parts.push(`Headline: ${profile["headline"]}`);
  if (profile["geo location"]) parts.push(`Location: ${profile["geo location"]}`);
  if (profile["summary"]) parts.push(`About:\n${profile["summary"]}`);

  const positions = get("positions");
  if (positions.length) {
    parts.push(
      "Experience:\n" +
        positions
          .map((p) => {
            const when = [p["started on"], p["finished on"] || "present"].filter(Boolean).join(" to ");
            const head = [p["title"], p["company name"]].filter(Boolean).join(", ");
            return `- ${head}${when ? ` (${when})` : ""}${p["location"] ? `, ${p["location"]}` : ""}${p["description"] ? `\n  ${p["description"].replace(/\n+/g, "\n  ")}` : ""}`;
          })
          .join("\n"),
    );
  }
  const projects = get("projects");
  if (projects.length) {
    parts.push("Projects:\n" + projects.map((p) => `- ${p["title"]}${p["description"] ? `: ${p["description"]}` : ""}`).join("\n"));
  }
  const skills = get("skills").map((s) => s["name"]).filter(Boolean);
  if (skills.length) parts.push(`Skills: ${skills.join(", ")}`);
  const education = get("education");
  if (education.length) {
    parts.push(
      "Education:\n" +
        education.map((e) => `- ${[e["degree name"], e["school name"]].filter(Boolean).join(", ")}${e["end date"] ? ` (${e["end date"]})` : ""}`).join("\n"),
    );
  }
  const certs = get("certifications").map((c) => c["name"]).filter(Boolean);
  if (certs.length) parts.push(`Certifications: ${certs.join(", ")}`);
  return parts.join("\n\n");
}
