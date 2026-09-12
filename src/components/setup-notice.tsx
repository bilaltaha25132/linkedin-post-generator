export function SetupNotice() {
  return (
    <div className="empty" style={{ textAlign: "left" }}>
      <h3>Connect your database to begin</h3>
      <p style={{ marginBottom: 16 }}>
        Signal Desk stores discoveries and posts in Supabase. Create a free project, then add its
        URL and service-role key to <code>.env.local</code>:
      </p>
      <pre
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          background: "var(--surface-sunk)",
          padding: "14px 16px",
          borderRadius: 8,
          overflowX: "auto",
        }}
      >
        {`SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role key>`}
      </pre>
      <p style={{ marginTop: 16 }}>
        Then run the SQL in <code>supabase/migrations/</code> and restart. See{" "}
        <code>docs/setup.md</code> for the full walkthrough.
      </p>
    </div>
  );
}
