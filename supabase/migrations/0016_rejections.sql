-- Stories the monitor found but dropped before scoring (too old, or no readable
-- page), so the Rejected page can show everything a source turned up, not only
-- what was scored. One row per URL: a feed repeats an old entry every pass, and
-- the first sighting is enough. Idempotent.

create table if not exists rejections (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  url_hash text not null unique,
  title text,
  source_id uuid references sources (id) on delete set null,
  source_name text,
  reason text not null check (reason in ('too_old', 'unreadable')),
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists rejections_created_idx on rejections (created_at desc);

alter table rejections enable row level security;
