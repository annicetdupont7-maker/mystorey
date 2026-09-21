-- Reconstruction of the MYSTOREY production schema as read from the live catalog on
-- 2026-09-21 (tables, constraints, functions, triggers, grants, RLS policies), plus the
-- minimal Supabase stubs it relies on (API roles, auth.uid(), storage). Used by
-- src/test/rls.integration.test.ts to prove the migrations against the real starting point.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create schema storage;
grant usage on schema public, auth, storage to anon, authenticated, service_role;

create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb, raw_app_meta_data jsonb default '{}'::jsonb);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;
grant execute on function auth.uid(), auth.role() to anon, authenticated, service_role;

create table storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
insert into storage.buckets (id, name, public) values ('product-images','product-images',true), ('store-images','store-images',true);

create type public.store_status as enum ('draft', 'published');
create type public.order_status as enum ('new','to_confirm','confirmed','preparing','shipped','delivered','cancelled');
create sequence public.order_number_seq;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  role text not null default 'seller' check (role = any (array['seller','admin']))
);
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text not null default '' check (char_length(description) <= 500),
  logo_url text, cover_url text,
  status public.store_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  whatsapp text, slogan text
);
create table public.store_themes (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null unique references public.stores(id) on delete cascade,
  preset_id text not null check (preset_id = any (array['elegant','minimal','luxury','modern','bold','natural','colorful'])),
  overrides jsonb not null default '{}'::jsonb,
  layout jsonb not null default '{}'::jsonb,
  version integer not null default 1 check (version = 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  note text not null default '' check (char_length(note) <= 120),
  description text not null default '' check (char_length(description) <= 1000),
  price integer not null check (price >= 0 and price <= 100000000),
  image_url text,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_featured boolean not null default false,
  category_id uuid references public.categories(id) on delete set null
);
create table public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null, public_url text not null,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now()
);
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_name text not null default '' check (char_length(customer_name) <= 120),
  customer_phone text not null default '' check (char_length(customer_phone) <= 40),
  items jsonb not null default '[]'::jsonb,
  total integer not null default 0 check (total >= 0),
  status public.order_status not null default 'new',
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  order_number text unique,
  customer_address text not null default ''
);
create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  note text not null default '',
  created_at timestamptz not null default now()
);
create table public.subscription_plans (
  id text primary key, name text not null,
  price integer not null default 0 check (price >= 0),
  product_limit integer check (product_limit is null or product_limit > 0),
  description text not null default '',
  created_at timestamptz not null default now()
);
insert into public.subscription_plans (id, name, price, product_limit) values ('free','Découverte',0,10), ('growth','Plus',2000,20), ('pro','Pro',2500,100);

create function public.set_updated_at() returns trigger language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end; $$;
create function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'); $$;
create function public.create_profile_for_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles (user_id, display_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', '')) on conflict (user_id) do nothing; return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_profile_for_user();
create function public.log_order_status() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.order_status_history (order_id, status) values (new.id, new.status); return new; end; $$;
create function public.assign_order_number() returns trigger language plpgsql security definer set search_path = public as $$
begin if new.order_number is null then new.order_number := 'VF-' || lpad(nextval('public.order_number_seq')::text, 4, '0'); end if; return new; end; $$;
create function public.check_product_category_owner() returns trigger language plpgsql set search_path = public as $$
begin
  if new.category_id is not null and not exists (select 1 from public.categories c where c.id = new.category_id and c.store_id = new.store_id) then
    raise exception 'Catégorie % hors boutique %', new.category_id, new.store_id;
  end if;
  return new;
end; $$;
create function public.create_store_with_theme(store_name text, store_slug text, theme_preset text) returns public.stores
language plpgsql security definer set search_path = public as $$
declare created_store public.stores;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.stores (owner_id, name, slug) values (auth.uid(), store_name, store_slug) returning * into created_store;
  insert into public.store_themes (store_id, preset_id) values (created_store.id, theme_preset);
  return created_store;
end; $$;
-- Production version of the checkout: no availability check.
create function public.create_checkout_order(p_store_id uuid, p_customer_name text, p_customer_phone text, p_customer_address text, p_note text, p_items jsonb)
returns public.orders language plpgsql security definer set search_path = public as $$
declare v_store public.stores%rowtype; v_item jsonb; v_product_id uuid; v_name text; v_unit int; v_qty int; v_total int := 0; v_lines jsonb := '[]'::jsonb; v_order public.orders%rowtype;
begin
  select * into v_store from public.stores where id = p_store_id;
  if not found then raise exception 'checkout_store_not_found'; end if;
  if v_store.status <> 'published' or coalesce(v_store.whatsapp, '') = '' then raise exception 'checkout_store_unavailable'; end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_product_id := (v_item->>'productId')::uuid; v_qty := (v_item->>'quantity')::int;
    select name, price into v_name, v_unit from public.products where id = v_product_id and store_id = p_store_id;
    if not found then raise exception 'checkout_product_not_found'; end if;
    v_total := v_total + v_unit * v_qty;
    v_lines := v_lines || jsonb_build_object('productId', v_product_id, 'name', v_name, 'unitPrice', v_unit, 'quantity', v_qty);
  end loop;
  insert into public.orders (store_id, customer_name, customer_phone, customer_address, note, items, total, status)
  values (p_store_id, trim(p_customer_name), coalesce(trim(p_customer_phone), ''), coalesce(trim(p_customer_address), ''), coalesce(trim(p_note), ''), v_lines, v_total, 'new')
  returning * into v_order;
  return v_order;
end; $$;

create trigger categories_updated_at before update on public.categories for each row execute function public.set_updated_at();
create trigger orders_assign_number before insert on public.orders for each row execute function public.assign_order_number();
create trigger orders_log_status_insert after insert on public.orders for each row execute function public.log_order_status();
create trigger orders_log_status_update after update of status on public.orders for each row when (old.status is distinct from new.status) execute function public.log_order_status();
create trigger products_category_owner before insert or update on public.products for each row execute function public.check_product_category_owner();
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

alter table public.categories enable row level security;
alter table public.orders enable row level security;
alter table public.product_media enable row level security;
alter table public.products enable row level security;
alter table public.profiles enable row level security;
alter table public.store_themes enable row level security;
alter table public.stores enable row level security;
alter table public.subscription_plans enable row level security;
-- order_status_history: RLS disabled in production.

grant delete, insert, select, update on public.categories to authenticated; grant select on public.categories to anon;
grant all on public.order_status_history to authenticated;
grant delete, insert, select, update on public.orders to authenticated;
grant select on public.product_media to anon; grant delete, insert, select on public.product_media to authenticated;
grant delete, insert, select, update on public.products to authenticated; grant select on public.products to anon;
grant select, update on public.profiles to authenticated;
grant select on public.store_themes to anon; grant delete, insert, select, update on public.store_themes to authenticated;
grant select on public.stores to anon; grant delete, insert, select, update on public.stores to authenticated;
grant all on public.subscription_plans to anon, authenticated;
grant usage on sequence public.order_number_seq to authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

create policy "owner creates categories" on public.categories for insert to authenticated with check (exists (select 1 from stores s where s.id = categories.store_id and s.owner_id = auth.uid()));
create policy "owner deletes categories" on public.categories for delete to authenticated using (exists (select 1 from stores s where s.id = categories.store_id and s.owner_id = auth.uid()));
create policy "owner reads own categories" on public.categories for select to authenticated using (exists (select 1 from stores s where s.id = categories.store_id and s.owner_id = auth.uid()));
create policy "owner updates categories" on public.categories for update to authenticated using (exists (select 1 from stores s where s.id = categories.store_id and s.owner_id = auth.uid())) with check (exists (select 1 from stores s where s.id = categories.store_id and s.owner_id = auth.uid()));
create policy "public reads published categories" on public.categories for select to anon, authenticated using (exists (select 1 from stores s where s.id = categories.store_id and s.status = 'published'));
create policy "owner creates orders" on public.orders for insert to authenticated with check (exists (select 1 from stores s where s.id = orders.store_id and s.owner_id = auth.uid()));
create policy "owner deletes orders" on public.orders for delete to authenticated using (exists (select 1 from stores s where s.id = orders.store_id and s.owner_id = auth.uid()));
create policy "owner reads own orders" on public.orders for select to authenticated using (exists (select 1 from stores s where s.id = orders.store_id and s.owner_id = auth.uid()));
create policy "owner updates orders" on public.orders for update to authenticated using (exists (select 1 from stores s where s.id = orders.store_id and s.owner_id = auth.uid())) with check (exists (select 1 from stores s where s.id = orders.store_id and s.owner_id = auth.uid()));
create policy "owners create product media" on public.product_media for insert to authenticated with check (exists (select 1 from products p join stores s on s.id = p.store_id where p.id = product_media.product_id and s.owner_id = auth.uid()));
create policy "owners delete product media" on public.product_media for delete to authenticated using (exists (select 1 from products p join stores s on s.id = p.store_id where p.id = product_media.product_id and s.owner_id = auth.uid()));
create policy "owners read product media" on public.product_media for select to authenticated using (exists (select 1 from products p join stores s on s.id = p.store_id where p.id = product_media.product_id and s.owner_id = auth.uid()));
create policy "public reads available product media" on public.product_media for select to anon, authenticated using (exists (select 1 from products p join stores s on s.id = p.store_id where p.id = product_media.product_id and p.is_available = true and s.status = 'published'));
create policy "owner creates products" on public.products for insert to authenticated with check (exists (select 1 from stores s where s.id = products.store_id and s.owner_id = auth.uid()));
create policy "owner deletes products" on public.products for delete to authenticated using (exists (select 1 from stores s where s.id = products.store_id and s.owner_id = auth.uid()));
create policy "owner reads own products" on public.products for select to authenticated using (exists (select 1 from stores s where s.id = products.store_id and s.owner_id = auth.uid()));
create policy "owner updates products" on public.products for update to authenticated using (exists (select 1 from stores s where s.id = products.store_id and s.owner_id = auth.uid())) with check (exists (select 1 from stores s where s.id = products.store_id and s.owner_id = auth.uid()));
create policy "public reads published products" on public.products for select to anon, authenticated using (is_available and exists (select 1 from stores s where s.id = products.store_id and s.status = 'published'));
create policy "profile owner reads profile" on public.profiles for select to authenticated using (user_id = auth.uid());
create policy "profile owner updates profile" on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner creates themes" on public.store_themes for insert to authenticated with check (exists (select 1 from stores s where s.id = store_themes.store_id and s.owner_id = auth.uid()));
create policy "owner deletes themes" on public.store_themes for delete to authenticated using (exists (select 1 from stores s where s.id = store_themes.store_id and s.owner_id = auth.uid()));
create policy "owner reads own themes" on public.store_themes for select to authenticated using (exists (select 1 from stores s where s.id = store_themes.store_id and s.owner_id = auth.uid()));
create policy "owner updates themes" on public.store_themes for update to authenticated using (exists (select 1 from stores s where s.id = store_themes.store_id and s.owner_id = auth.uid())) with check (exists (select 1 from stores s where s.id = store_themes.store_id and s.owner_id = auth.uid()));
create policy "public reads published themes" on public.store_themes for select to anon, authenticated using (exists (select 1 from stores s where s.id = store_themes.store_id and s.status = 'published'));
create policy "owner creates own stores" on public.stores for insert to authenticated with check (owner_id = auth.uid());
create policy "owner deletes own stores" on public.stores for delete to authenticated using (owner_id = auth.uid());
create policy "owner reads own stores" on public.stores for select to authenticated using (owner_id = auth.uid());
create policy "owner updates own stores" on public.stores for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "public reads published stores" on public.stores for select to anon, authenticated using (status = 'published');

-- Supabase default privileges: every NEW table/function is fully granted to the API roles,
-- which is why each migration must revoke before granting.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
