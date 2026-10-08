-- Sources the jobs workflow's runner fetches and posts back, because the site
-- hangs every request from Vercel (scripts/relay-jobs.mjs). Idempotent.
alter table job_sources add column if not exists relay boolean not null default false;

update job_sources set relay = true
where kind = 'naukrigulf' or (kind = 'successfactors' and token = 'careers.aramco.com');
