-- Tracks which discoveries have already been pushed to WhatsApp, so a digest
-- never repeats an item across the 6-hourly scans.

alter table discoveries add column if not exists notified boolean not null default false;
create index if not exists discoveries_notify_idx on discoveries (notified, relevance_score desc);
