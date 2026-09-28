-- Everyday general-interest news alongside tech: the stories people talk about
-- that still carry a lesson for a professional audience. Idempotent; sources
-- switched off on /sources stay off.

insert into sources (kind, value, label)
select kind, value, label
from (values
  ('search', 'viral story everyone is talking about this week', 'Talk of the week'),
  ('search', 'inspiring human interest story overcame odds', 'Human stories'),
  ('search', 'economy news cost of living prices interest rates this week', 'Economy'),
  ('search', 'sports team coach leadership comeback story', 'Sport & leadership'),
  ('search', 'culture trend Gen Z society shift survey', 'Culture & society'),
  ('search', 'education university students degree value news', 'Education')
) as seed(kind, value, label)
where not exists (select 1 from sources s where s.value = seed.value);
