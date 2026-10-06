-- Be early on AI news and research without spending Firecrawl credits.
-- Idempotent; a source switched on or off on /sources afterwards stays that way,
-- except that the one-off changes below apply the first time this runs.

alter table sources drop constraint if exists sources_kind_check;
-- The allowed kinds are set by the newest migration that adds one (0018):
-- every file re-runs on db:migrate, so an older list here would reject newer rows.

-- `papers` reads Hugging Face Daily Papers, the research the community is
-- upvoting today; the value is the minimum upvotes a paper needs.
-- The feeds are where AI news lands first: The Decoder and TechCrunch post
-- within the hour, the rest are the labs and research groups themselves.
insert into sources (kind, value, label)
select kind, value, label
from (values
  ('papers', '15', 'Hugging Face Daily Papers'),
  ('rss', 'https://the-decoder.com/feed/', 'The Decoder'),
  ('rss', 'https://techcrunch.com/category/artificial-intelligence/feed/', 'TechCrunch AI'),
  ('rss', 'https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml', 'Anthropic'),
  ('rss', 'https://research.google/blog/rss/', 'Google Research'),
  ('rss', 'https://www.microsoft.com/en-us/research/feed/', 'Microsoft Research'),
  ('rss', 'https://www.technologyreview.com/topic/artificial-intelligence/feed', 'MIT Tech Review AI'),
  ('rss', 'https://importai.substack.com/feed', 'Import AI'),
  ('rss', 'https://magazine.sebastianraschka.com/feed', 'Ahead of AI')
) as seed(kind, value, label)
-- hn, papers and models are one source each, and their value (a threshold) can be
-- edited on /sources, so they match on kind: matching on value re-seeded a duplicate.
where not exists (
  select 1 from sources s
  where s.value = seed.value or (seed.kind in ('hn', 'papers', 'models') and s.kind = seed.kind)
);

-- One-off changes, marked so a re-run doesn't undo later edits on /sources.
create table if not exists applied_once (key text primary key, applied_at timestamptz not null default now());
alter table applied_once enable row level security;

do $$
begin
  if not exists (select 1 from applied_once where key = '0017_fast_news') then
    -- Catch a story while it's rising on HN, not after it has peaked.
    update sources set value = '60' where kind = 'hn' and value = '100';
    -- Searches outside the AI beat spent credits on stories that scored low.
    update sources set enabled = false
    where kind = 'search' and label in (
      'Economy', 'How we work', 'Business strategy', 'Founder stories',
      'Product calls', 'Jobs & careers', 'Breaches & outages', 'Pakistan tech'
    );
    insert into applied_once (key) values ('0017_fast_news');
  end if;
end $$;
