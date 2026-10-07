import { Briefcase, Link2, TriangleAlert } from "lucide-react";

import { JobProfileForm } from "@/components/job-profile-form";
import { LinkedInDisconnect } from "@/components/linkedin-disconnect";
import { PageHeader } from "@/components/page-header";
import { SetupNotice } from "@/components/setup-notice";
import { getJobProfile } from "@/lib/jobs/queries";
import type { JobProfile } from "@/lib/jobs/types";
import { RECONNECT_WINDOW_DAYS, daysLeft, getLinkedInAccount, type LinkedInAccount } from "@/lib/publish/queries";
import { supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// What /api/linkedin/callback reports back, as ?linkedin=<outcome>.
const OUTCOMES: Record<string, { text: string; danger?: boolean }> = {
  connected: { text: "LinkedIn is connected. Publish from any post card." },
  cancelled: { text: "Cancelled on LinkedIn's screen. Nothing changed." },
  denied: {
    text: "LinkedIn didn't grant access. Check the developer app still has both products, then try again.",
    danger: true,
  },
  expired: { text: "That sign-in timed out or started in another tab. Connect again from here.", danger: true },
  failed: { text: "Connecting LinkedIn failed.", danger: true },
};

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const { linkedin, reason } = await searchParams;
  const outcome = typeof linkedin === "string" ? OUTCOMES[linkedin] : undefined;
  const configured = supabaseConfigured();
  const keysSet = Boolean(
    process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET && process.env.TOKEN_ENCRYPTION_KEY,
  );

  let account: LinkedInAccount | null = null;
  let loadError: string | null = null;
  let profile: JobProfile | null = null;
  let profileError: string | null = null;
  if (configured) {
    const [linkedIn, jobProfile] = await Promise.allSettled([getLinkedInAccount(), getJobProfile()]);
    if (linkedIn.status === "fulfilled") account = linkedIn.value;
    else loadError = errorText(linkedIn.reason);
    if (jobProfile.status === "fulfilled") profile = jobProfile.value;
    else profileError = errorText(jobProfile.reason);
  }

  return (
    <>
      <PageHeader title="Settings" eyebrow="Desk">
        Connections Signal Desk uses on your behalf, and the profile your job matches are scored against.
      </PageHeader>

      {!configured ? (
        <SetupNotice />
      ) : (
        <div className="stack">
          <section className="panel stack-sm reveal">
            <div className="panel-head" style={{ marginBottom: 0 }}>
              <span className="panel-icon">
                <Link2 aria-hidden />
              </span>
              <h2>LinkedIn</h2>
              <p>Publish a post or carousel to your profile straight from its card. Each one goes out only when you confirm it.</p>
            </div>

            {outcome && (
              <p className={outcome.danger ? "notice notice-danger" : "notice"} role="status">
                {outcome.danger && <TriangleAlert aria-hidden />}
                <span>
                  {outcome.text}
                  {outcome.danger && typeof reason === "string" && ` LinkedIn said: ${reason}`}
                </span>
              </p>
            )}

            {loadError ? (
              <p className="notice notice-danger" role="alert">
                <TriangleAlert aria-hidden />
                <span>
                  Couldn&rsquo;t read the connection ({loadError}). If the table is missing, run{" "}
                  <code>node --env-file=.env.local scripts/migrate.mjs</code>.
                </span>
              </p>
            ) : !keysSet ? (
              <p className="muted">
                Add <code>LINKEDIN_CLIENT_ID</code>, <code>LINKEDIN_CLIENT_SECRET</code> and{" "}
                <code>TOKEN_ENCRYPTION_KEY</code> to the environment first (see <code>docs/growth/linkedin-setup.md</code>).
              </p>
            ) : account ? (
              <ConnectedAccount account={account} />
            ) : (
              <div className="row">
                <a className="btn btn-primary" href="/api/linkedin/connect">
                  Connect LinkedIn
                </a>
                <span className="muted small">Opens LinkedIn&rsquo;s consent screen, then brings you back here.</span>
              </div>
            )}
          </section>

          <section className="panel stack-sm reveal" id="job-profile">
            <div className="panel-head" style={{ marginBottom: 0 }}>
              <span className="panel-icon">
                <Briefcase aria-hidden />
              </span>
              <h2>Job profile</h2>
              <p>What the Jobs tab looks for and how it ranks what it finds.</p>
            </div>
            {profile ? (
              <JobProfileForm profile={profile} />
            ) : (
              <p className="notice notice-danger" role="alert">
                <TriangleAlert aria-hidden />
                <span>
                  Couldn&rsquo;t read the job profile ({profileError}). If the table is missing, run{" "}
                  <code>node --env-file=.env.local scripts/migrate.mjs</code>.
                </span>
              </p>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function ConnectedAccount({ account }: { account: LinkedInAccount }) {
  const days = daysLeft(account);
  const until = new Date(account.expiresAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <>
      <p>
        Connected as <strong>{account.name ?? "your LinkedIn profile"}</strong>.{" "}
        <span className="muted">
          {days < 0 ? `Expired on ${until}.` : `Works until ${until} (${days} day${days === 1 ? "" : "s"} left).`}
        </span>
      </p>
      {days <= RECONNECT_WINDOW_DAYS && (
        <p className="muted small">
          LinkedIn gives self-serve apps no refresh token, so reconnect before it runs out. While you&rsquo;re signed
          in to LinkedIn it&rsquo;s one click, with no consent screen.
        </p>
      )}
      <div className="row">
        <a className={days <= RECONNECT_WINDOW_DAYS ? "btn btn-primary" : "btn"} href="/api/linkedin/connect">
          Reconnect
        </a>
        <LinkedInDisconnect />
      </div>
    </>
  );
}
