-- The Study tab's rescan: each program's official page is re-read on a
-- schedule (src/lib/study/rescan.ts). study_checks keeps the latest read per
-- program; study_changes keeps every time the deadline dates, scores or fees
-- on a page moved, so the Changes view can show before and after. Idempotent.

create table if not exists study_checks (
  program_id       text primary key,
  url              text not null,
  checked_at       timestamptz not null default now(),
  -- ok: page read; blocked: refused or bot-challenged (never bypassed); failed: error or timeout; skipped: PDF or no page.
  status           text not null check (status in ('ok','blocked','failed','skipped')),
  http_status      integer,
  -- match: the catalog's closing date is on the page; differs: dates found, none of them ours; no-dates: nothing date-like near a deadline word.
  verdict          text check (verdict in ('match','differs','no-dates')),
  signals          text[] not null default '{}',
  snippets         text[] not null default '{}',
  signals_hash     text,
  last_ok_at       timestamptz,
  last_changed_at  timestamptz,
  error            text
);
alter table study_checks enable row level security;
create index if not exists study_checks_checked_at on study_checks (checked_at);

create table if not exists study_changes (
  id               bigint generated always as identity primary key,
  program_id       text not null,
  url              text not null,
  detected_at      timestamptz not null default now(),
  added            text[] not null default '{}',
  removed          text[] not null default '{}',
  before_snippets  text[] not null default '{}',
  after_snippets   text[] not null default '{}',
  notified         boolean not null default false
);
alter table study_changes enable row level security;
create index if not exists study_changes_detected_at on study_changes (detected_at desc);
