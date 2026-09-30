-- Marks a story that announces a new AI model, product or tool, so a launch
-- stands out on the wire and reaches the email digest first. Idempotent.

alter table discoveries add column if not exists is_launch boolean not null default false;
create index if not exists discoveries_launch_idx on discoveries (is_launch, discovered_at desc) where is_launch;
