-- =====================================================================
-- VendoFlow — Parcours de commande professionnel
-- ---------------------------------------------------------------------
-- Idempotent : relançable sans erreur dans le Supabase SQL Editor.
--
-- Ajoute, sans rien casser de l'existant :
--   1. orders.order_number  -> numéro lisible (#VF-0001), auto-généré
--   2. orders.customer_address -> adresse / lieu de livraison
--   3. order_status_history  -> historique horodaté de chaque statut
--      (prépare les futures notifications WhatsApp)
--   4. RPC create_checkout_order -> point d'entrée UNIQUE de création
--      d'une commande côté visiteur (creator = supabase server action)
--
-- Sécurité : RLS jamais désactivée. Le visiteur abstème ne peut PAS lire
-- les commandes : il passe par la fonction security definer qui valide
-- elle-même boutique publiée + produits appartenant à la boutique, puis
-- recalcule les prix depuis la base (jamais depuis le client).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Numéro de commande lisible
-- ---------------------------------------------------------------------
create sequence if not exists public.order_number_seq;

alter table public.orders add column if not exists order_number text;
alter table public.orders add column if not exists customer_address text not null default '';

-- Remplissage des lignes existantes (relançable : ne touche que les NULL)
update public.orders o
   set order_number = b.order_number
  from (
    select id,
           'VF-' || lpad((row_number() over (order by created_at, id))::text, 4, '0') as order_number
      from public.orders
     where order_number is null
  ) b
 where o.id = b.id;

create unique index if not exists orders_order_number_uidx on public.orders(order_number);

create or replace function public.assign_order_number() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.order_number is null then
    new.order_number := 'VF-' || lpad(nextval('public.order_number_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists orders_assign_number on public.orders;
create trigger orders_assign_number
  before insert on public.orders
  for each row execute procedure public.assign_order_number();

-- ---------------------------------------------------------------------
-- 2. Historique des statuts (prépare les notifications futures)
-- ---------------------------------------------------------------------
create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists order_history_order_idx
  on public.order_status_history(order_id, created_at desc);

create or replace function public.log_order_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.order_status_history (order_id, status) values (new.id, new.status);
  return new;
end;
$$;

drop trigger if exists orders_log_status_insert on public.orders;
create trigger orders_log_status_insert
  after insert on public.orders
  for each row execute procedure public.log_order_status();

drop trigger if exists orders_log_status_update on public.orders;
create trigger orders_log_status_update
  after update of status on public.orders
  for each row
  when (old.status is distinct from new.status)
  execute procedure public.log_order_status();

-- ---------------------------------------------------------------------
-- 3. Commande côté visiteur (checkout)
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
  v_name text;
  v_unit int;
  v_qty int;
  v_total int := 0;
  v_lines jsonb := '[]'::jsonb;
  v_order public.orders%rowtype;
begin
  -- Validation des champs (les contraintes de colonne gardent le niveau DB)
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

  -- La boutique doit exister, être publiée et joignable en WhatsApp
  select * into v_store from public.stores where id = p_store_id;
  if not found then raise exception 'checkout_store_not_found'; end if;
  if v_store.status <> 'published' or coalesce(v_store.whatsapp, '') = '' then
    raise exception 'checkout_store_unavailable';
  end if;

  -- Les lignes sont recomptées depuis la base : prix/quantités client ignorés
  for v_item in select * from jsonb_array_elements(p_items) loop
    begin
      v_product_id := (v_item->>'productId')::uuid;
    exception when others then
      raise exception 'checkout_invalid_line';
    end;
    v_qty := (v_item->>'quantity')::int;
    if v_qty is null or v_qty < 1 or v_qty > 999 then raise exception 'checkout_invalid_line'; end if;

    select name, price into v_name, v_unit
      from public.products
     where id = v_product_id and store_id = p_store_id and is_available = true;
    if not found then raise exception 'checkout_product_not_found'; end if;

    v_total := v_total + v_unit * v_qty;
    v_lines := v_lines || jsonb_build_object(
      'productId', v_product_id,
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

-- Le visiteur anonyme ne lit toujours PAS la table orders (revoke ci-dessous) :
-- seule la fonction est exposée, et uniquement en langage SQL via server action.
revoke execute on function public.create_checkout_order(uuid, text, text, text, text, jsonb) from public;
grant execute on function public.create_checkout_order(uuid, text, text, text, text, jsonb) to anon, authenticated;

-- Rappel sécurité : bloquer tout accès direct anon à orders
revoke all on public.orders from anon;
revoke all on public.order_status_history from anon;

alter table public.order_status_history enable row level security;
revoke all on public.order_status_history from anon, authenticated;
grant select on public.order_status_history to authenticated;
drop policy if exists "owners read order history" on public.order_status_history;
create policy "owners read order history" on public.order_status_history
  for select to authenticated using (exists (
    select 1 from public.orders o
    join public.stores s on s.id = o.store_id
    where o.id = order_id and s.owner_id = auth.uid()
  ));