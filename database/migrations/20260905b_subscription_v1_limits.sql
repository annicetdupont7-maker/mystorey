-- Align the V1 commercial limits for existing installations without deleting data.
update public.subscription_plans
set product_limit = 10,
    name = 'Découverte'
where id = 'free';

update public.subscription_plans
set product_limit = 20,
    name = 'Plus'
where id = 'growth';

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
