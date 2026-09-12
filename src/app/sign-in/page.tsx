export const dynamic = "force-dynamic";

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const params = await searchParams;
  const error = params.error === "1";
  const next = typeof params.next === "string" ? params.next : "/";

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div className="panel" style={{ width: "100%", maxWidth: 380 }}>
        <div className="wordmark" style={{ marginBottom: 6 }}>
          <span className="dot" aria-hidden />
          Signal Desk
        </div>
        <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 22 }}>
          Monitor the wire, write posts worth reading.
        </p>

        <form action="/api/auth/login" method="post">
          <input type="hidden" name="next" value={next} />
          <label className="lbl" htmlFor="password">
            Passphrase
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className="field"
            autoFocus
            autoComplete="current-password"
          />
          {error && (
            <p className="notice" style={{ marginTop: 12, borderColor: "var(--danger)" }}>
              That passphrase didn&rsquo;t match. Try again.
            </p>
          )}
          <button type="submit" className="btn btn-primary" style={{ marginTop: 18, width: "100%", justifyContent: "center" }}>
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}
