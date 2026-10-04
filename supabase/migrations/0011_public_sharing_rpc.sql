create or replace function public.get_public_profile(p_slug text)
returns table (
  display_name text,
  bio text,
  avatar_url text,
  liked_title_ids text[]
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    p.display_name,
    p.bio,
    p.avatar_url,
    coalesce(
      array_agg(s.title_id order by s.created_at desc)
        filter (where s.title_id is not null),
      array[]::text[]
    ) as liked_title_ids
  from public.profiles p
  left join public.swipes s
    on s.user_id = p.id
   and s.action = 'liked'
  where p.public_slug = p_slug
    and p.is_public
  group by p.id, p.display_name, p.bio, p.avatar_url
  limit 1;
$$;

create or replace function public.get_public_list(p_slug text)
returns table (
  id uuid,
  name text,
  owner text,
  title_ids text[]
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    l.id,
    l.name,
    case when l.hide_owner then null else p.display_name end as owner,
    coalesce(
      array_agg(li.title_id order by li.title_id)
        filter (where li.title_id is not null),
      array[]::text[]
    ) as title_ids
  from public.lists l
  left join public.profiles p on p.id = l.user_id
  left join public.list_items li on li.list_id = l.id
  where l.share_slug = p_slug
    and l.is_public
  group by l.id, l.name, l.hide_owner, p.display_name
  limit 1;
$$;

revoke all on function public.get_public_profile(text) from public;
revoke all on function public.get_public_list(text) from public;
grant execute on function public.get_public_profile(text) to anon, authenticated;
grant execute on function public.get_public_list(text) to anon, authenticated;

drop policy if exists "profiles readable" on public.profiles;
create policy "profiles read own"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

drop policy if exists "swipes readable" on public.swipes;
create policy "swipes read own"
  on public.swipes for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "lists readable" on public.lists;
create policy "lists read own"
  on public.lists for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "list items readable" on public.list_items;
create policy "list items read own"
  on public.list_items for select
  to authenticated
  using (
    exists (
      select 1 from public.lists l
      where l.id = list_items.list_id
        and l.user_id = (select auth.uid())
    )
  );
