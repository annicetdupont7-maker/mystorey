-- Additive product gallery support. Existing products.image_url remains the legacy cover image.
create table if not exists public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now()
);

create index if not exists product_media_product_position_idx
  on public.product_media(product_id, position, created_at);

alter table public.product_media enable row level security;
revoke all on public.product_media from anon, authenticated;
grant select, insert, delete on public.product_media to authenticated;
grant select on public.product_media to anon;

drop policy if exists "owners read product media" on public.product_media;
create policy "owners read product media" on public.product_media
  for select to authenticated using (exists (
    select 1 from public.products p join public.stores s on s.id = p.store_id
    where p.id = product_id and s.owner_id = auth.uid()
  ));

drop policy if exists "public reads available product media" on public.product_media;
create policy "public reads available product media" on public.product_media
  for select to anon, authenticated using (exists (
    select 1 from public.products p join public.stores s on s.id = p.store_id
    where p.id = product_id and p.is_available = true and s.status = 'published'
  ));

drop policy if exists "owners create product media" on public.product_media;
create policy "owners create product media" on public.product_media
  for insert to authenticated with check (exists (
    select 1 from public.products p join public.stores s on s.id = p.store_id
    where p.id = product_id and s.owner_id = auth.uid()
  ));

drop policy if exists "owners delete product media" on public.product_media;
create policy "owners delete product media" on public.product_media
  for delete to authenticated using (exists (
    select 1 from public.products p join public.stores s on s.id = p.store_id
    where p.id = product_id and s.owner_id = auth.uid()
  ));

insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
on conflict (id) do nothing;
