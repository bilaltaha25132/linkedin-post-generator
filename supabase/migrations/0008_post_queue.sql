-- A "to be posted" queue: posts you like enough to line up for publishing.
-- Adds a 'queued' status between 'draft' and 'posted'. Idempotent.

alter table posts drop constraint if exists posts_status_check;
alter table posts add constraint posts_status_check
  check (status in ('draft', 'queued', 'posted'));

create index if not exists posts_queued_idx
  on posts (status, created_at desc) where status = 'queued';
