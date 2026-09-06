-- MYSTOREY launch hardening: prevent client-side role escalation and protect payment records.

revoke update on public.profiles from authenticated;
drop policy if exists "profile owner updates profile" on public.profiles;

alter table public.wave_payments enable row level security;
alter table public.fedapay_payments enable row level security;
alter table public.seller_subscriptions enable row level security;

revoke all on public.wave_payments, public.fedapay_payments, public.seller_subscriptions from anon, authenticated;
grant select, insert on public.wave_payments to authenticated;
grant select, insert on public.fedapay_payments to authenticated;
grant select on public.seller_subscriptions to authenticated;

create or replace function public.enforce_product_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  current_count integer;
  allowed_limit integer;
  subscription_row record;
begin
  perform 1 from public.stores where id = new.store_id for update;
  select ss.plan_id, ss.status, ss.payment_status, ss.expires_at into subscription_row
    from public.seller_subscriptions ss where ss.store_id = new.store_id;
  if subscription_row.plan_id is null then
    allowed_limit := 10;
  elsif subscription_row.plan_id <> 'free' and (subscription_row.status <> 'active' or subscription_row.payment_status <> 'paid' or (subscription_row.expires_at is not null and subscription_row.expires_at <= now())) then
    raise exception 'subscription_not_active';
  else
    select product_limit into allowed_limit from public.subscription_plans where id = subscription_row.plan_id;
  end if;
  if allowed_limit is not null then
    select count(*) into current_count from public.products where store_id = new.store_id;
    if current_count >= allowed_limit then raise exception 'product_limit_reached'; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_product_limit on public.products;
create trigger enforce_product_limit before insert on public.products
  for each row execute procedure public.enforce_product_limit();

create or replace function public.validate_payment_attempt() returns trigger
language plpgsql security definer set search_path = public as $$
declare expected_amount integer;
begin
  select price into expected_amount from public.subscription_plans where id = new.plan_id;
  if expected_amount is null or new.amount <> expected_amount then
    raise exception 'payment_amount_mismatch';
  end if;
  if new.status <> 'pending' then
    raise exception 'payment_must_start_pending';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_wave_payment_attempt on public.wave_payments;
create trigger validate_wave_payment_attempt before insert on public.wave_payments
  for each row execute procedure public.validate_payment_attempt();
drop trigger if exists validate_fedapay_payment_attempt on public.fedapay_payments;
create trigger validate_fedapay_payment_attempt before insert on public.fedapay_payments
  for each row execute procedure public.validate_payment_attempt();

create or replace function public.activate_free_subscription(p_store_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not exists (select 1 from public.stores where id = p_store_id and owner_id = auth.uid()) then
    raise exception 'store_not_owned';
  end if;
  insert into public.seller_subscriptions (store_id, plan_id, status, payment_status, provider, started_at, expires_at, updated_at)
  values (p_store_id, 'free', 'active', 'paid', 'manual', now(), null, now())
  on conflict (store_id) do update set plan_id = 'free', status = 'active', payment_status = 'paid', provider = 'manual', expires_at = null, updated_at = now();
end;
$$;
revoke all on function public.activate_free_subscription(uuid) from public;
grant execute on function public.activate_free_subscription(uuid) to authenticated;

drop policy if exists "store owners read wave payments" on public.wave_payments;
create policy "store owners read wave payments" on public.wave_payments
  for select to authenticated using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

drop policy if exists "store owners create wave payments" on public.wave_payments;
create policy "store owners create wave payments" on public.wave_payments
  for insert to authenticated with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

drop policy if exists "store owners read fedapay payments" on public.fedapay_payments;
create policy "store owners read fedapay payments" on public.fedapay_payments
  for select to authenticated using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

drop policy if exists "store owners create fedapay payments" on public.fedapay_payments;
create policy "store owners create fedapay payments" on public.fedapay_payments
  for insert to authenticated with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

drop policy if exists "store owners read subscriptions" on public.seller_subscriptions;
create policy "store owners read subscriptions" on public.seller_subscriptions
  for select to authenticated using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));