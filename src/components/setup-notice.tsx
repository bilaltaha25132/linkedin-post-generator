import { Database } from "lucide-react";

export function SetupNotice() {
  return (
    <div className="empty empty-left reveal">
      <span className="empty-icon">
        <Database aria-hidden strokeWidth={1.75} />
      </span>
      <h3>Connect your database to begin</h3>
      <p>
        Signal Desk stores discoveries and posts in Supabase. Create a free project, then add its URL and
        service-role key to <code>.env.local</code>:
      </p>
      <pre>
        {`SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role key>`}
      </pre>
      <p>
        Then run the SQL in <code>supabase/migrations/</code> and restart. See <code>docs/setup.md</code> for the
        full walkthrough.
      </p>
    </div>
  );
}
