-- Persist a generated carousel (the slide deck) with its post, so it travels with
-- the post everywhere it shows up — drafts, the queue, and posted. Idempotent.

alter table posts add column if not exists carousel jsonb;
