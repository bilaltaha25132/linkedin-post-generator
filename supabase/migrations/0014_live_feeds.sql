-- Read what's hot straight from the source: the Hacker News front page and the
-- AI labs' and writers' own feeds. They cost no search credits, are current to
-- the hour, and HN carries the public reaction to a story. Idempotent; sources
-- switched off on /sources stay off.

alter table sources drop constraint if exists sources_kind_check;
alter table sources add constraint sources_kind_check check (kind in ('search', 'rss', 'url', 'hn'));

-- `discussion` is the thread's headline numbers, light enough for the feed;
-- `discussion_comments` is only read on the draft page.
alter table discoveries add column if not exists discussion jsonb;
alter table discoveries add column if not exists discussion_comments jsonb;
alter table discoveries add column if not exists key_numbers text[] not null default '{}';

-- For `hn`, the value is the minimum points a story needs.
insert into sources (kind, value, label)
select kind, value, label
from (values
  ('hn', '100', 'Hacker News front page'),
  ('rss', 'https://openai.com/news/rss.xml', 'OpenAI'),
  ('rss', 'https://deepmind.google/blog/rss.xml', 'Google DeepMind'),
  ('rss', 'https://blog.google/technology/ai/rss/', 'Google AI'),
  ('rss', 'https://huggingface.co/blog/feed.xml', 'Hugging Face'),
  ('rss', 'https://simonwillison.net/atom/everything/', 'Simon Willison'),
  ('rss', 'https://www.latent.space/feed', 'Latent Space'),
  ('rss', 'https://www.interconnects.ai/feed', 'Interconnects'),
  ('rss', 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', 'The Verge AI'),
  ('rss', 'https://feeds.arstechnica.com/arstechnica/technology-lab', 'Ars Technica'),
  ('rss', 'https://newsletter.pragmaticengineer.com/feed', 'The Pragmatic Engineer'),
  ('rss', 'https://github.blog/feed/', 'GitHub'),
  ('rss', 'https://www.reddit.com/r/LocalLLaMA/top/.rss?t=day', 'r/LocalLLaMA')
) as seed(kind, value, label)
where not exists (select 1 from sources s where s.value = seed.value);
