-- Network: the connection queue's pacing and the follow-only suggestions.
-- Idempotent.

alter table connections add column if not exists kind text not null default 'connect';
alter table connections drop constraint if exists connections_kind_check;
alter table connections add constraint connections_kind_check check (kind in ('connect', 'follow'));
-- What to type into LinkedIn's people search when there's no profile link.
alter table connections add column if not exists search_query text;
alter table connections add column if not exists priority int not null default 0;
alter table connections add column if not exists sent_at timestamptz;
alter table connections add column if not exists note_sent boolean not null default false;

create index if not exists connections_status_idx on connections (status, priority desc);
create index if not exists connections_sent_idx on connections (sent_at desc) where sent_at is not null;
