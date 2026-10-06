-- More free places AI news and research land first. Idempotent; sources
-- switched off on /sources afterwards stay off.

alter table sources drop constraint if exists sources_kind_check;
alter table sources add constraint sources_kind_check
  check (kind in ('search', 'rss', 'url', 'hn', 'papers', 'models'));

-- `models` reads Hugging Face's trending models; the value is the minimum likes
-- a new (under a week old) model needs.
insert into sources (kind, value, label)
select kind, value, label
from (values
  ('models', '300', 'Hugging Face trending models'),
  ('rss', 'https://www.techmeme.com/feed.xml', 'Techmeme'),
  ('rss', 'https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_research.xml', 'Anthropic research'),
  ('rss', 'https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_mistral.xml', 'Mistral'),
  ('rss', 'https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_cohere.xml', 'Cohere'),
  ('rss', 'https://www.together.ai/blog/rss.xml', 'Together AI'),
  ('rss', 'https://engineering.fb.com/feed/', 'Meta Engineering'),
  ('rss', 'https://blog.cloudflare.com/tag/ai/rss/', 'Cloudflare AI'),
  ('rss', 'https://metr.org/feed.xml', 'METR'),
  ('rss', 'https://newsletter.semianalysis.com/feed', 'SemiAnalysis'),
  ('rss', 'https://hamel.dev/index.xml', 'Hamel Husain')
) as seed(kind, value, label)
-- hn, papers and models are one source each, and their value (a threshold) can be
-- edited on /sources, so they match on kind: matching on value re-seeded a duplicate.
where not exists (
  select 1 from sources s
  where s.value = seed.value or (seed.kind in ('hn', 'papers', 'models') and s.kind = seed.kind)
);

do $$
begin
  if not exists (select 1 from applied_once where key = '0018_more_ai_sources') then
    -- Reddit answers its post feeds again; new open models are argued about here first.
    update sources set enabled = true where value = 'https://www.reddit.com/r/LocalLLaMA/top/.rss?t=day';
    insert into applied_once (key) values ('0018_more_ai_sources');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from applied_once where key = '0018_one_hn_source') then
    -- 0014 re-seeded a second HN source at 100 points after 0017 lowered it to 60.
    -- Its stories move to the one kept, then it goes.
    update discoveries set source_id = keep.id
    from (select id from sources where kind = 'hn' and value = '60' limit 1) keep,
         (select id from sources where kind = 'hn' and value = '100') dup
    where discoveries.source_id = dup.id;
    update rejections set source_id = keep.id
    from (select id from sources where kind = 'hn' and value = '60' limit 1) keep,
         (select id from sources where kind = 'hn' and value = '100') dup
    where rejections.source_id = dup.id;
    delete from sources
    where kind = 'hn' and value = '100'
      and exists (select 1 from sources where kind = 'hn' and value = '60');
    insert into applied_once (key) values ('0018_one_hn_source');
  end if;
end $$;
