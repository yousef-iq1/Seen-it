alter extension vector set schema extensions;

alter function public.match_titles(extensions.vector, text[], integer)
  set search_path = public, extensions;
alter function public.calibration_pool(text[], integer)
  set search_path = public, extensions;
alter function public.rebuild_item_similarity(integer)
  set search_path = public, extensions;
alter function public.refresh_co_occurrence()
  set search_path = public, extensions;

revoke execute on function public.match_titles(extensions.vector, text[], integer)
  from public, anon, authenticated;
revoke execute on function public.calibration_pool(text[], integer)
  from public, anon, authenticated;
revoke execute on function public.rebuild_item_similarity(integer)
  from public, anon, authenticated;
revoke execute on function public.refresh_co_occurrence()
  from public, anon, authenticated;
revoke execute on function public.handle_new_user()
  from public, anon, authenticated;

grant execute on function public.match_titles(extensions.vector, text[], integer)
  to service_role;
grant execute on function public.calibration_pool(text[], integer)
  to service_role;
grant execute on function public.rebuild_item_similarity(integer)
  to service_role;
grant execute on function public.refresh_co_occurrence()
  to service_role;


drop policy if exists "own profile" on public.profiles;
drop policy if exists "public profiles readable" on public.profiles;
drop policy if exists "profiles behind public lists readable" on public.profiles;

create policy "profiles readable"
  on public.profiles for select
  to anon, authenticated
  using (
    id = (select auth.uid())
    or is_public
    or exists (
      select 1 from public.lists l
      where l.user_id = profiles.id
        and l.is_public
        and not l.hide_owner
    )
  );

create policy "profiles insert own"
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy "profiles update own"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "profiles delete own"
  on public.profiles for delete
  to authenticated
  using (id = (select auth.uid()));

drop policy if exists "own swipes" on public.swipes;
drop policy if exists "public liked library readable" on public.swipes;

create policy "swipes readable"
  on public.swipes for select
  to anon, authenticated
  using (
    user_id = (select auth.uid())
    or (
      action = 'liked'
      and exists (
        select 1 from public.profiles p
        where p.id = swipes.user_id
          and p.is_public
      )
    )
  );

create policy "swipes insert own"
  on public.swipes for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "swipes update own"
  on public.swipes for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "swipes delete own"
  on public.swipes for delete
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "own taste" on public.user_taste;
create policy "own taste"
  on public.user_taste for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "own lists" on public.lists;
drop policy if exists "public lists readable" on public.lists;

create policy "lists readable"
  on public.lists for select
  to anon, authenticated
  using (
    user_id = (select auth.uid())
    or is_public
  );

create policy "lists insert own"
  on public.lists for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "lists update own"
  on public.lists for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "lists delete own"
  on public.lists for delete
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "own list items" on public.list_items;
drop policy if exists "public list items readable" on public.list_items;

create policy "list items readable"
  on public.list_items for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.lists l
      where l.id = list_items.list_id
        and (
          l.user_id = (select auth.uid())
          or l.is_public
        )
    )
  );

create policy "list items insert own"
  on public.list_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.lists l
      where l.id = list_items.list_id
        and l.user_id = (select auth.uid())
    )
  );

create policy "list items update own"
  on public.list_items for update
  to authenticated
  using (
    exists (
      select 1 from public.lists l
      where l.id = list_items.list_id
        and l.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.lists l
      where l.id = list_items.list_id
        and l.user_id = (select auth.uid())
    )
  );

create policy "list items delete own"
  on public.list_items for delete
  to authenticated
  using (
    exists (
      select 1 from public.lists l
      where l.id = list_items.list_id
        and l.user_id = (select auth.uid())
    )
  );

create index if not exists item_similarity_similar_title_idx
  on public.item_similarity (similar_title_id);
