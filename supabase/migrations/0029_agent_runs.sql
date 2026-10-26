-- One row per job the browser agent works on, for the Applications tab: how it
-- ended, what it put in the form, and a short read on the company and the role.
-- Private like the rest of the apply kit: RLS on, no policies. Idempotent.

create table if not exists agent_runs (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid references jobs on delete cascade,
  status          text not null default 'running'
                  check (status in ('running', 'submitted', 'ready', 'needs_you', 'stopped', 'failed', 'done')),
  auto_submit     boolean not null default false,
  steps           int not null default 0,
  start_url       text,
  final_url       text,
  summary         text,
  blocker         text,
  fields          jsonb not null default '[]',
  company_summary text,
  role_summary    text,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  updated_at      timestamptz not null default now()
);
alter table agent_runs enable row level security;
create index if not exists agent_runs_started_idx on agent_runs (started_at desc);
create index if not exists agent_runs_job_idx on agent_runs (job_id, started_at desc);
