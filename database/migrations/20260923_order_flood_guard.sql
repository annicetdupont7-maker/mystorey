-- =====================================================================
-- MYSTOREY — Garde anti-inondation du checkout public
-- ---------------------------------------------------------------------
-- Le checkout public (create_checkout_order) n'avait aucune limite : une
-- boucle sur le formulaire d'une vitrine pouvait remplir la table orders
-- d'une vendeuse, noyer ses vraies commandes et lui faire perdre confiance
-- dans son tableau de bord.
--
-- La limite est posée EN BASE, pas dans l'application : sur Vercel chaque
-- requête peut atterrir sur une instance différente, donc un compteur en
-- mémoire ne protège rien. Postgres est le seul point commun.
--
-- Ne s'applique QU'aux commandes créées par une visiteuse anonyme
-- (auth.uid() is null). Une vendeuse qui saisit ses commandes à la main
-- depuis son tableau de bord n'est jamais bridée.
--
-- Échappatoire pour une restauration ou un import en masse :
--   set local mystorey.skip_order_guard = 'on';
--
-- Idempotent : relançable sans erreur dans le SQL Editor Supabase.
-- =====================================================================

-- Fenêtre et plafonds. Volontairement larges : une vraie boutique ne les
-- atteint pas, un script les atteint en quelques secondes.
--   * 3 commandes par numéro et par boutique sur 10 minutes
--   * 25 commandes par boutique sur 10 minutes (rafale tous numéros confondus)
create or replace function public.enforce_checkout_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_window constant interval := interval '10 minutes';
  v_max_per_phone constant int := 3;
  v_max_per_store constant int := 25;
  v_phone text;
  v_count int;
begin
  -- Commande saisie par la vendeuse connectée : jamais bridée.
  if auth.uid() is not null then return new; end if;
  -- Restauration / import administrateur.
  if coalesce(current_setting('mystorey.skip_order_guard', true), '') = 'on' then return new; end if;

  v_phone := regexp_replace(coalesce(new.customer_phone, ''), '[^0-9]', '', 'g');

  if v_phone <> '' then
    select count(*) into v_count
      from public.orders
     where store_id = new.store_id
       and created_at > now() - v_window
       and regexp_replace(coalesce(customer_phone, ''), '[^0-9]', '', 'g') = v_phone;
    if v_count >= v_max_per_phone then
      raise exception 'checkout_rate_limited';
    end if;
  end if;

  select count(*) into v_count
    from public.orders
   where store_id = new.store_id
     and created_at > now() - v_window;
  if v_count >= v_max_per_store then
    raise exception 'checkout_rate_limited';
  end if;

  return new;
end;
$$;

-- Avant assign_order_number : inutile de consommer un numéro de commande
-- pour une tentative qui va être refusée. Les triggers BEFORE d'une même
-- table s'exécutent par ordre alphabétique de nom, d'où le préfixe.
drop trigger if exists aaa_orders_rate_limit on public.orders;
create trigger aaa_orders_rate_limit
  before insert on public.orders
  for each row execute function public.enforce_checkout_rate_limit();
