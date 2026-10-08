-- More Gulf and Saudi sources: two cross-company searches per country, the big
-- employers' own careers sites, and Sabbar. Verified live on 2026-10-08
-- (docs/growth/research/gulf-jobs.md). Idempotent.
insert into job_sources (kind, token, name, region) values
  -- Naukrigulf, searched per country as the site spells it
  ('naukrigulf', 'saudi arabia', 'Naukrigulf Saudi Arabia', 'gulf'),
  ('naukrigulf', 'uae', 'Naukrigulf UAE', 'gulf'),
  ('naukrigulf', 'qatar', 'Naukrigulf Qatar', 'gulf'),
  ('naukrigulf', 'kuwait', 'Naukrigulf Kuwait', 'gulf'),
  ('naukrigulf', 'bahrain', 'Naukrigulf Bahrain', 'gulf'),
  ('naukrigulf', 'oman', 'Naukrigulf Oman', 'gulf'),
  -- Workable's search across every company on Workable
  ('workable_search', 'Saudi Arabia', 'Workable Saudi Arabia', 'gulf'),
  ('workable_search', 'United Arab Emirates', 'Workable UAE', 'gulf'),
  ('workable_search', 'Qatar', 'Workable Qatar', 'gulf'),
  ('workable_search', 'Kuwait', 'Workable Kuwait', 'gulf'),
  ('workable_search', 'Bahrain', 'Workable Bahrain', 'gulf'),
  ('workable_search', 'Oman', 'Workable Oman', 'gulf'),
  -- Employers' own careers sites
  ('eightfold', 'careers.neom.com|neom.com', 'NEOM', 'gulf'),
  ('phenom', 'careers.g42.ai/global/en', 'G42', 'gulf'),
  ('phenom', 'careers.tii.ae/us/en', 'TII', 'gulf'),
  ('oracle', 'fa-exrn-saasfaprod1.fa.ocs.oraclecloud.com|CX_3001', 'Aramco Digital', 'gulf'),
  ('oracle', 'iaambv.fa.ocs.oraclecloud.com|CX_1', 'Presight', 'gulf'),
  ('successfactors', 'careers.aramco.com', 'Saudi Aramco', 'gulf'),
  ('successfactors', 'careers.core42.ai', 'Core42', 'gulf'),
  ('successfactors', 'careers.stc.com.sa', 'stc', 'gulf'),
  -- Sabbar, the Saudi board, read from its sitemap
  ('sabbar', '', 'Sabbar', 'gulf')
on conflict (kind, token) do nothing;
