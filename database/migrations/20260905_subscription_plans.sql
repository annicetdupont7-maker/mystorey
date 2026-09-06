create table if not exists public.subscription_plans (
  id text primary key,
  name text not null,
  price integer not null default 0,
  product_limit integer,
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

insert into subscription_plans (id, name, price, product_limit, description)
values
  ('free', 'Découverte', 0, 10, 'Pour lancer votre boutique avec vos premiers produits.'),
  ('growth', 'Plus', 2000, 2000, 'Pour commencer à vendre régulièrement avec plus de liberté.'),
  ('pro', 'Pro', 5000, 100, 'Pour les boutiques qui développent une activité régulière.')
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  product_limit = excluded.product_limit,
  description = excluded.description;

insert into seller_subscriptions (store_id, plan_id, status, payment_status, provider, started_at, updated_at)
select s.id, 'free', 'active', 'paid', 'manual', now(), now()
from stores s
on conflict (store_id) do nothing;
