-- Sharper queries aimed at the stories tech people are actually talking about
-- this week: named launches, surprising results, real incidents, strong takes.
-- These pull concrete articles rather than evergreen SEO blurbs. Idempotent.

insert into sources (kind, value, label)
select kind, value, label
from (values
  ('search', 'OpenAI Anthropic Google DeepMind major AI announcement this week', 'Big lab moves'),
  ('search', 'AI benchmark surprising result outperforms humans study', 'Benchmarks that shock'),
  ('search', 'AI agent autonomous coding milestone real deployment', 'Agents shipping'),
  ('search', 'prompt injection jailbreak real world AI security incident', 'Real AI incidents'),
  ('search', 'AI startup pivot shutdown lessons learned postmortem', 'Startup war stories'),
  ('search', 'developer AI tool launch trending Hacker News discussion', 'What devs are sharing'),
  ('search', 'AI hype versus reality contrarian take engineer', 'Signal vs hype')
) as seed(kind, value, label)
where not exists (select 1 from sources s where s.value = seed.value);
