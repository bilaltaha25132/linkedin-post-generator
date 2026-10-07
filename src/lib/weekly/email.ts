import "server-only";

import { emailConfigured, sendEmail } from "@/lib/notify/email";
import { slotLabel } from "@/lib/plan/slot";
import { buildWeeklyReport, type WeeklyReport } from "@/lib/weekly/report";

/** Builds the report and emails it. Returns null when email isn't set up. */
export async function sendWeeklyReport(baseUrl: string, now = Date.now()): Promise<WeeklyReport | null> {
  if (!emailConfigured()) return null;
  const report = await buildWeeklyReport(now);
  const sections = reportSections(report, baseUrl);
  const html = `<div style="max-width:600px;margin:0 auto;padding:24px;background:#f1f0ea;font-family:system-ui;color:#1a1d22;">
    <div style="font:600 22px Georgia,serif;margin-bottom:4px;">Your week</div>
    <div style="font:13px system-ui;color:#5b5f66;margin-bottom:18px;">Week of ${esc(report.weekOf)}. <a href="${baseUrl}/week" style="color:#2b6bcc;">Open in Signal Desk</a></div>
    ${sections
      .map(
        (s) => `<div style="margin-bottom:18px;">
      <div style="font:600 15px system-ui;margin-bottom:6px;">${esc(s.title)}</div>
      ${s.lines.map((l) => `<p style="font:14px/1.5 system-ui;margin:0 0 6px;white-space:pre-wrap;">${l.href ? `<a href="${l.href}" style="color:#2b6bcc;">${esc(l.text)}</a>` : esc(l.text)}</p>`).join("")}
    </div>`,
      )
      .join("")}
  </div>`;
  const text = sections.map((s) => `${s.title}\n${s.lines.map((l) => (l.href ? `${l.text} (${l.href})` : l.text)).join("\n")}`).join("\n\n");
  await sendEmail(`Your week: ${headline(report)}`, html, text);
  return report;
}

function headline(r: WeeklyReport): string {
  const posts = `${r.lastWeek.posts} post${r.lastWeek.posts === 1 ? "" : "s"}`;
  const reach = r.lastWeek.medianMultiplier !== null ? `, ${r.lastWeek.medianMultiplier.toFixed(1)}x your usual reach` : "";
  return `${posts} last week${reach}`;
}

interface Line {
  text: string;
  href?: string;
}

/** The report as titled lines, shared by the email. */
export function reportSections(r: WeeklyReport, baseUrl: string): { title: string; lines: Line[] }[] {
  const lw = r.lastWeek;
  const last: Line[] = [{ text: `${lw.posts} post${lw.posts === 1 ? "" : "s"} published.` }];
  if (lw.impressions !== null) {
    last.push({
      text:
        `${lw.impressions.toLocaleString("en")} impressions` +
        (lw.impressionsBefore ? ` (${pct(lw.impressions, lw.impressionsBefore)} on the week before)` : "") +
        (lw.newFollowers !== null ? `, ${lw.newFollowers} new followers.` : "."),
    });
  }
  if (lw.best) last.push({ text: `Best: "${lw.best.text}" at ${lw.best.multiplier.toFixed(1)}x your median reach.`, href: lw.best.url ?? undefined });
  if (lw.searchAppearances !== null) {
    last.push({ text: `${lw.searchAppearances} search appearances${lw.foundBy.length ? `, found for ${lw.foundBy.slice(0, 4).join(", ")}` : ""}.` });
  }
  if (r.uploadDue) last.push({ text: "Upload this week's LinkedIn analytics export so next week's numbers are real.", href: `${baseUrl}/plan` });

  const sections = [
    { title: "Last week", lines: last },
    {
      title: "This week's plan",
      lines: r.plan.length
        ? r.plan.map((s) => ({
            text: `${s.slot ? `${slotLabel(new Date(s.slot))}: ` : ""}${s.format === "carousel" ? "Carousel on " : ""}${s.title}`,
            href: `${baseUrl}${s.href}`,
          }))
        : [{ text: "Nothing strong on the wire yet. Write from your own work this week.", href: `${baseUrl}/write` }],
    },
    {
      title: "People",
      lines: [
        { text: `${r.people.replies} comment${r.people.replies === 1 ? "" : "s"} on your posts waiting for a reply, ${r.people.roundsDue} round${r.people.roundsDue === 1 ? "" : "s"} due.`, href: `${baseUrl}/engage` },
        ...r.people.warm.map((w) => ({ text: `Connect with ${w.title}: ${w.sub}`, href: `${baseUrl}${w.href}` })),
      ],
    },
    {
      title: "Jobs and leads",
      lines: [
        ...r.jobs.map((j) => ({ text: `${j.title} (${j.sub})`, href: `${baseUrl}${j.href}` })),
        ...r.leads.map((l) => ({ text: `${l.title} (${l.sub})`, href: `${baseUrl}${l.href}` })),
        ...r.nudges.map((n) => ({ text: n })),
        ...(!r.jobs.length && !r.leads.length && !r.nudges.length ? [{ text: "No strong new roles or leads this week." }] : []),
      ],
    },
    { title: "One experiment", lines: [{ text: r.experiment }] },
  ];
  if (r.progress) {
    const p = r.progress;
    sections.push({
      title: "Top Voice progress",
      lines: [
        {
          text:
            `Posting streak: ${p.streakWeeks} week${p.streakWeeks === 1 ? "" : "s"}. ` +
            (p.onLane !== null ? `${Math.round(p.onLane * 100)}% of last month's posts on-lane, ` : "") +
            (p.ownWork !== null ? `${Math.round(p.ownWork * 100)}% showing your own work, ` : "") +
            `${p.comments30} comments given.`,
        },
      ],
    });
  }
  return sections;
}

function pct(now: number, before: number): string {
  const p = Math.round(((now - before) / before) * 100);
  return `${p >= 0 ? "+" : ""}${p}%`;
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}
