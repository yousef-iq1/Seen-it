alter table public.swipes drop constraint if exists swipes_title_id_fkey;
alter table public.list_items drop constraint if exists list_items_title_id_fkey;

drop policy if exists "public library readable" on public.swipes;
create policy "public liked library readable" on public.swipes
  for select
  to anon, authenticated
  using (
    action = 'liked'
    and exists (
      select 1
      from public.profiles p
      where p.id = swipes.user_id
        and p.is_public
    )
  );

alter table public.lists add column if not exists client_id text;
create unique index if not exists lists_user_client_id_unique
  on public.lists (user_id, client_id)
  where client_id is not null;

alter table public.profiles add column if not exists updated_at timestamptz not null default now();
