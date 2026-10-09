-- Suppression de compte par la vendeuse : garder la comptabilité, perdre l'identité.
-- Idempotent : relançable dans le SQL Editor Supabase.

-- Tout est chaîné en cascade sur `auth.users` : supprimer un compte supprime ses
-- boutiques, et supprimer une boutique supprime ses commandes. Détruire une vendeuse
-- effaçait donc la trace de ses ventes, dont MYSTOREY a besoin pour sa comptabilité.
--
-- Cette table garde le montant, la date et ce qui a été vendu. Elle ne garde ni le nom,
-- ni le téléphone, ni la note de la cliente : ces données appartiennent à une personne
-- qui n'a pas demandé à figurer dans une archive. Le nom de la boutique reste, lui,
-- parce que c'est une raison commerciale et non l'identité d'une consommatrice.
--
-- Pas de clé étrangère vers `stores` ni vers `auth.users` : les deux lignes ont déjà
-- disparu au moment où celle-ci est écrite. C'est voulu, ce n'est pas un oubli.
create table if not exists public.archived_orders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  store_id uuid not null,
  store_name text not null default '',
  store_slug text not null default '',
  items jsonb not null default '[]'::jsonb,
  total integer not null default 0 check (total >= 0),
  status text not null default '',
  ordered_at timestamptz not null,
  archived_at timestamptz not null default now(),
  reason text not null default 'account_deleted'
);

-- L'archivage se rejoue sans créer de doublon si la suppression échoue à mi-chemin.
create unique index if not exists archived_orders_order_id_key on public.archived_orders(order_id);
create index if not exists archived_orders_store_idx on public.archived_orders(store_id);
create index if not exists archived_orders_archived_idx on public.archived_orders(archived_at desc);

-- Le serveur écrit avec la clé de service, qui ignore RLS. Depuis un navigateur, seule
-- une administratrice peut lire : une vendeuse n'a rien à voir dans les ventes des autres.
alter table public.archived_orders enable row level security;
revoke all on public.archived_orders from anon, authenticated;
grant select on public.archived_orders to authenticated;
drop policy if exists "admins read archived orders" on public.archived_orders;
create policy "admins read archived orders" on public.archived_orders
  for select to authenticated using (public.is_admin());
