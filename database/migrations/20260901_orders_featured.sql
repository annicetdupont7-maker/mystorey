-- VendoFlow — Mission produit : commandes & produit vedette
-- Idempotent : relançable sans erreur dans le Supabase SQL Editor.
-- Ajoute : table orders (statuts de cycle de vie), produits.is_featured.
-- La livraison n'est pas un système complet ici (mission suivante) :
-- les colonnes adresse/zone/livreur viendront dans une migration dédiée.

-- 1. Statuts de commande
do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'order_status' and n.nspname = 'public') then
    create type public.order_status as enum
      ('new', 'to_confirm', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled');
  end if;
end
$$;

-- 2. Table des commandes (le vendeur consigne les commandes reçues par WhatsApp)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_name text not null default '' check (char_length(customer_name) <= 120),
  customer_phone text not null default '' check (char_length(customer_phone) <= 40),
  items jsonb not null default '[]'::jsonb,
  total integer not null default 0 check (total >= 0),
  status public.order_status not null default 'new',
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_store_id_idx on public.orders(store_id);
create index if not exists orders_store_status_idx on public.orders(store_id, status);
create index if not exists orders_store_created_idx on public.orders(store_id, created_at desc);

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders
  for each row execute procedure public.set_updated_at();

-- 3. Produit vedette
alter table public.products add column if not exists is_featured boolean not null default false;
create index if not exists products_store_featured_idx on public.products(store_id) where is_featured;

-- 4. Sécurité (RLS) — le vendeur pilote ses commandes, jamais un autre vendeur
alter table public.orders enable row level security;

revoke all on public.orders from anon, authenticated;
grant select, insert, update, delete on public.orders to authenticated;

drop policy if exists "owner reads own orders" on public.orders;
create policy "owner reads own orders" on public.orders
  for select to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

drop policy if exists "owner creates orders" on public.orders;
create policy "owner creates orders" on public.orders
  for insert to authenticated
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

drop policy if exists "owner updates orders" on public.orders;
create policy "owner updates orders" on public.orders
  for update to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

drop policy if exists "owner deletes orders" on public.orders;
create policy "owner deletes orders" on public.orders
  for delete to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));