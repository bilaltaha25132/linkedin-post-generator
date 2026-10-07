import { Mail, TriangleAlert } from "lucide-react";

import { EmailReread } from "@/components/email-reread";
import type { EmailRow } from "@/lib/email/queries";

// LinkedIn emails worth turning on (Settings & Privacy → Notifications → Email),
// in the order they pay off.
const CHECKLIST = [
  ["Job alerts", "Set a daily alert in LinkedIn's job search for each place you target. Each new role becomes a scored card on Jobs."],
  ["Comments and mentions", "Each one shows up in Engage with a reply draft."],
  ["Posts from people you follow", "Ring the bell on your A and B people. Their new posts land in Engage while they're fresh."],
  ["Invitations and messages", "Invitations go to Network; messages from recruiters and clients go to Leads."],
  ["Search appearances", "The weekly count and who found you, for the weekly report."],
  ["Job application updates", "Rejections close the role in your tracker."],
] as const;

export function EmailBridgePanel({ emails, error, configured }: { emails: EmailRow[]; error: string | null; configured: boolean }) {
  const failed = emails.filter((e) => e.error);
  return (
    <section className="panel stack-sm reveal" id="email-bridge">
      <div className="panel-head" style={{ marginBottom: 0 }}>
        <span className="panel-icon">
          <Mail aria-hidden />
        </span>
        <h2>Email bridge</h2>
        <p>LinkedIn&rsquo;s own emails, forwarded from your Gmail, become job cards, Engage items and leads.</p>
      </div>

      {!configured && (
        <p className="muted">
          Add <code>EMAIL_INGEST_SECRET</code> to the environment and install the Gmail script. The steps are in{" "}
          <code>docs/email-bridge.md</code>.
        </p>
      )}
      {error && (
        <p className="notice notice-danger" role="alert">
          <TriangleAlert aria-hidden />
          <span>Couldn&rsquo;t read the forwarded emails ({error}).</span>
        </p>
      )}

      {emails.length > 0 ? (
        <>
          <p className="small">
            Last email {timeAgo(emails[0].received_at)}.
            {failed.length > 0 && ` ${failed.length} of the last ${emails.length} didn't parse.`}
          </p>
          <ul className="list-plain stack-xs">
            {emails.map((e) => (
              <li key={e.id} className="row small" style={{ flexWrap: "nowrap" }}>
                <span className={e.error ? "chip chip-rose" : "chip"}>{e.kind ?? "new"}</span>
                <span className="truncate" title={e.subject}>
                  {e.subject}
                </span>
                <span className="meta-mono push">{e.error ? "not parsed" : `${e.items} item${e.items === 1 ? "" : "s"}`}</span>
                {e.error && <EmailReread id={e.id} />}
              </li>
            ))}
          </ul>
        </>
      ) : (
        configured && <p className="muted small">No emails yet. The script sends new ones every 10 minutes.</p>
      )}

      <details>
        <summary className="small">Which LinkedIn emails to turn on</summary>
        <ul className="stack-xs small" style={{ marginTop: 8 }}>
          {CHECKLIST.map(([name, why]) => (
            <li key={name}>
              <strong>{name}.</strong> {why}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `${hours} h ago` : `${Math.round(hours / 24)} days ago`;
}
