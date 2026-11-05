-- The Study tab: Master's programs in Germany he is following, and the
-- documents every application is built from. The program catalog itself is
-- public research and ships in src/lib/study/programs.json; only his own
-- progress, fit verdicts and notes live here. Idempotent.

create table if not exists study_tracked (
  program_id text primary key,
  stage      text not null default 'shortlist'
             check (stage in ('shortlist','preparing','applied','admitted','rejected','dropped')),
  intake     text not null default 'winter-2027'
             check (intake in ('summer-2027','winter-2027','later')),
  fit        text check (fit in ('best','possible','line','test','out')),
  fit_note   text not null default '',
  notes      text not null default '',
  updated_at timestamptz not null default now()
);
alter table study_tracked enable row level security;

create table if not exists study_documents (
  key        text primary key,
  done       boolean not null default false,
  note       text not null default '',
  updated_at timestamptz not null default now()
);
alter table study_documents enable row level security;
