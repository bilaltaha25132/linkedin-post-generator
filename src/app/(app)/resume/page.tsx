import { FileText, IdCard, ListChecks, TriangleAlert } from "lucide-react";

import { AddFactForm, FormFactsForm, MasterResumeForm, RemoveFactButton } from "@/components/apply-tools";
import { PageHeader } from "@/components/page-header";
import { SetupNotice } from "@/components/setup-notice";
import { getCandidateProfile, getLedger } from "@/lib/apply/queries";
import type { Ledger } from "@/lib/apply/types";
import { supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SECTION_LABEL = { experience: "Experience", project: "Projects", education: "Education" } as const;

export default async function ResumePage() {
  const data = supabaseConfigured() ? await load() : null;

  return (
    <>
      <PageHeader title="Resume" eyebrow="Career">
        Your master resume and the facts behind it. The apply kit tailors from here and only from here: it rewords and reorders, and holds back
        anything that isn&rsquo;t on this page.
      </PageHeader>

      {!data ? (
        <SetupNotice />
      ) : "error" in data ? (
        <p className="notice notice-danger" role="alert">
          <TriangleAlert aria-hidden />
          <span>
            Couldn&rsquo;t load your resume ({data.error}). If the tables are missing, run{" "}
            <code>node --env-file=.env.local scripts/migrate.mjs</code>.
          </span>
        </p>
      ) : (
        <div className="stack">
          <section className="panel stack-sm reveal" aria-labelledby="master-heading">
            <div className="panel-head" style={{ marginBottom: 0 }}>
              <span className="panel-icon">
                <FileText aria-hidden />
              </span>
              <h2 id="master-heading">Master resume</h2>
              <p>
                {data.ledger.master
                  ? `Saved ${data.ledger.master.updated_at.slice(0, 10)}. Paste a new version to replace it.`
                  : "Paste the .tex source of your resume. Jake's Resume and its forks are read best."}
              </p>
            </div>
            <MasterResumeForm hasMaster={Boolean(data.ledger.master)} />
          </section>

          {data.ledger.roles.length > 0 && (
            <section className="panel stack-sm reveal" aria-labelledby="ledger-heading">
              <div className="panel-head" style={{ marginBottom: 0 }}>
                <span className="panel-icon">
                  <ListChecks aria-hidden />
                </span>
                <h2 id="ledger-heading">What the kit may say</h2>
                <p>Every claim in a tailored resume, answer or letter has to trace back to a line here. Check it read your resume right.</p>
              </div>
              <LedgerList ledger={data.ledger} />
              <AddFactForm roles={data.ledger.roles.map((r) => ({ id: r.id, title: r.title, employer: r.employer }))} />
            </section>
          )}

          <section className="panel stack-sm reveal" aria-labelledby="facts-heading">
            <div className="panel-head" style={{ marginBottom: 0 }}>
              <span className="panel-icon">
                <IdCard aria-hidden />
              </span>
              <h2 id="facts-heading">Form facts</h2>
              <p>The answers every application asks for. Anything you leave blank is flagged on the form for you to answer.</p>
            </div>
            <FormFactsForm initial={data.profile} />
          </section>
        </div>
      )}
    </>
  );
}

function LedgerList({ ledger }: { ledger: Ledger }) {
  const loose = ledger.bullets.filter((b) => !b.role_id);
  const added = ledger.skills.filter((s) => s.origin === "added");
  return (
    <div className="stack-sm">
      {ledger.roles.map((r) => {
        const bullets = ledger.bullets.filter((b) => b.role_id === r.id);
        return (
          <div key={r.id} className="stack-xs">
            <p className="small">
              <strong>{[r.title, r.employer].filter(Boolean).join(", ")}</strong>{" "}
              <span className="muted">
                {SECTION_LABEL[r.section]}
                {r.start_date || r.end_date ? `, ${[r.start_date, r.end_date].filter(Boolean).join(" to ")}` : ""}
              </span>
            </p>
            {bullets.length > 0 && (
              <ul className="list-plain small apply-ledger">
                {bullets.map((b) => (
                  <li key={b.id}>
                    <span>{b.plain}</span>
                    {b.origin === "added" && <RemoveFactButton id={b.id} kind="bullet" />}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
      {loose.length > 0 && (
        <div className="stack-xs">
          <p className="small">
            <strong>Facts you added</strong>
          </p>
          <ul className="list-plain small apply-ledger">
            {loose.map((b) => (
              <li key={b.id}>
                <span>{b.plain}</span>
                <RemoveFactButton id={b.id} kind="bullet" />
              </li>
            ))}
          </ul>
        </div>
      )}
      {ledger.skills.length > 0 && (
        <p className="small">
          <strong>Skills</strong> <span className="muted">{ledger.skills.filter((s) => s.origin === "resume").map((s) => s.name).join(", ")}</span>
        </p>
      )}
      {added.length > 0 && (
        <ul className="list-plain small apply-ledger">
          {added.map((s) => (
            <li key={s.id}>
              <span>{s.name}</span>
              <RemoveFactButton id={s.id} kind="skill" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

async function load() {
  try {
    const [ledger, profile] = await Promise.all([getLedger(), getCandidateProfile()]);
    return { ledger, profile };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
