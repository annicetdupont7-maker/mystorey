-- =====================================================================
-- VendoFlow — Catégories de produits
-- Mission : permettre aux vendeuses d'organiser leur catalogue.
-- Idempotent : relançable sans erreur dans le Supabase SQL Editor.
-- Aucune suppression de données existantes. RLS jamais désactivée.
-- =====================================================================

-- 1. Table des catégories (chaque catégorie appartient à une boutique)
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists categories_store_id_idx on public.categories(store_id);

drop trigger if exists categories_updated_at on public.categories;
create trigger categories_updated_at before update on public.categories
  for each row execute procedure public.set_updated_at();

-- 2. Lien produits.category_id -> categories.id
--    NULL pour les anciens produits (aucune catégorie obligatoire).
alter table public.products add column if not exists category_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_category_id_fkey'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_category_id_fkey
      foreign key (category_id) references public.categories(id) on delete set null;
  end if;
end
$$;

create index if not exists products_store_category_idx on public.products(store_id, category_id);

-- 3. RLS — isolation totale entre boutiques
alter table public.categories enable row level security;

revoke all on public.categories from anon, authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select on public.categories to anon;

drop policy if exists "owner reads own categories" on public.categories;
create policy "owner reads own categories" on public.categories
  for select to authenticated using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

drop policy if exists "public reads published categories" on public.categories;
create policy "public reads published categories" on public.categories
  for select to anon, authenticated using (exists (select 1 from public.stores s where s.id = store_id and s.status = 'published'));

drop policy if exists "owner creates categories" on public.categories;
create policy "owner creates categories" on public.categories
  for insert to authenticated with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

drop policy if exists "owner updates categories" on public.categories;
create policy "owner updates categories" on public.categories
  for update to authenticated using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

drop policy if exists "owner deletes categories" on public.categories;
create policy "owner deletes categories" on public.categories
  for delete to authenticated using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

-- 4. Verrou supplémentaire : un produit ne peut jamais être rattaché à une
--    catégorie d'une autre boutique (garde au niveau base, indépendante de RLS).
create or replace function public.check_product_category_owner() returns trigger language plpgsql set search_path = public as $$
begin
  if new.category_id is not null and not exists (
    select 1 from public.categories c
    where c.id = new.category_id and c.store_id = new.store_id
  ) then
    raise exception 'Catégorie % hors boutique %', new.category_id, new.store_id;
  end if;
  return new;
end;
$$;

drop trigger if exists products_category_owner on public.products;
create trigger products_category_owner
  before insert or update on public.products
  for each row execute procedure public.check_product_category_owner();