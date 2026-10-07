-- Apply kit: the master resume, its facts ledger, form facts, tailored versions
-- and applications. Everything here is private; RLS is on with no policies, so
-- only the service role reads it. Idempotent.

create table if not exists resume_master (
  id          int primary key default 1 check (id = 1),
  latex       text not null,
  template    text,
  parsed_at   timestamptz,
  compiled_at timestamptz,
  pdf_path    text,
  updated_at  timestamptz not null default now()
);
alter table resume_master enable row level security;

-- Roles, projects and education from the resume. Employer, title and dates are
-- locked: tailoring may never change them.
create table if not exists ledger_roles (
  id         uuid primary key default gen_random_uuid(),
  section    text not null default 'experience' check (section in ('experience', 'project', 'education')),
  employer   text not null,
  title      text not null default '',
  start_date text,
  end_date   text,
  location   text,
  sort       int not null default 0
);
alter table ledger_roles enable row level security;

-- One bullet per row. `src_start`/`src_end` locate the bullet's LaTeX inside
-- resume_master.latex; facts he adds himself have none and origin 'added'.
create table if not exists ledger_bullets (
  id        uuid primary key default gen_random_uuid(),
  role_id   uuid references ledger_roles on delete cascade,
  section   text not null default 'experience',
  latex     text not null default '',
  plain     text not null,
  numbers   text[] not null default '{}',
  skills    text[] not null default '{}',
  origin    text not null default 'resume' check (origin in ('resume', 'added')),
  src_start int,
  src_end   int,
  sort      int not null default 0
);
alter table ledger_bullets enable row level security;
create index if not exists ledger_bullets_role_idx on ledger_bullets (role_id, sort);

-- Skills lines ("Languages: Python, SQL"), in resume order.
create table if not exists ledger_skills (
  id       uuid primary key default gen_random_uuid(),
  name     text not null unique,
  category text,
  origin   text not null default 'resume' check (origin in ('resume', 'added')),
  evidence uuid[] not null default '{}',
  sort     int not null default 0
);
alter table ledger_skills enable row level security;

-- Form facts: contact, links, notice, salary per region, languages, work
-- authorisation per country. Empty until he fills it in.
create table if not exists candidate_profile (
  id               int primary key default 1 check (id = 1),
  contact          jsonb not null default '{}',
  links            jsonb not null default '{}',
  notice_weeks     int,
  years_experience int,
  salary           jsonb not null default '{}',
  languages        jsonb not null default '[]',
  work_auth        jsonb not null default '{}',
  relocate         jsonb not null default '{}',
  updated_at       timestamptz not null default now()
);
alter table candidate_profile enable row level security;

create table if not exists resume_versions (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references jobs on delete cascade,
  plan        jsonb not null,
  checks      jsonb not null default '[]',
  latex       text not null,
  pdf_path    text,
  created_at  timestamptz not null default now(),
  accepted_at timestamptz
);
alter table resume_versions enable row level security;
create index if not exists resume_versions_job_idx on resume_versions (job_id, created_at desc);

create table if not exists applications (
  id                uuid primary key default gen_random_uuid(),
  job_id            uuid not null unique references jobs on delete cascade,
  resume_version_id uuid references resume_versions on delete set null,
  form              jsonb,
  answers           jsonb not null default '{}',
  cover_letter      text,
  status            text not null default 'draft' check (status in ('draft', 'submitted')),
  submitted_at      timestamptz,
  updated_at        timestamptz not null default now()
);
alter table applications enable row level security;

-- Free-text answers he approved, so new drafts stay consistent with old ones.
create table if not exists answer_bank (
  id         uuid primary key default gen_random_uuid(),
  job_id     uuid references jobs on delete set null,
  question   text not null,
  answer     text not null,
  embedding  vector(1024),
  created_at timestamptz not null default now()
);
alter table answer_bank enable row level security;
create index if not exists answer_bank_embedding_idx on answer_bank using hnsw (embedding vector_cosine_ops);

create or replace function match_answers(query_embedding vector(1024), match_count int)
returns table (question text, answer text, similarity float)
language sql stable as $$
  select question, answer, 1 - (embedding <=> query_embedding) as similarity
  from answer_bank
  where embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- Tailored PDFs, when compiled, go here; reads use signed URLs.
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;
