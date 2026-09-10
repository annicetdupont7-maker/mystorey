-- Correction additive finale pour la base Supabase MYSTOREY.
-- PREPAREE, MAIS NON EXECUTEE.
-- Ne supprime aucune ligne ni table. Les tables coeur existantes sont conservees.

-- 1. Activer le RLS manquant sur l'historique existant.
alter table public.order_status_history enable row level security;
revoke all on public.order_status_history from anon, authenticated;
grant select on public.order_status_history to authenticated;
drop policy if exists "owners read order history" on public.order_status_history;
create policy "owners read order history"
  on public.order_status_history
  for select to authenticated
  using (exists (
    select 1
    from public.orders o
    join public.stores s on s.id = o.store_id
    where o.id = order_id and s.owner_id = auth.uid()
  ));

-- 2. Creer les plans et abonnements absents.
create table if not exists public.subscription_plans (
  id text primary key,
  name text not null,
  price integer not null check (price >= 0),
  product_limit integer check (product_limit is null or product_limit > 0),
  description text not null default '',
  created_at timestamptz not null default now()
);

insert into public.subscription_plans (id, name, price, product_limit, description)
values
  ('free', 'Decouverte', 0, 10, 'Pour lancer votre boutique avec vos premiers produits.'),
  ('growth', 'Plus', 2000, 20, 'Pour commencer a vendre regulierement avec plus de liberte.'),
  ('pro', 'Pro', 2500, 100, 'Pour gerer une boutique avec davantage de produits, categories et commandes WhatsApp.')
on conflict (id) do nothing;

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
  created_at timestamptz not null default now(),
  wave_payment_id uuid,
  fedapay_payment_id uuid,
  trial_ends_at timestamptz,
  cancel_requested_at timestamptz
);

insert into public.seller_subscriptions (store_id, plan_id, status, payment_status, provider)
select id, 'free', 'active', 'paid', 'manual'
from public.stores
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

-- 3. Creer les tables de paiement absentes.
create table if not exists public.wave_payments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  plan_id text not null references public.subscription_plans(id),
  wave_payment_id text unique,
  amount integer not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'cancelled')),
  payment_method text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fedapay_payments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  plan_id text not null references public.subscription_plans(id),
  fedapay_transaction_id text unique,
  amount integer not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'cancelled')),
  payment_method text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ajouter les relations seulement si elles manquent.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'seller_subscriptions_wave_payment_id_fkey') then
    alter table public.seller_subscriptions
      add constraint seller_subscriptions_wave_payment_id_fkey
      foreign key (wave_payment_id) references public.wave_payments(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'seller_subscriptions_fedapay_payment_id_fkey') then
    alter table public.seller_subscriptions
      add constraint seller_subscriptions_fedapay_payment_id_fkey
      foreign key (fedapay_payment_id) references public.fedapay_payments(id) on delete set null;
  end if;
end
$$;

create index if not exists idx_wave_payments_store on public.wave_payments(store_id);
create index if not exists idx_wave_payments_status on public.wave_payments(status);
create index if not exists idx_fedapay_payments_store on public.fedapay_payments(store_id);
create index if not exists idx_fedapay_payments_status on public.fedapay_payments(status);
create index if not exists idx_seller_subs_wave on public.seller_subscriptions(wave_payment_id);
create index if not exists idx_seller_subs_fedapay on public.seller_subscriptions(fedapay_payment_id);

-- 4. RLS et policies minimales pour abonnements et paiements.
alter table public.subscription_plans enable row level security;
alter table public.seller_subscriptions enable row level security;
alter table public.wave_payments enable row level security;
alter table public.fedapay_payments enable row level security;
revoke all on public.subscription_plans, public.seller_subscriptions, public.wave_payments, public.fedapay_payments from anon, authenticated;
grant select on public.subscription_plans to anon, authenticated;
grant select on public.seller_subscriptions to authenticated;
grant select, insert on public.wave_payments, public.fedapay_payments to authenticated;

drop policy if exists "public reads subscription plans" on public.subscription_plans;
create policy "public reads subscription plans"
  on public.subscription_plans for select to anon, authenticated using (true);
drop policy if exists "store owners read subscriptions" on public.seller_subscriptions;
create policy "store owners read subscriptions"
  on public.seller_subscriptions for select to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
drop policy if exists "store owners read wave payments" on public.wave_payments;
create policy "store owners read wave payments"
  on public.wave_payments for select to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
drop policy if exists "store owners create wave payments" on public.wave_payments;
create policy "store owners create wave payments"
  on public.wave_payments for insert to authenticated
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
drop policy if exists "store owners read fedapay payments" on public.fedapay_payments;
create policy "store owners read fedapay payments"
  on public.fedapay_payments for select to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
drop policy if exists "store owners create fedapay payments" on public.fedapay_payments;
create policy "store owners create fedapay payments"
  on public.fedapay_payments for insert to authenticated
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

-- 5. Creer les tables de relance absentes et les proteger.
create table if not exists public.customer_contacts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  phone text not null,
  name text not null default '',
  marketing_consent boolean not null default false,
  opted_out boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, phone)
);

create table if not exists public.reengagement_logs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_phone text not null,
  order_id uuid references public.orders(id) on delete set null,
  kind text not null check (kind in ('pending_order', 'inactive_customer')),
  message text not null check (char_length(message) <= 2000),
  status text not null default 'opened' check (status in ('opened', 'completed', 'ignored')),
  created_at timestamptz not null default now()
);

create index if not exists customer_contacts_store_phone_idx on public.customer_contacts(store_id, phone);
create index if not exists reengagement_logs_store_phone_idx on public.reengagement_logs(store_id, customer_phone, created_at desc);
alter table public.customer_contacts enable row level security;
alter table public.reengagement_logs enable row level security;
revoke all on public.customer_contacts, public.reengagement_logs from anon, authenticated;
grant select, insert, update on public.customer_contacts to authenticated;
grant select, insert, update on public.reengagement_logs to authenticated;

drop policy if exists "owners manage customer contacts" on public.customer_contacts;
create policy "owners manage customer contacts"
  on public.customer_contacts for all to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
drop policy if exists "owners manage reengagement logs" on public.reengagement_logs;
create policy "owners manage reengagement logs"
  on public.reengagement_logs for all to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

create or replace function public.set_reengagement_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists customer_contacts_updated_at on public.customer_contacts;
create trigger customer_contacts_updated_at
  before update on public.customer_contacts
  for each row execute procedure public.set_reengagement_updated_at();
