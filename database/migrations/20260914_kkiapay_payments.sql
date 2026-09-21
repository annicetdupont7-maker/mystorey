-- Kkiapay payment tracking kept separate from the FedaPay provider table.
create table if not exists public.kkiapay_payments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  plan_id text not null references public.subscription_plans(id),
  kkiapay_transaction_id text not null unique,
  amount integer not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'cancelled')),
  payment_method text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.seller_subscriptions
  add column if not exists kkiapay_payment_id uuid references public.kkiapay_payments(id) on delete set null;

create index if not exists idx_kkiapay_payments_store on public.kkiapay_payments(store_id);
create index if not exists idx_kkiapay_payments_status on public.kkiapay_payments(status);
create index if not exists idx_seller_subs_kkiapay on public.seller_subscriptions(kkiapay_payment_id);

alter table public.kkiapay_payments enable row level security;
revoke all on public.kkiapay_payments from anon, authenticated;
grant select, insert on public.kkiapay_payments to authenticated;

drop trigger if exists validate_kkiapay_payment_attempt on public.kkiapay_payments;
create trigger validate_kkiapay_payment_attempt
  before insert on public.kkiapay_payments
  for each row execute procedure public.validate_payment_attempt();

drop policy if exists "store owners read kkiapay payments" on public.kkiapay_payments;
create policy "store owners read kkiapay payments" on public.kkiapay_payments
  for select to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

drop policy if exists "store owners create kkiapay payments" on public.kkiapay_payments;
create policy "store owners create kkiapay payments" on public.kkiapay_payments
  for insert to authenticated
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
