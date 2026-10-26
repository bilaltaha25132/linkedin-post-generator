-- A queued run that hits something only he can do (a sign-in, a CAPTCHA, an
-- email code) now waits for him instead of ending: status "waiting", the reason
-- in blocker, and his answer from Signal Desk in reply ("go" or "skip"), which
-- the agent polls. activity is the step it's on, for the live view.

alter table agent_runs drop constraint if exists agent_runs_status_check;
alter table agent_runs add constraint agent_runs_status_check
  check (status in ('running', 'waiting', 'submitted', 'ready', 'needs_you', 'stopped', 'failed', 'done'));

alter table agent_runs add column if not exists activity text;
alter table agent_runs add column if not exists reply text;
alter table agent_runs drop constraint if exists agent_runs_reply_check;
alter table agent_runs add constraint agent_runs_reply_check check (reply is null or reply in ('go', 'skip'));
