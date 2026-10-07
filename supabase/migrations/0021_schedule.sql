-- Scheduled publishing: a post approved for a time, published by the 10-minute
-- cron (.github/workflows/publish.yml). Idempotent.

alter table posts add column if not exists scheduled_at timestamptz;
-- The carousel PDF staged in the outbox bucket when the post was scheduled; the
-- browser draws it, so it can't be built at publish time.
alter table posts add column if not exists scheduled_pdf text;
-- Why the last scheduled publish failed, shown on the card until it's rescheduled.
alter table posts add column if not exists publish_error text;

create index if not exists posts_scheduled_at_idx on posts (scheduled_at) where scheduled_at is not null;
