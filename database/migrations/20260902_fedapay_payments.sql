-- Fedapay payment tracking table
create table if not exists fedapay_payments (
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

-- Update seller_subscriptions to include fedapay reference
alter table public.seller_subscriptions add column if not exists fedapay_payment_id uuid references public.fedapay_payments(id) on delete set null;

-- Index for quick lookups
create index if not exists idx_fedapay_payments_store on fedapay_payments(store_id);
create index if not exists idx_fedapay_payments_status on fedapay_payments(status);
create index if not exists idx_seller_subs_fedapay on seller_subscriptions(fedapay_payment_id);
