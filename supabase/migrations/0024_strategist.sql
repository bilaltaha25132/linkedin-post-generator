-- Strategist: pillar assignment by embedding, and room for what the analytics
-- export reports. Idempotent.

-- TOP POSTS ranks by total engagements, which no other column holds.
alter table post_metrics add column if not exists engagements int;

-- Imported posts are embedded so they can be given a pillar like drafts are.
alter table linkedin_posts add column if not exists embedding vector(1024);
create index if not exists linkedin_posts_published_idx on linkedin_posts (published_at desc);

-- Gives every embedded post without a pillar its nearest one. Returns rows changed.
create or replace function assign_pillars()
returns int
language plpgsql as $$
declare
  a int;
  b int;
begin
  update posts set pillar_id = (
    select p.id from pillars p where p.embedding is not null order by p.embedding <=> posts.embedding limit 1
  )
  where pillar_id is null and embedding is not null;
  get diagnostics a = row_count;

  update linkedin_posts set pillar_id = (
    select p.id from pillars p where p.embedding is not null order by p.embedding <=> linkedin_posts.embedding limit 1
  )
  where pillar_id is null and embedding is not null;
  get diagnostics b = row_count;
  return a + b;
end $$;

-- Recent strong wire stories, each with its nearest pillar and how close it is.
create or replace function discovery_pillars(since timestamptz, min_score int, max_rows int)
returns table (
  id uuid,
  title text,
  url text,
  relevance_score int,
  suggested_angle text,
  topics text[],
  published_at timestamptz,
  discovered_at timestamptz,
  pillar_id uuid,
  pillar_similarity float
)
language sql stable as $$
  select d.id, d.title, d.url, d.relevance_score, d.suggested_angle, d.topics, d.published_at, d.discovered_at,
         p.id, 1 - (d.embedding <=> p.embedding)
  from discoveries d
  cross join lateral (
    select id, embedding from pillars where embedding is not null order by embedding <=> d.embedding limit 1
  ) p
  where d.discovered_at >= since
    and d.relevance_score >= min_score
    and d.embedding is not null
    and d.status in ('new', 'saved')
  order by d.relevance_score desc
  limit max_rows
$$;

-- His last n posts from both records: drafts marked posted, and imported posts
-- not already joined to a draft. pillar_similarity is how close each sits to its
-- nearest pillar, for the drift alarm.
create or replace function recent_posts(n int)
returns table (at timestamptz, pillar_id uuid, pillar_similarity float, format text, excerpt text)
language sql stable as $$
  select at, pillar_id, sim, format, excerpt from (
    select coalesce(x.posted_at, x.created_at) as at,
           x.pillar_id,
           (select max(1 - (p.embedding <=> x.embedding)) from pillars p where p.embedding is not null) as sim,
           case when jsonb_typeof(x.carousel) = 'array' then
             case when jsonb_array_length(x.carousel) > 0 then 'carousel' else 'text' end
           else 'text' end as format,
           left(x.body, 200) as excerpt
    from posts x
    where x.status = 'posted'
    union all
    select y.published_at,
           y.pillar_id,
           (select max(1 - (p.embedding <=> y.embedding)) from pillars p where p.embedding is not null),
           y.format,
           left(y.text, 200)
    from linkedin_posts y
    where y.post_id is null and y.published_at is not null
  ) t
  order by at desc nulls last
  limit n
$$;
