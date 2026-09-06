-- Révocation partielle : les politiques RLS "public reads published ..." existent
-- pour le rôle anon, mais `revoke all ... from anon` de 20260828_full_schema.sql
-- a supprimé les privilèges de table. Sans ce GRANT, tout lecteur anonyme reçoit
-- "permission denied for table stores" -> vitrine publique en 404.
-- Idempotent : relançable sans erreur dans le SQL Editor Supabase.
grant select on public.stores to anon;
grant select on public.store_themes to anon;
grant select on public.products to anon;