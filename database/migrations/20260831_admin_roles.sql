-- Mission 4 / espaces : rôles admin & seller
-- Idempotent : relançable dans le SQL Editor Supabase.
alter table public.profiles add column if not exists role text not null default 'seller' check (role in ('seller', 'admin'));

-- Détection d'admin sans récursion RLS (security definer).
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin');
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Pour promouvoir un utilisateur en administrateur, exécutez :
--   update public.profiles set role = 'admin'
--   where user_id = (select id from auth.users where email = 'votre@email.com');