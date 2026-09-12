-- =====================================================================
-- Variantes de produit et suivi de stock — strictement ADDITIF.
--
-- Objectif métier : une vendeuse qui propose la « Robe Boro » en noir,
-- rouge, bleu et vert ne doit PAS créer quatre produits. Elle crée un
-- produit et quatre variantes, chacune avec sa photo, son stock et,
-- si besoin, son prix.
--
-- Aucune donnée existante n'est touchée :
--   * products.stock est ajoutée en NULL = « stock non suivi »,
--     comportement identique à aujourd'hui ;
--   * un produit sans variante fonctionne exactement comme avant ;
--   * create_checkout_order garde SA SIGNATURE (le variantId voyage
--     dans le jsonb p_items), donc aucun appelant n'est cassé.
-- Relançable sans erreur dans le SQL Editor Supabase.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Stock au niveau produit (NULL = non suivi)
-- ---------------------------------------------------------------------
alter table public.products add column if not exists stock integer;
alter table public.products drop constraint if exists products_stock_positive;
alter table public.products add constraint products_stock_positive
  check (stock is null or stock >= 0);

-- ---------------------------------------------------------------------
-- 2. Variantes
-- ---------------------------------------------------------------------
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  option_group text not null default 'Couleur',
  label text not null,
  price integer,
  stock integer,
  image_url text,
  position integer not null default 0 check (position >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint product_variants_label_len check (char_length(label) between 1 and 40),
  constraint product_variants_group_len check (char_length(option_group) between 1 and 30),
  constraint product_variants_price_positive check (price is null or (price >= 0 and price <= 100000000)),
  constraint product_variants_stock_positive check (stock is null or stock >= 0)
);

create index if not exists product_variants_product_position_idx
  on public.product_variants(product_id, position, created_at);

-- Deux variantes du même groupe ne peuvent pas porter le même nom.
create unique index if not exists product_variants_unique_label_idx
  on public.product_variants(product_id, option_group, label);

alter table public.product_variants enable row level security;
revoke all on public.product_variants from anon, authenticated;
grant select, insert, update, delete on public.product_variants to authenticated;
grant select on public.product_variants to anon;

drop policy if exists "owners read product variants" on public.product_variants;
create policy "owners read product variants" on public.product_variants
  for select to authenticated using (exists (
    select 1 from public.products p join public.stores s on s.id = p.store_id
    where p.id = product_id and s.owner_id = auth.uid()
  ));

-- Le public ne voit que les variantes actives des produits disponibles
-- d'une boutique publiée : même règle que product_media.
drop policy if exists "public reads active product variants" on public.product_variants;
create policy "public reads active product variants" on public.product_variants
  for select to anon, authenticated using (
    is_active = true
    and exists (
      select 1 from public.products p join public.stores s on s.id = p.store_id
      where p.id = product_id and p.is_available = true and s.status = 'published'
    )
  );

drop policy if exists "owners create product variants" on public.product_variants;
create policy "owners create product variants" on public.product_variants
  for insert to authenticated with check (exists (
    select 1 from public.products p join public.stores s on s.id = p.store_id
    where p.id = product_id and s.owner_id = auth.uid()
  ));

drop policy if exists "owners update product variants" on public.product_variants;
create policy "owners update product variants" on public.product_variants
  for update to authenticated using (exists (
    select 1 from public.products p join public.stores s on s.id = p.store_id
    where p.id = product_id and s.owner_id = auth.uid()
  )) with check (exists (
    select 1 from public.products p join public.stores s on s.id = p.store_id
    where p.id = product_id and s.owner_id = auth.uid()
  ));

drop policy if exists "owners delete product variants" on public.product_variants;
create policy "owners delete product variants" on public.product_variants
  for delete to authenticated using (exists (
    select 1 from public.products p join public.stores s on s.id = p.store_id
    where p.id = product_id and s.owner_id = auth.uid()
  ));

-- ---------------------------------------------------------------------
-- 3. Checkout : la variante et le stock sont validés PAR LE SERVEUR
--
-- La signature est inchangée. `variantId` est lu dans chaque élément de
-- p_items ; absent, le comportement est celui d'avant.
-- Le prix vient TOUJOURS de la base : variante d'abord, produit sinon.
-- ---------------------------------------------------------------------
create or replace function public.create_checkout_order(
  p_store_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_note text,
  p_items jsonb
) returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_store public.stores%rowtype;
  v_item jsonb;
  v_product_id uuid;
  v_variant_id uuid;
  v_name text;
  v_unit int;
  v_qty int;
  v_stock int;
  v_product_price int;
  v_product_stock int;
  v_variant_label text;
  v_total int := 0;
  v_lines jsonb := '[]'::jsonb;
  v_order public.orders%rowtype;
begin
  if p_customer_name is null or char_length(p_customer_name) = 0 or char_length(p_customer_name) > 120 then
    raise exception 'checkout_invalid_name';
  end if;
  if p_customer_phone is not null and char_length(p_customer_phone) > 40 then
    raise exception 'checkout_invalid_phone';
  end if;
  if p_customer_address is not null and char_length(p_customer_address) > 250 then
    raise exception 'checkout_invalid_address';
  end if;
  if p_note is not null and char_length(p_note) > 500 then
    raise exception 'checkout_invalid_note';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'checkout_invalid_cart';
  end if;

  select * into v_store from public.stores where id = p_store_id;
  if not found then raise exception 'checkout_store_not_found'; end if;
  if v_store.status <> 'published' or coalesce(v_store.whatsapp, '') = '' then
    raise exception 'checkout_store_unavailable';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    begin
      v_product_id := (v_item->>'productId')::uuid;
    exception when others then
      raise exception 'checkout_invalid_line';
    end;

    v_variant_id := null;
    if nullif(v_item->>'variantId', '') is not null then
      begin
        v_variant_id := (v_item->>'variantId')::uuid;
      exception when others then
        raise exception 'checkout_invalid_line';
      end;
    end if;

    v_qty := (v_item->>'quantity')::int;
    if v_qty is null or v_qty < 1 or v_qty > 999 then raise exception 'checkout_invalid_line'; end if;

    select name, price, stock into v_name, v_product_price, v_product_stock
      from public.products
     where id = v_product_id and store_id = p_store_id and is_available = true;
    if not found then raise exception 'checkout_product_not_found'; end if;

    if v_variant_id is null then
      v_unit := v_product_price;
      v_stock := v_product_stock;
      v_variant_label := null;
    else
      -- La variante doit appartenir à CE produit et être active.
      select label, coalesce(price, v_product_price), stock
        into v_variant_label, v_unit, v_stock
        from public.product_variants
       where id = v_variant_id and product_id = v_product_id and is_active = true;
      if not found then raise exception 'checkout_variant_not_found'; end if;
      -- Une variante sans stock propre retombe sur celui du produit.
      if v_stock is null then v_stock := v_product_stock; end if;
      v_name := v_name || ' — ' || v_variant_label;
    end if;

    if v_stock is not null and v_qty > v_stock then
      raise exception 'checkout_insufficient_stock';
    end if;

    v_total := v_total + v_unit * v_qty;
    v_lines := v_lines || jsonb_build_object(
      'productId', v_product_id,
      'variantId', v_variant_id,
      'variantLabel', v_variant_label,
      'name', v_name,
      'unitPrice', v_unit,
      'quantity', v_qty
    );
  end loop;

  insert into public.orders (
    store_id, customer_name, customer_phone, customer_address, note, items, total, status
  ) values (
    p_store_id,
    trim(p_customer_name),
    coalesce(trim(p_customer_phone), ''),
    coalesce(trim(p_customer_address), ''),
    coalesce(trim(p_note), ''),
    v_lines,
    v_total,
    'new'
  )
  returning * into v_order;

  return v_order;
end;
$$;

revoke execute on function public.create_checkout_order(uuid, text, text, text, text, jsonb) from public;
grant execute on function public.create_checkout_order(uuid, text, text, text, text, jsonb) to anon, authenticated;
