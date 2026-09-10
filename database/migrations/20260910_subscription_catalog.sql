-- Align the public subscription catalog with the current MYSTOREY offer.
-- Keep the legacy growth row for existing subscribers, but do not expose it in the UI.
update public.subscription_plans
set product_limit = 10,
    description = 'Pour créer une boutique, gérer vos produits et recevoir des commandes WhatsApp.'
where id = 'free';

update public.subscription_plans
set price = 2500,
    product_limit = 100,
    description = 'Pour gérer une boutique avec davantage de produits, catégories et commandes WhatsApp.'
where id = 'pro';
