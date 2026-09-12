-- Rotate which sources a bounded run scans, so every topic gets covered over
-- successive runs (least-recently-scanned first; brand-new sources first).

alter table sources add column if not exists last_scanned_at timestamptz;
create index if not exists sources_rotation_idx
  on sources (enabled, last_scanned_at asc nulls first);
