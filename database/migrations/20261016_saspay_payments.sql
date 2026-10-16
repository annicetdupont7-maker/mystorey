-- Paiements SasPay. Table séparée des autres prestataires : un prestataire, un journal,
-- pour qu'un rapprochement comptable n'ait jamais à deviner d'où vient une ligne.
--
-- Deux identifiants, pas un : SasPay crée d'abord une SESSION de paiement, puis une
-- TRANSACTION quand la vendeuse paie réellement. Le webhook ne connaît que la seconde.
-- On garde donc les deux, et la transaction reste nulle jusqu'à ce qu'elle existe.
create table if not exists public.saspay_payments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  plan_id text not null references public.subscription_plans(id),
  saspay_session_id text not null unique,
  saspay_transaction_id text unique,
  amount integer not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'cancelled')),
  payment_method text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.seller_subscriptions
  add column if not exists saspay_payment_id uuid references public.saspay_payments(id) on delete set null;

create index if not exists idx_saspay_payments_store on public.saspay_payments(store_id);
create index if not exists idx_saspay_payments_status on public.saspay_payments(status);
-- Le webhook arrive avec un identifiant de transaction inconnu de nous : il faut pouvoir
-- balayer les sessions encore en attente sans table scan.
create index if not exists idx_saspay_payments_pending on public.saspay_payments(created_at desc) where status = 'pending';
create index if not exists idx_seller_subs_saspay on public.seller_subscriptions(saspay_payment_id);

alter table public.saspay_payments enable row level security;
revoke all on public.saspay_payments from anon, authenticated;
grant select, insert on public.saspay_payments to authenticated;

-- Le montant est revalidé en base contre le prix du plan, et une ligne ne peut naître
-- qu'en 'pending' : une vendeuse ne peut pas s'auto-déclarer payée depuis le navigateur.
drop trigger if exists validate_saspay_payment_attempt on public.saspay_payments;
create trigger validate_saspay_payment_attempt
  before insert on public.saspay_payments
  for each row execute procedure public.validate_payment_attempt();

drop policy if exists "store owners read saspay payments" on public.saspay_payments;
create policy "store owners read saspay payments" on public.saspay_payments
  for select to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

drop policy if exists "store owners create saspay payments" on public.saspay_payments;
create policy "store owners create saspay payments" on public.saspay_payments
  for insert to authenticated
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
