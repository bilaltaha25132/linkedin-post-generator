-- Publishing to LinkedIn through the official API ("Share on LinkedIn").
-- Idempotent.

-- The one connected member. The access token is AES-GCM encrypted with
-- TOKEN_ENCRYPTION_KEY before it lands here, so a database dump alone can't post.
create table if not exists linkedin_auth (
  id          int primary key default 1 check (id = 1),
  person_urn  text not null,
  name        text,
  token       text not null,
  scope       text,
  expires_at  timestamptz not null,
  connected_at timestamptz not null default now()
);
alter table linkedin_auth enable row level security;

-- The share URN LinkedIn returns (urn:li:share:… or urn:li:ugcPost:…).
alter table posts add column if not exists linkedin_urn text;

-- Carousel PDFs are built in the browser, which uploads them here first: a
-- deck can outgrow Vercel's 4.5 MB request limit. Removed once LinkedIn has it.
insert into storage.buckets (id, name, public)
values ('outbox', 'outbox', false)
on conflict (id) do nothing;
