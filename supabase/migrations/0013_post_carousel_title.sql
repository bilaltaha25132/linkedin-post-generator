-- LinkedIn asks for a document title when a carousel deck is uploaded as a
-- document, and caps it at 58 characters. Seeded from the cover hook, editable.
-- Idempotent.

alter table posts add column if not exists carousel_title text;
