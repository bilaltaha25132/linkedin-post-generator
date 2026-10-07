-- Grow and Career: the email bridge, Engage, Leads, the Strategist and Network.
-- Design in docs/growth/data-model.md. Idempotent.

-- ── Email bridge ────────────────────────────────────────────────────────────
-- Raw LinkedIn emails pushed by his Gmail Apps Script, kept so parsers can be
-- re-run when a template changes. Tracking tokens are stripped before insert.
create table if not exists inbound_emails (
  id          uuid primary key default gen_random_uuid(),
  gmail_id    text not null unique,
  sender      text not null,
  subject     text not null default '',
  received_at timestamptz not null,
  body_text   text not null default '',
  kind        text,
  items       int not null default 0,
  parsed_at   timestamptz,
  error       text,
  created_at  timestamptz not null default now()
);
create index if not exists inbound_emails_received_idx on inbound_emails (received_at desc);

-- Comments, reactions, mentions and other notices about his own posts and profile.
create table if not exists engagement_events (
  id          uuid primary key default gen_random_uuid(),
  email_id    uuid references inbound_emails on delete cascade,
  kind        text not null check (kind in ('comment','reaction','mention','profile_view','follower','post_perf','invitation','message','post_alert')),
  actor_name  text,
  preview     text,
  post_url    text,
  occurred_at timestamptz not null default now(),
  done        boolean not null default false,
  reply_draft text
);
create index if not exists engagement_events_open_idx on engagement_events (occurred_at desc) where not done;

create table if not exists weekly_stats (
  week               date primary key,
  search_appearances int,
  found_by           text[] not null default '{}'
);

-- When he last opened each LinkedIn search link the app built for him.
create table if not exists link_opens (
  key       text primary key,
  opened_at timestamptz not null default now()
);

-- ── Engage ──────────────────────────────────────────────────────────────────
-- People and pages worth being visible to. Added by him; a profile URL is stored
-- only once he's confirmed it opens the right person.
create table if not exists watch_people (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  profile_url     text,
  kind            text not null default 'person' check (kind in ('person','company')),
  tier            text not null default 'B' check (tier in ('A','B','C','target','warm')),
  topics          text[] not null default '{}',
  notes           text,
  bell            boolean not null default false,
  last_visited_at timestamptz,
  created_at      timestamptz not null default now()
);

-- Posts he shared in (share sheet, bookmarklet, paste). Nothing is fetched from LinkedIn.
create table if not exists captured_posts (
  id                   uuid primary key default gen_random_uuid(),
  url                  text unique,
  activity_id          text,
  posted_at            timestamptz,
  author_name          text,
  author_id            uuid references watch_people on delete set null,
  text                 text not null default '',
  via                  text not null default 'paste' check (via in ('share','bookmarklet','paste','email')),
  matched_discovery_id uuid references discoveries on delete set null,
  embedding            vector(1024),
  created_at           timestamptz not null default now()
);
create index if not exists captured_posts_created_idx on captured_posts (created_at desc);

create table if not exists comment_drafts (
  id               uuid primary key default gen_random_uuid(),
  captured_post_id uuid not null references captured_posts on delete cascade,
  shape            text not null,
  body             text not null,
  rubric           jsonb,
  score            int,
  edited_body      text,
  posted_at        timestamptz,
  created_at       timestamptz not null default now()
);
create index if not exists comment_drafts_post_idx on comment_drafts (captured_post_id);

-- ── Network ─────────────────────────────────────────────────────────────────
-- Suggestions and the actions he logs. Nothing here sends anything to LinkedIn.
create table if not exists connections (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  profile_url text unique,
  headline    text,
  reason      text,
  source      text not null default 'manual',
  note_draft  text,
  status      text not null default 'suggested'
              check (status in ('suggested','incoming','sent','accepted','talking','ignored')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists connections_name_source_idx on connections (lower(name), source) where profile_url is null;

-- His LinkedIn profile text (headline, About, experience) and its last review.
create table if not exists profile_review (
  id          int primary key default 1 check (id = 1),
  profile     text not null default '',
  review      jsonb,
  embedding   vector(1024),
  reviewed_at timestamptz,
  updated_at  timestamptz not null default now()
);
insert into profile_review (id) values (1) on conflict (id) do nothing;

-- ── Strategist ──────────────────────────────────────────────────────────────
create table if not exists pillars (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text not null,
  target_share real not null default 0.33,
  position     int not null default 0,
  embedding    vector(1024)
);
insert into pillars (name, description, target_share, position)
select * from (values
  ('AI engineering in practice',
   'RAG, agents, evals, cost and latency, pgvector, production failures and fixes, how to build LLM systems that work.',
   0.40::real, 1),
  ('AI news with an engineer''s take',
   'New model releases, research papers, tooling launches and benchmarks, and what they change for people building with AI.',
   0.35::real, 2),
  ('Build in public and career',
   'His own projects and client work, numbers from what he shipped, lessons from working remotely for global teams, career in AI engineering.',
   0.25::real, 3)
) as seed(name, description, target_share, position)
where not exists (select 1 from pillars);

alter table posts add column if not exists pillar_id uuid references pillars on delete set null;

-- Every post he published, from any source, joined to our draft when matched.
create table if not exists linkedin_posts (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid references posts on delete set null,
  urn          text unique,
  url          text,
  published_at timestamptz,
  text         text,
  format       text,
  pillar_id    uuid references pillars on delete set null,
  hook_type    text,
  created_at   timestamptz not null default now()
);

-- One row per post per import day.
create table if not exists post_metrics (
  linkedin_post_id uuid not null references linkedin_posts on delete cascade,
  day              date not null default current_date,
  impressions      int,
  reached          int,
  reactions        int,
  comments         int,
  reposts          int,
  saves            int,
  sends            int,
  profile_views    int,
  followers_gained int,
  primary key (linkedin_post_id, day)
);

create table if not exists account_daily (
  day             date primary key,
  impressions     int,
  engagements     int,
  new_followers   int,
  total_followers int
);

create table if not exists audience_snapshot (
  imported_at date not null default current_date,
  kind        text not null,
  label       text not null,
  share       real not null,
  primary key (imported_at, kind, label)
);

-- ── Leads ───────────────────────────────────────────────────────────────────
create table if not exists leads (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('hiring_post','client_post','gig','contract_role','recruiter_message')),
  source       text not null,
  url          text unique,
  posted_at    timestamptz,
  who          text,
  wants        text,
  stack        text[] not null default '{}',
  region       text,
  remote       text,
  budget       text,
  snippet      text,
  score        int,
  score_detail jsonb,
  opener       text,
  status       text not null default 'new' check (status in ('new','contacted','talking','won','lost','hidden')),
  nudge_at     timestamptz,
  notified_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists leads_open_idx on leads (score desc nulls last) where status in ('new','contacted','talking');

alter table inbound_emails    enable row level security;
alter table engagement_events enable row level security;
alter table weekly_stats      enable row level security;
alter table link_opens        enable row level security;
alter table watch_people      enable row level security;
alter table captured_posts    enable row level security;
alter table comment_drafts    enable row level security;
alter table connections       enable row level security;
alter table profile_review    enable row level security;
alter table pillars           enable row level security;
alter table linkedin_posts    enable row level security;
alter table post_metrics      enable row level security;
alter table account_daily     enable row level security;
alter table audience_snapshot enable row level security;
alter table leads             enable row level security;
