alter table public.user_taste
  add column if not exists seen_facets jsonb;

comment on column public.user_taste.seen_facets is
  'Per-value evidence for "has this person watched this?", learned from every '
  'swipe: watched (liked or disliked) writes +1, not-seen writes -1. Blended '
  'against the global fame prior by how many swipes the account has logged.';
