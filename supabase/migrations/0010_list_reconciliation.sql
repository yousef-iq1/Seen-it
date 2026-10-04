alter table public.lists
  add column if not exists updated_at timestamptz not null default now();

create index if not exists lists_user_updated_at_idx
  on public.lists (user_id, updated_at desc);
