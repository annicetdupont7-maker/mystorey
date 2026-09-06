-- Manual WhatsApp re-engagement MVP. No automatic message delivery.
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'seller_subscriptions' and column_name = 'wave_payment_id' and data_type = 'text') then
    alter table public.seller_subscriptions drop constraint if exists seller_subscriptions_wave_payment_id_fkey;
    alter table public.seller_subscriptions alter column wave_payment_id type uuid using nullif(wave_payment_id, '')::uuid;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'seller_subscriptions' and column_name = 'fedapay_payment_id' and data_type = 'text') then
    alter table public.seller_subscriptions drop constraint if exists seller_subscriptions_fedapay_payment_id_fkey;
    alter table public.seller_subscriptions alter column fedapay_payment_id type uuid using nullif(fedapay_payment_id, '')::uuid;
  end if;
end
$$;

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
create policy "owners manage customer contacts" on public.customer_contacts
  for all to authenticated using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

drop policy if exists "owners manage reengagement logs" on public.reengagement_logs;
create policy "owners manage reengagement logs" on public.reengagement_logs
  for all to authenticated using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

create or replace function public.set_reengagement_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists customer_contacts_updated_at on public.customer_contacts;
create trigger customer_contacts_updated_at before update on public.customer_contacts
  for each row execute procedure public.set_reengagement_updated_at();
