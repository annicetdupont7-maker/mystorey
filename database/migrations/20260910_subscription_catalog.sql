-- Align the public subscription catalog with the current MYSTOREY offer.
-- Keep the legacy growth row for existing subscribers, but do not expose it in the UI.
create table if not exists public.subscription_plans (
    id text primary key,
    name text not null,
    price integer not null default 0 check (price >= 0),
    product_limit integer check (product_limit is null or product_limit > 0),
    description text not null default '',
    created_at timestamptz not null default now()
);

insert into public.subscription_plans (id, name, price, product_limit, description)
values
    ('free', 'Découverte', 0, 10, 'Pour créer une boutique, gérer vos produits et recevoir des commandes WhatsApp.'),
    ('growth', 'Plus', 2000, 20, 'Pour commencer à vendre régulièrement avec plus de liberté.'),
    ('pro', 'Pro', 2500, 100, 'Pour gérer une boutique avec davantage de produits, catégories et commandes WhatsApp.')
on conflict (id) do nothing;

update public.subscription_plans
set product_limit = 10,
    description = 'Pour créer une boutique, gérer vos produits et recevoir des commandes WhatsApp.'
where id = 'free';

update public.subscription_plans
set price = 2500,
    product_limit = 100,
    description = 'Pour gérer une boutique avec davantage de produits, catégories et commandes WhatsApp.'
where id = 'pro';
