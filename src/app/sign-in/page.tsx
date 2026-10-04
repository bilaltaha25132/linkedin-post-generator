import { ArrowRight, Lock, TriangleAlert } from "lucide-react";

import { LogoMark } from "@/components/logo";

export const dynamic = "force-dynamic";

const STEPS = [
  { title: "Monitor the wire", note: "Feeds, Hacker News and search, read on a schedule" },
  { title: "Score what matters", note: "Every item gets a signal score out of 100" },
  { title: "Draft in your voice", note: "Posts, carousels and articles that sound like you" },
];

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const params = await searchParams;
  const error = params.error === "1";
  const next = typeof params.next === "string" ? params.next : "/";

  return (
    <div className="auth">
      <div className="auth-form-col">
        <div className="brand-link">
          <LogoMark size={30} />
          <span>
            Signal <b>Desk</b>
          </span>
        </div>

        <div className="auth-center reveal">
          <span className="eyebrow">Welcome back</span>
          <h1>Sign in to your desk</h1>
          <p className="soft" style={{ marginTop: 6, marginBottom: 28 }}>
            Monitor the wire, write posts worth reading.
          </p>

          <form action="/api/auth/login" method="post" className="stack-sm">
            <input type="hidden" name="next" value={next} />
            <div>
              <label className="lbl" htmlFor="password">
                Passphrase
              </label>
              <div className="auth-input">
                <Lock aria-hidden />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoFocus
                  autoComplete="current-password"
                  aria-invalid={error || undefined}
                  aria-describedby={error ? "password-error" : undefined}
                />
              </div>
            </div>
            {error && (
              <p id="password-error" className="notice notice-danger" role="alert">
                <TriangleAlert aria-hidden />
                That passphrase didn&rsquo;t match. Try again.
              </p>
            )}
            <button type="submit" className="btn btn-primary btn-lg btn-block" style={{ marginTop: 8 }}>
              Enter <ArrowRight aria-hidden />
            </button>
          </form>
        </div>

        <p className="small muted">A private desk for one writer.</p>
      </div>

      <aside className="auth-art" aria-hidden>
        <div>
          <h2>Find the story worth telling.</h2>
          <p>Signal Desk reads the AI and software world for you, ranks what it finds, and drafts the post.</p>
        </div>
        <div className="auth-cards">
          {STEPS.map((step, i) => (
            <div key={step.title} className="auth-card">
              <b>{i + 1}</b>
              <span>
                {step.title}
                <small>{step.note}</small>
              </span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
