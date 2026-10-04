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
