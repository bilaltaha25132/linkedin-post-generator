-- LinkedIn Post Generator — initial schema
-- Single-user tool: all access is server-side via the service-role key.
-- RLS is enabled with no policies so the anon/public key can read nothing.

create extension if not exists vector;

-- Sources the monitor watches: a Firecrawl search query, an RSS feed, or a page URL.
create table if not exists sources (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('search', 'rss', 'url')),
  value      text not null,
  label      text,
  enabled    boolean not null default true,
  created_at timestamptz not null default now()
);

-- Items surfaced by the monitor, scored for how worth-posting-about they are.
create table if not exists discoveries (
  id               uuid primary key default gen_random_uuid(),
  url              text not null,
  url_hash         text not null unique,
  title            text,
  source_name      text,
  source_id        uuid references sources(id) on delete set null,
  published_at     timestamptz,
  snippet          text,
  content_md       text,
  topics           text[] not null default '{}',
  relevance_score  int,
  relevance_reason text,
  suggested_angle  text,
  embedding        vector(1024),
  status           text not null default 'new'
                     check (status in ('new', 'saved', 'dismissed', 'drafted', 'posted')),
  discovered_at    timestamptz not null default now()
);
create index if not exists discoveries_rank_idx on discoveries (status, relevance_score desc);
create index if not exists discoveries_embedding_idx on discoveries using hnsw (embedding vector_cosine_ops);

-- Drafted and published posts. Embedding powers the "don't repeat yourself" check.
create table if not exists posts (
  id           uuid primary key default gen_random_uuid(),
  discovery_id uuid references discoveries(id) on delete set null,
  body         text not null,
  variants     jsonb,
  status       text not null default 'draft' check (status in ('draft', 'posted')),
  embedding    vector(1024),
  external_url text,
  created_at   timestamptz not null default now(),
  posted_at    timestamptz
);
create index if not exists posts_status_idx on posts (status, created_at desc);
create index if not exists posts_embedding_idx on posts using hnsw (embedding vector_cosine_ops);

-- Reference material that teaches the generator Bilal's voice (blog posts, case
-- studies, past LinkedIn posts). Retrieved at generation time to steer style.
create table if not exists voice_corpus (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('linkedin', 'blog', 'work', 'note')),
  title      text,
  content    text not null,
  embedding  vector(1024),
  created_at timestamptz not null default now()
);
create index if not exists voice_corpus_embedding_idx on voice_corpus using hnsw (embedding vector_cosine_ops);

-- Cosine-similarity lookups. Distance is 0 (identical) .. 2; similarity = 1 - distance.
create or replace function match_posts(query_embedding vector(1024), match_count int)
returns table (id uuid, body text, status text, similarity float)
language sql stable as $$
  select p.id, p.body, p.status, 1 - (p.embedding <=> query_embedding) as similarity
  from posts p
  where p.embedding is not null
  order by p.embedding <=> query_embedding
  limit match_count;
$$;

create or replace function match_voice(query_embedding vector(1024), match_count int)
returns table (id uuid, kind text, title text, content text, similarity float)
language sql stable as $$
  select v.id, v.kind, v.title, v.content, 1 - (v.embedding <=> query_embedding) as similarity
  from voice_corpus v
  where v.embedding is not null
  order by v.embedding <=> query_embedding
  limit match_count;
$$;

alter table sources      enable row level security;
alter table discoveries  enable row level security;
alter table posts        enable row level security;
alter table voice_corpus enable row level security;
