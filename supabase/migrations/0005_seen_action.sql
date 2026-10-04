alter table public.swipes
  drop constraint if exists swipes_action_check;

alter table public.swipes
  add constraint swipes_action_check
  check (action in ('liked', 'disliked', 'not_seen', 'seen'));

alter table public.user_taste
  add column if not exists seen_facets jsonb;
