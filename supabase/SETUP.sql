create extension if not exists vector;

create table if not exists public.titles (
  id text primary key,                        -- "movie-603" / "tv-1396"
  tmdb_id integer not null,
  type text not null check (type in ('movie', 'tv')),
  title_en text not null,
  title_ar text not null default '',
  overview_en text not null default '',
  overview_ar text not null default '',
  year integer not null default 0,
  genres text[] not null default '{}',
  keywords text[] not null default '{}',
  director text,
  cast_names text[] not null default '{}',
  original_language text not null default 'en',
  rating numeric not null default 0,
  vote_count integer not null default 0,
  popularity numeric not null default 0,
  poster_path text,
  backdrop_path text,
  onboarding boolean not null default false,
  feature_vector vector(384) not null,
  updated_at timestamptz not null default now()
);

create index if not exists titles_vector_idx
  on public.titles using hnsw (feature_vector vector_cosine_ops);
create index if not exists titles_popularity_idx on public.titles (popularity desc);
create index if not exists titles_onboarding_idx on public.titles (onboarding) where onboarding;

create table if not exists public.item_similarity (
  title_id text not null references public.titles (id) on delete cascade,
  similar_title_id text not null references public.titles (id) on delete cascade,
  score real not null,
  primary key (title_id, similar_title_id)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  public_slug text unique,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.swipes (
  user_id uuid not null references auth.users (id) on delete cascade,
  title_id text not null references public.titles (id) on delete cascade,
  action text not null check (action in ('liked', 'disliked', 'not_seen')),
  created_at timestamptz not null default now(),
  primary key (user_id, title_id)
);
create index if not exists swipes_user_idx on public.swipes (user_id, created_at desc);

create table if not exists public.user_taste (
  user_id uuid primary key references auth.users (id) on delete cascade,
  taste vector(384) not null,
  rated_swipes integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  is_public boolean not null default false,
  share_slug text unique not null default encode(gen_random_bytes(6), 'hex'),
  created_at timestamptz not null default now()
);

create table if not exists public.list_items (
  list_id uuid not null references public.lists (id) on delete cascade,
  title_id text not null references public.titles (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (list_id, title_id)
);

create table if not exists public.co_occurrence (
  title_a text not null,
  title_b text not null,
  both_liked integer not null,
  primary key (title_a, title_b)
);

alter table public.titles enable row level security;
alter table public.item_similarity enable row level security;
alter table public.profiles enable row level security;
alter table public.swipes enable row level security;
alter table public.user_taste enable row level security;
alter table public.lists enable row level security;
alter table public.list_items enable row level security;
alter table public.co_occurrence enable row level security;

create policy "titles are public" on public.titles for select using (true);
create policy "similarity is public" on public.item_similarity for select using (true);
create policy "co-occurrence is public" on public.co_occurrence for select using (true);

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "public profiles readable" on public.profiles
  for select using (is_public);

create policy "own swipes" on public.swipes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "public library readable" on public.swipes
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = swipes.user_id and p.is_public
    )
  );

create policy "own taste" on public.user_taste
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own lists" on public.lists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "public lists readable" on public.lists
  for select using (is_public);

create policy "own list items" on public.list_items
  for all using (
    exists (select 1 from public.lists l where l.id = list_items.list_id and l.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.lists l where l.id = list_items.list_id and l.user_id = auth.uid())
  );
create policy "public list items readable" on public.list_items
  for select using (
    exists (select 1 from public.lists l where l.id = list_items.list_id and l.is_public)
  );

create or replace function public.match_titles(
  query_vector vector(384),
  exclude_ids text[] default '{}',
  match_count integer default 200
)
returns setof public.titles
language sql stable
as $$
  select t.*
  from public.titles t
  where not (t.id = any (exclude_ids))
  order by t.feature_vector <=> query_vector
  limit match_count;
$$;

create or replace function public.calibration_pool(
  exclude_ids text[] default '{}',
  pool_count integer default 80
)
returns setof public.titles
language sql stable
as $$
  select t.*
  from public.titles t
  where t.onboarding and not (t.id = any (exclude_ids))
  order by t.popularity desc
  limit pool_count;
$$;

create or replace function public.rebuild_item_similarity(top_k integer default 30)
returns void
language plpgsql security definer
as $$
begin
  truncate public.item_similarity;
  insert into public.item_similarity (title_id, similar_title_id, score)
  select t.id, n.id, n.score
  from public.titles t
  cross join lateral (
    select t2.id, (1 - (t2.feature_vector <=> t.feature_vector))::real as score
    from public.titles t2
    where t2.id <> t.id
    order by t2.feature_vector <=> t.feature_vector
    limit top_k
  ) n;
end;
$$;

create or replace function public.refresh_co_occurrence()
returns void
language plpgsql security definer
as $$
begin
  truncate public.co_occurrence;
  insert into public.co_occurrence (title_a, title_b, both_liked)
  select s1.title_id, s2.title_id, count(*)::int
  from public.swipes s1
  join public.swipes s2
    on s1.user_id = s2.user_id
   and s1.title_id <> s2.title_id
  where s1.action = 'liked' and s2.action = 'liked'
  group by s1.title_id, s2.title_id
  having count(*) >= 2;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
as $$
begin
  insert into public.profiles (id, display_name, public_slug)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    encode(gen_random_bytes(4), 'hex')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.user_taste
  add column if not exists facets jsonb not null default '{}'::jsonb,
  add column if not exists facet_weights jsonb not null default '{}'::jsonb,
  add column if not exists streaks jsonb not null default '{}'::jsonb,
  add column if not exists liked_sum real[] not null default '{}',
  add column if not exists liked_count integer not null default 0,
  add column if not exists disliked_sum real[] not null default '{}',
  add column if not exists disliked_count integer not null default 0,
  add column if not exists total_swipes integer not null default 0,
  add column if not exists seen_count integer not null default 0,
  add column if not exists unseen_count integer not null default 0,
  add column if not exists recent jsonb not null default '[]'::jsonb;

comment on column public.user_taste.facets is
  'value -> [net evidence, observation mass] per facet. Empty means this row
   was written before the facet engine and must not be trusted as a taste.';

create index if not exists swipes_user_action_idx
  on public.swipes (user_id, action);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  begin
    insert into public.profiles (id, display_name, public_slug)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
      encode(extensions.gen_random_bytes(4), 'hex')
    )
    on conflict (id) do nothing;
  exception when others then
    null;
  end;
  return new;
end;
$$;

alter table public.lists
  alter column share_slug set default encode(extensions.gen_random_bytes(6), 'hex');

insert into public.profiles (id, display_name, public_slug)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  encode(extensions.gen_random_bytes(4), 'hex')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

alter table public.user_taste
  add column if not exists seen_facets jsonb;

comment on column public.user_taste.seen_facets is
  'Per-value evidence for "has this person watched this?", learned from every '
  'swipe: watched (liked or disliked) writes +1, not-seen writes -1. Blended '
  'against the global fame prior by how many swipes the account has logged.';

alter table public.swipes
  drop constraint if exists swipes_action_check;

alter table public.swipes
  add constraint swipes_action_check
  check (action in ('liked', 'disliked', 'not_seen', 'seen'));

alter table public.user_taste
  add column if not exists seen_facets jsonb;

alter table public.swipes drop constraint if exists swipes_title_id_fkey;
alter table public.list_items drop constraint if exists list_items_title_id_fkey;

alter table public.swipes drop constraint if exists swipes_action_check;
alter table public.swipes add constraint swipes_action_check
  check (action in ('liked', 'disliked', 'not_seen', 'seen'));

alter table public.user_taste add column if not exists seen_facets jsonb;

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

alter table public.lists
  add column if not exists updated_at timestamptz not null default now();

create index if not exists lists_user_updated_at_idx
  on public.lists (user_id, updated_at desc);

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


create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = auth, public, pg_temp
as $$
declare
  current_user_id uuid;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  delete from auth.users where id = current_user_id;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;


create table if not exists public.signup_rate_limits (
  ip_hash text primary key,
  window_start timestamptz not null default now(),
  attempts integer not null default 0
);

alter table public.signup_rate_limits enable row level security;
revoke all on table public.signup_rate_limits from public, anon, authenticated;
