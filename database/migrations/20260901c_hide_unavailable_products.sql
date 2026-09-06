-- VendoFlow — DURCISSEMENT OPTIONNEL : ne pas exposer en API les produits indisponibles.
-- Constat audit : la vitrine filtre deja is_available = true en serveur (comportement UI correct).
-- Mais l'API brute (cle anon/publishable) expose les produites disponibles=false des boutiques publiees.
-- Ce script ajoute `is_available` a la politique RLS de lecture publique : idempotent.
drop policy if exists "public reads published products" on public.products;
create policy "public reads published products" on public.products
  for select to anon, authenticated
  using (
    is_available
    and exists (
      select 1 from public.stores s
      where s.id = store_id and s.status = 'published'
    )
  );