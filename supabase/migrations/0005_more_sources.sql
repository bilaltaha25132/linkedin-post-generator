-- Broaden monitoring toward genuinely interesting, shareable tech/AI stories
-- (not just the narrow niche). Idempotent; editable on the /sources page.

insert into sources (kind, value, label)
select kind, value, label
from (values
  ('search', 'surprising AI research finding breakthrough this week', 'Surprising research'),
  ('search', 'AI agents real world results and failures', 'Agents in the wild'),
  ('search', 'how we built engineering deep dive AI system', 'How they built it'),
  ('search', 'AI developer tools that save time notable launch', 'Dev tools'),
  ('search', 'AI industry shift controversy debate', 'Industry & debate'),
  ('search', 'notable open source LLM release', 'Open-source AI'),
  ('search', 'LLM cost reduction latency optimization case study', 'Perf & cost wins'),
  ('search', 'AI coding productivity data study', 'AI & the dev job')
) as seed(kind, value, label)
where not exists (select 1 from sources s where s.value = seed.value);
