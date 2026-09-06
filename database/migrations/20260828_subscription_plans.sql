-- Create subscription tables before payment migrations depend on them.
create table if not exists public.subscription_plans (
  id text primary key,
  name text not null,
  price integer not null check (price >= 0),
  product_limit integer check (product_limit is null or product_limit > 0),
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.seller_subscriptions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null unique references public.stores(id) on delete cascade,
  plan_id text not null default 'free' references public.subscription_plans(id),
  status text not null default 'active' check (status in ('active','pending','expired')),
  payment_status text not null default 'paid' check (payment_status in ('pending','paid','failed')),
  provider text not null default 'manual',
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

insert into public.subscription_plans (id, name, price, product_limit, description)
values
  ('free', 'Découverte', 0, 5, 'Pour lancer votre boutique avec vos premiers produits.'),
  ('growth', 'Croissance', 2000, 20, 'Pour commencer à vendre régulièrement avec plus de liberté.'),
  ('pro', 'Pro', 5000, 100, 'Pour les boutiques qui développent une activité régulière.')
on conflict (id) do update set name = excluded.name, price = excluded.price, product_limit = excluded.product_limit, description = excluded.description;

insert into public.seller_subscriptions (store_id, plan_id, status, payment_status, provider)
select s.id, 'free', 'active', 'paid', 'manual' from public.stores s
on conflict (store_id) do nothing;

create or replace function public.create_free_subscription_for_store()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.seller_subscriptions (store_id, plan_id, status, payment_status, provider)
  values (new.id, 'free', 'active', 'paid', 'manual')
  on conflict (store_id) do nothing;
  return new;
end;
$$;
drop trigger if exists stores_create_free_subscription on public.stores;
create trigger stores_create_free_subscription
  after insert on public.stores
  for each row execute procedure public.create_free_subscription_for_store();