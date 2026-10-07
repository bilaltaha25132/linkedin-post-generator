-- The Jobs tab: job boards and company ATS feeds, the job profile they're
-- scored against, and the jobs themselves. Idempotent.

-- Where jobs come from. A company's own ATS board (ashby, greenhouse, …) lists
-- every open role, so a role missing from two pulls in a row has closed. Boards
-- (remotive, himalayas, …) return a recent slice, so their jobs close by age.
create table if not exists job_sources (
  id             uuid primary key default gen_random_uuid(),
  kind           text not null,
  token          text not null default '',
  name           text not null,
  region         text,
  enabled        boolean not null default true,
  last_pulled_at timestamptz,
  last_ok        boolean,
  last_error     text,
  last_count     int,
  created_at     timestamptz not null default now(),
  unique (kind, token)
);
alter table job_sources enable row level security;

-- The single profile every job is scored against. `regions` is in priority order.
create table if not exists job_profile (
  id           int primary key default 1 check (id = 1),
  titles       text[] not null default '{}',
  must_have    text[] not null default '{}',
  nice_to_have text[] not null default '{}',
  regions      text[] not null default '{}',
  min_pay_usd  int,
  seniority    text,
  dealbreakers text[] not null default '{}',
  summary      text not null default '',
  embedding    vector(1024),
  updated_at   timestamptz not null default now()
);
alter table job_profile enable row level security;

create table if not exists jobs (
  id             uuid primary key default gen_random_uuid(),
  source         text not null,
  source_id      text not null,
  source_ref     uuid references job_sources on delete set null,
  source_credit  text,
  company        text not null,
  title          text not null,
  location_raw   text,
  countries      text[] not null default '{}',
  region         text,
  remote_scope   text not null default 'unknown',
  employment_type text,
  is_contract    boolean not null default false,
  pay_min        int,
  pay_max        int,
  currency       text,
  pay_period     text,
  url_apply      text not null,
  url_source     text,
  posted_at      timestamptz,
  first_seen_at  timestamptz not null default now(),
  last_seen_at   timestamptz not null default now(),
  missed_pulls   int not null default 0,
  closed_at      timestamptz,
  description    text,
  embedding      vector(1024),
  dedup_key      text not null,
  nationals_only boolean not null default false,
  visa_flag      text not null default 'unknown',
  score          int,
  score_detail   jsonb,
  scored_at      timestamptz,
  status         text not null default 'new'
                 check (status in ('new','saved','applied','interviewing','offer','closed','hidden')),
  notified_at    timestamptz,
  unique (source, source_id)
);
alter table jobs enable row level security;

create index if not exists jobs_open_score_idx on jobs (score desc nulls last) where closed_at is null;
create index if not exists jobs_dedup_idx on jobs (dedup_key);
create index if not exists jobs_source_ref_idx on jobs (source_ref) where closed_at is null;

insert into job_profile (id, titles, must_have, nice_to_have, regions, seniority, dealbreakers, summary)
values (
  1,
  array['AI Engineer','LLM Engineer','Applied AI Engineer','Full Stack AI Engineer','AI Agent Engineer',
        'Forward Deployed Engineer','Machine Learning Engineer','GenAI Engineer'],
  array['RAG','LangGraph','LLM agents','Python','TypeScript','pgvector','FastAPI','Next.js','PostgreSQL'],
  array['Docker','evals','LangChain','OpenAI API','vector databases','React','AWS','prompt engineering'],
  array['saudi','gulf','europe','remote','pakistan'],
  'mid',
  array['US citizens only','security clearance','data labelling','unpaid trial','staffing agency'],
  'Full Stack AI Engineer in Karachi, Pakistan. Builds production AI products end to end for real clients: '
  || 'an AI tourism concierge for Abu Dhabi (LangGraph, RAG, pgvector), an AI market-intelligence platform for a UK '
  || 'firm, an offline field app for a utility, and a RAG video-search system. Stack: RAG, LangGraph, agentic AI, '
  || 'pgvector, FastAPI, Next.js, Postgres, Docker. Wants AI or LLM engineering roles in Saudi Arabia or the Gulf '
  || '(on-site with sponsorship, or remote), Europe with visa sponsorship or remote-EMEA, or remote roles open to Pakistan.'
)
on conflict (id) do nothing;

-- Boards: open APIs and feeds that allow reading, each credited on its cards.
insert into job_sources (kind, token, name, region) values
  ('remotive',   '', 'Remotive', 'remote'),
  ('remoteok',   '', 'Remote OK', 'remote'),
  ('himalayas',  '', 'Himalayas', 'remote'),
  ('jobicy',     '', 'Jobicy', 'remote'),
  ('wwr',        '', 'We Work Remotely', 'remote'),
  ('arbeitnow',  '', 'Arbeitnow', 'europe'),
  ('hn',         '', 'HN Who is hiring', 'remote')
on conflict (kind, token) do nothing;

-- Company boards, verified live on 2026-10-07 (docs/growth/research/).
insert into job_sources (kind, token, name, region) values
  -- Saudi Arabia and the Gulf
  ('greenhouse', 'tamara', 'Tamara', 'gulf'),
  ('greenhouse', 'hala', 'Hala', 'gulf'),
  ('greenhouse', 'ai71jobs', 'AI71', 'gulf'),
  ('greenhouse', 'careem', 'Careem', 'gulf'),
  ('ashby', 'leantech', 'Lean Technologies', 'gulf'),
  ('ashby', 'sarjai', 'Sarj.ai', 'gulf'),
  ('ashby', 'ziina', 'Ziina', 'gulf'),
  ('ashby', 'thndr', 'Thndr', 'gulf'),
  ('workable', 'salla', 'Salla', 'gulf'),
  ('workable', 'foodics', 'Foodics', 'gulf'),
  ('workable', 'lucidya', 'Lucidya', 'gulf'),
  ('workable', 'mozn-ai', 'Mozn', 'gulf'),
  ('recruitee', 'unifonic', 'Unifonic', 'gulf'),
  ('pinpoint', 'tabby', 'Tabby', 'gulf'),
  ('smartrecruiters', 'Jisr', 'Jisr', 'gulf'),
  ('lever', 'ifm-us', 'MBZUAI IFM', 'gulf'),
  -- AI labs and tooling
  ('ashby', 'openai', 'OpenAI', 'global'),
  ('ashby', 'cohere', 'Cohere', 'global'),
  ('ashby', 'perplexity', 'Perplexity', 'global'),
  ('ashby', 'elevenlabs', 'ElevenLabs', 'global'),
  ('ashby', 'langchain', 'LangChain', 'global'),
  ('ashby', 'modal', 'Modal', 'global'),
  ('ashby', 'pinecone', 'Pinecone', 'global'),
  ('greenhouse', 'anthropic', 'Anthropic', 'global'),
  ('workable', 'huggingface', 'Hugging Face', 'global'),
  -- Europe
  ('ashby', 'mistral.ai', 'Mistral AI', 'europe'),
  ('ashby', 'AlephAlpha', 'Aleph Alpha', 'europe'),
  ('ashby', 'helsing', 'Helsing', 'europe'),
  ('ashby', 'synthesia', 'Synthesia', 'europe'),
  ('ashby', 'wayve', 'Wayve', 'europe'),
  ('ashby', 'black-forest-labs', 'Black Forest Labs', 'europe'),
  ('ashby', 'n8n', 'n8n', 'europe'),
  ('ashby', 'deepsetai', 'deepset', 'europe'),
  ('ashby', 'lovable', 'Lovable', 'europe'),
  ('ashby', 'photoroom', 'Photoroom', 'europe'),
  ('ashby', 'dust', 'Dust', 'europe'),
  ('ashby', 'langdock', 'Langdock', 'europe'),
  ('ashby', 'faculty', 'Faculty', 'europe'),
  ('ashby', 'nabla', 'Nabla', 'europe'),
  ('ashby', 'writer', 'Writer', 'europe'),
  ('ashby', 'harvey', 'Harvey', 'europe'),
  ('ashby', 'legora', 'Legora', 'europe'),
  ('ashby', 'doctolib', 'Doctolib', 'europe'),
  ('ashby', 'alan', 'Alan', 'europe'),
  ('ashby', 'qonto', 'Qonto', 'europe'),
  ('ashby', 'mollie', 'Mollie', 'europe'),
  ('ashby', 'miro', 'Miro', 'europe'),
  ('ashby', 'iceye', 'ICEYE', 'europe'),
  ('greenhouse', 'parloa', 'Parloa', 'europe'),
  ('greenhouse', 'isomorphiclabs', 'Isomorphic Labs', 'europe'),
  ('greenhouse', 'stabilityai', 'Stability AI', 'europe'),
  ('greenhouse', 'polyai', 'PolyAI', 'europe'),
  ('greenhouse', 'celonis', 'Celonis', 'europe'),
  ('greenhouse', 'adyen', 'Adyen', 'europe'),
  ('greenhouse', 'n26', 'N26', 'europe'),
  ('greenhouse', 'monzo', 'Monzo', 'europe'),
  ('greenhouse', 'jetbrains', 'JetBrains', 'europe'),
  ('greenhouse', 'datadog', 'Datadog', 'europe'),
  ('greenhouse', 'elastic', 'Elastic', 'europe'),
  ('greenhouse', 'sumup', 'SumUp', 'europe'),
  ('greenhouse', 'hellofresh', 'HelloFresh', 'europe'),
  ('lever', 'spotify', 'Spotify', 'europe'),
  ('lever', 'pigment', 'Pigment', 'europe'),
  ('personio', 'merantix', 'Merantix', 'europe'),
  ('teamtailor', 'tibber', 'Tibber', 'europe'),
  ('workable', 'pathwaycom', 'Pathway', 'europe')
on conflict (kind, token) do nothing;
