-- Mission 3 — Produits.
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  note text not null default '' check (char_length(note) <= 120),
  description text not null default '' check (char_length(description) <= 1000),
  price integer not null check (price >= 0 and price <= 100000000),
  image_url text,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_store_id_idx on public.products(store_id);
drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products for each row execute procedure public.set_updated_at();

alter table public.products enable row level security;

revoke all on public.products from anon, authenticated;
grant select, insert, update, delete on public.products to authenticated;

drop policy if exists "owner reads own products" on public.products;
create policy "owner reads own products" on public.products for select to authenticated using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
drop policy if exists "public reads published products" on public.products;
create policy "public reads published products" on public.products for select to anon, authenticated using (exists (select 1 from public.stores s where s.id = store_id and s.status = 'published'));
drop policy if exists "owner creates products" on public.products;
create policy "owner creates products" on public.products for insert to authenticated with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
drop policy if exists "owner updates products" on public.products;
create policy "owner updates products" on public.products for update to authenticated using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())) with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
drop policy if exists "owner deletes products" on public.products;
create policy "owner deletes products" on public.products for delete to authenticated using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

-- Images : chemin public sous {user_id}/{uuid}.ext, upload limité au propriétaire.
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "public reads product images" on storage.objects;
create policy "public reads product images" on storage.objects for select to public using (bucket_id = 'product-images');
drop policy if exists "owner uploads product images" on storage.objects;
create policy "owner uploads product images" on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "owner updates product images" on storage.objects;
create policy "owner updates product images" on storage.objects for update to authenticated using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "owner deletes product images" on storage.objects;
create policy "owner deletes product images" on storage.objects for delete to authenticated using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);