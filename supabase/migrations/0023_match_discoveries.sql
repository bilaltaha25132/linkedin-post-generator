-- Wire stories close to a piece of text (a shared post, a draft), newest window
-- only. Used to ground Engage comments in the story a post is about. Idempotent.
create or replace function match_discoveries(query_embedding vector(1024), match_count int, since timestamptz)
returns table (id uuid, title text, url text, snippet text, key_numbers text[], similarity float)
language sql stable as $$
  select d.id, d.title, d.url, d.snippet, d.key_numbers, 1 - (d.embedding <=> query_embedding) as similarity
  from discoveries d
  where d.embedding is not null and d.discovered_at >= since
  order by d.embedding <=> query_embedding
  limit match_count;
$$;
