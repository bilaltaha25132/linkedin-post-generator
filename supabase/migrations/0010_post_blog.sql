-- Persist a generated blog article (Markdown) with its post, so a website-ready
-- article travels with the post everywhere it shows up. Idempotent.

alter table posts add column if not exists blog text;
