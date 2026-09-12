-- Records token usage per LLM call so spend is visible in-app (DeepSeek's own
-- dashboard remains the billing source of truth).

create table if not exists usage_events (
  id                uuid primary key default gen_random_uuid(),
  provider          text not null default 'deepseek',
  model             text,
  operation         text not null,           -- 'relevance' | 'generate'
  prompt_tokens     int not null default 0,
  completion_tokens int not null default 0,
  total_tokens      int not null default 0,
  created_at        timestamptz not null default now()
);
create index if not exists usage_events_created_idx on usage_events (created_at desc);
alter table usage_events enable row level security;

-- Totals grouped by operation, for the /usage page.
create or replace function usage_summary()
returns table (
  operation text,
  calls bigint,
  prompt_tokens bigint,
  completion_tokens bigint,
  total_tokens bigint
)
language sql stable as $$
  select operation,
         count(*)                as calls,
         sum(prompt_tokens)      as prompt_tokens,
         sum(completion_tokens)  as completion_tokens,
         sum(total_tokens)       as total_tokens
  from usage_events
  group by operation
  order by operation;
$$;
