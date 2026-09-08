-- Correct the V1 Plus plan limit for installations that ran the previous migration.
update public.subscription_plans
set product_limit = 20,
    name = 'Plus'
where id = 'growth';