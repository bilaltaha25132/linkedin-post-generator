-- Beyond AI: the feed should carry any story worth a LinkedIn post, from tech
-- and business to careers, product, security and science. Queries name the
-- kind of concrete, dated story we want so search returns news, not explainers.
-- Idempotent; sources switched off on /sources stay off.

insert into sources (kind, value, label)
select kind, value, label
from (values
  ('search', 'big tech company announcement acquisition layoffs this week', 'Big tech moves'),
  ('search', 'startup founder story what went wrong lessons shutdown', 'Founder stories'),
  ('search', 'software engineering job market hiring developers layoffs data', 'Jobs & careers'),
  ('search', 'workplace study remote work productivity four-day week results', 'How we work'),
  ('search', 'product launch backlash redesign company reverses decision', 'Product calls'),
  ('search', 'major data breach cyberattack outage company this week', 'Breaches & outages'),
  ('search', 'CEO surprising business strategy decision analysis', 'Business strategy'),
  ('search', 'scientific breakthrough discovery study published this week', 'Science breakthroughs'),
  ('search', 'Pakistan tech startup industry news', 'Pakistan tech')
) as seed(kind, value, label)
where not exists (select 1 from sources s where s.value = seed.value);
