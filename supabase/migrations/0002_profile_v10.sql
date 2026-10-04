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
