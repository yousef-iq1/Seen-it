alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists avatar_url text;

alter table public.lists add column if not exists hide_owner boolean not null default false;

alter table public.lists add column if not exists source_list_id uuid;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lists' and column_name = 'share_anonymous'
  ) then
    update public.lists set hide_owner = true where share_anonymous;
    alter table public.lists drop column share_anonymous;
  end if;
end $$;

drop policy if exists "profiles behind public lists readable" on public.profiles;
create policy "profiles behind public lists readable" on public.profiles
  for select using (
    exists (
      select 1 from public.lists l
      where l.user_id = profiles.id
        and l.is_public
        and not l.hide_owner
    )
  );

alter table public.list_items drop constraint if exists list_items_title_id_fkey;

create index if not exists lists_share_slug_idx on public.lists (share_slug);
create index if not exists list_items_list_idx on public.list_items (list_id);

insert into public.profiles (id, display_name)
select u.id, coalesce(u.raw_user_meta_data ->> 'full_name', 'Seenit reader')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
