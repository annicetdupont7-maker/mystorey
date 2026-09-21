-- =====================================================================
-- MYSTOREY — durcissement de lancement (2026-09-21)
--
-- STRICTEMENT ADDITIF : aucune ligne ni table n'est supprimée, aucune
-- colonne existante n'est modifiée. Rejouable sans erreur.
--
-- À exécuter APRÈS 20260912_product_variants.sql (stock, variantes et
-- checkout qui refuse les produits indisponibles).
--
-- Ce que la base de production autorisait avant ce script :
--   * un vendeur pouvait écrire profiles.role = 'admin' depuis le
--     navigateur (policy UPDATE sans restriction de colonne) ;
--   * order_status_history n'avait pas de RLS : tout compte connecté
--     pouvait lire, modifier ou vider l'historique de TOUTES les boutiques ;
--   * subscription_plans accordait tous les droits (dont TRUNCATE) à anon :
--     la RLS sans policy bloquait l'API, mais les droits étaient trop larges ;
--   * la limite de produits du plan gratuit n'était vérifiée que par
--     l'application, pas par la base.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Le rôle administrateur ne se modifie plus côté client
-- ---------------------------------------------------------------------
-- Le vendeur garde le droit de changer son nom affiché, et seulement lui.
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

-- Deuxième verrou, indépendant des droits de colonne : seul le serveur
-- (clé service) ou un administrateur SQL peut changer un rôle.
-- SECURITY INVOKER exprès : current_user doit être l'appelant réel.
create or replace function public.protect_profile_role() returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  if new.role is distinct from old.role and current_user in ('anon', 'authenticated') then
    raise exception 'role_change_forbidden';
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ---------------------------------------------------------------------
-- 2. Historique des statuts de commande : lecture par la seule boutique
-- ---------------------------------------------------------------------
alter table public.order_status_history enable row level security;
revoke all on public.order_status_history from anon, authenticated;
grant select on public.order_status_history to authenticated;
drop policy if exists "owners read order history" on public.order_status_history;
create policy "owners read order history" on public.order_status_history
  for select to authenticated
  using (exists (
    select 1 from public.orders o join public.stores s on s.id = o.store_id
    where o.id = order_id and s.owner_id = auth.uid()
  ));
-- Les lignes restent écrites par le trigger log_order_status (SECURITY DEFINER).

-- ---------------------------------------------------------------------
-- 3. Catalogue des plans : lisible par tous, modifiable par personne
-- ---------------------------------------------------------------------
revoke all on public.subscription_plans from anon, authenticated;
grant select on public.subscription_plans to anon, authenticated;
drop policy if exists "public reads subscription plans" on public.subscription_plans;
create policy "public reads subscription plans" on public.subscription_plans
  for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------
-- 4. Abonnements : une ligne par boutique, plan gratuit par défaut
-- ---------------------------------------------------------------------
create table if not exists public.seller_subscriptions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null unique references public.stores(id) on delete cascade,
  plan_id text not null default 'free' references public.subscription_plans(id),
  status text not null default 'active' check (status in ('active', 'pending', 'expired')),
  payment_status text not null default 'paid' check (payment_status in ('pending', 'paid', 'failed')),
  provider text not null default 'manual',
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

insert into public.seller_subscriptions (store_id, plan_id, status, payment_status, provider)
select id, 'free', 'active', 'paid', 'manual' from public.stores
on conflict (store_id) do nothing;

create or replace function public.create_free_subscription_for_store() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.seller_subscriptions (store_id, plan_id, status, payment_status, provider)
  values (new.id, 'free', 'active', 'paid', 'manual')
  on conflict (store_id) do nothing;
  return new;
end;
$$;
drop trigger if exists stores_create_free_subscription on public.stores;
create trigger stores_create_free_subscription after insert on public.stores
  for each row execute function public.create_free_subscription_for_store();

alter table public.seller_subscriptions enable row level security;
revoke all on public.seller_subscriptions from anon, authenticated;
grant select on public.seller_subscriptions to authenticated;
drop policy if exists "store owners read subscriptions" on public.seller_subscriptions;
create policy "store owners read subscriptions" on public.seller_subscriptions
  for select to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
-- Aucune écriture côté client : un plan payant ne s'active que par le
-- webhook du prestataire (clé service), après paiement vérifié.

create or replace function public.activate_free_subscription(p_store_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not exists (select 1 from public.stores where id = p_store_id and owner_id = auth.uid()) then
    raise exception 'store_not_owned';
  end if;
  insert into public.seller_subscriptions (store_id, plan_id, status, payment_status, provider, started_at, expires_at, updated_at)
  values (p_store_id, 'free', 'active', 'paid', 'manual', now(), null, now())
  on conflict (store_id) do update set plan_id = 'free', status = 'active', payment_status = 'paid',
    provider = 'manual', expires_at = null, updated_at = now();
end;
$$;
revoke all on function public.activate_free_subscription(uuid) from public;
grant execute on function public.activate_free_subscription(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 5. Limite de produits appliquée par la base, pas seulement par l'app
-- ---------------------------------------------------------------------
create or replace function public.enforce_product_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  current_count integer;
  allowed_limit integer;
  sub record;
begin
  -- Verrou de boutique : deux ajouts simultanés ne dépassent pas la limite.
  perform 1 from public.stores where id = new.store_id for update;
  select ss.plan_id, ss.status, ss.payment_status, ss.expires_at into sub
    from public.seller_subscriptions ss where ss.store_id = new.store_id;

  if sub.plan_id is null or sub.plan_id = 'free'
     or sub.status <> 'active' or sub.payment_status <> 'paid'
     or (sub.expires_at is not null and sub.expires_at <= now()) then
    -- Sans plan payant actif, c'est la limite du plan gratuit qui s'applique.
    select product_limit into allowed_limit from public.subscription_plans where id = 'free';
  else
    select product_limit into allowed_limit from public.subscription_plans where id = sub.plan_id;
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
  for each row execute function public.enforce_product_limit();

-- ---------------------------------------------------------------------
-- 6. Paiements KKiaPay : table prête, montant vérifié par la base
--    (le paiement en ligne reste FERMÉ tant que KKIAPAY_PAYMENTS_ENABLED
--    n'est pas à "true" dans Vercel)
-- ---------------------------------------------------------------------
create or replace function public.validate_payment_attempt() returns trigger
language plpgsql security definer set search_path = public as $$
declare expected_amount integer;
begin
  select price into expected_amount from public.subscription_plans where id = new.plan_id;
  if expected_amount is null or new.amount <> expected_amount then raise exception 'payment_amount_mismatch'; end if;
  if new.status <> 'pending' then raise exception 'payment_must_start_pending'; end if;
  return new;
end;
$$;

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

alter table public.kkiapay_payments enable row level security;
revoke all on public.kkiapay_payments from anon, authenticated;
grant select, insert on public.kkiapay_payments to authenticated;
drop trigger if exists validate_kkiapay_payment_attempt on public.kkiapay_payments;
create trigger validate_kkiapay_payment_attempt before insert on public.kkiapay_payments
  for each row execute function public.validate_payment_attempt();
drop policy if exists "store owners read kkiapay payments" on public.kkiapay_payments;
create policy "store owners read kkiapay payments" on public.kkiapay_payments
  for select to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
drop policy if exists "store owners create kkiapay payments" on public.kkiapay_payments;
create policy "store owners create kkiapay payments" on public.kkiapay_payments
  for insert to authenticated
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

-- ---------------------------------------------------------------------
-- 7. Relances WhatsApp (page Marketing) : tables absentes en production
-- ---------------------------------------------------------------------
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
create index if not exists reengagement_logs_store_phone_idx on public.reengagement_logs(store_id, customer_phone, created_at desc);
alter table public.customer_contacts enable row level security;
alter table public.reengagement_logs enable row level security;
revoke all on public.customer_contacts, public.reengagement_logs from anon, authenticated;
grant select, insert, update on public.customer_contacts to authenticated;
grant select, insert on public.reengagement_logs to authenticated;
drop policy if exists "owners manage customer contacts" on public.customer_contacts;
create policy "owners manage customer contacts" on public.customer_contacts
  for all to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
drop policy if exists "owners manage reengagement logs" on public.reengagement_logs;
create policy "owners manage reengagement logs" on public.reengagement_logs
  for all to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
drop trigger if exists customer_contacts_updated_at on public.customer_contacts;
create trigger customer_contacts_updated_at before update on public.customer_contacts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 8. Aide & suggestions : les messages des vendeuses vers l'équipe
-- ---------------------------------------------------------------------
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  kind text not null check (kind in ('problem', 'suggestion', 'help')),
  message text not null check (char_length(message) between 5 and 2000),
  page text not null default '' check (char_length(page) <= 200),
  contact text not null default '' check (char_length(contact) <= 120),
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved')),
  admin_note text not null default '' check (char_length(admin_note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists feedback_status_created_idx on public.feedback(status, created_at desc);
create index if not exists feedback_user_idx on public.feedback(user_id, created_at desc);
alter table public.feedback enable row level security;
revoke all on public.feedback from anon, authenticated;
grant select, insert on public.feedback to authenticated;
drop policy if exists "users send feedback" on public.feedback;
create policy "users send feedback" on public.feedback
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'new' and admin_note = ''
    and (store_id is null or exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()))
  );
drop policy if exists "users read own feedback" on public.feedback;
create policy "users read own feedback" on public.feedback
  for select to authenticated using (user_id = auth.uid());
-- Le suivi (statut, note interne) se fait uniquement depuis le back-office (clé service).
drop trigger if exists feedback_updated_at on public.feedback;
create trigger feedback_updated_at before update on public.feedback
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 9. Stockage : le bucket refuse lui-même les fichiers trop lourds
--    ou qui ne sont pas des images (l'app convertit déjà tout en WebP)
-- ---------------------------------------------------------------------
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id in ('product-images', 'store-images');
