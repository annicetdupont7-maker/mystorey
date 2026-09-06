-- Wave payment tracking table
create table if not exists wave_payments (
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

-- Update seller_subscriptions to include wave reference
alter table public.seller_subscriptions add column if not exists wave_payment_id uuid references public.wave_payments(id) on delete set null;
alter table public.seller_subscriptions add column if not exists trial_ends_at timestamptz;
alter table public.seller_subscriptions add column if not exists cancel_requested_at timestamptz;

-- Index for quick lookups
create index if not exists idx_wave_payments_store on wave_payments(store_id);
create index if not exists idx_wave_payments_status on wave_payments(status);
create index if not exists idx_seller_subs_wave on seller_subscriptions(wave_payment_id);
