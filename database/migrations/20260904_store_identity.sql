-- =====================================================================
-- VendoFlow — Identité de la boutique (Mission Identité)
-- Logo, slogan, présentation, image de couverture.
-- Idempotent : relançable sans erreur dans le Supabase SQL Editor.
-- Aucune suppression de données. RLS jamais désactivée.
-- =====================================================================

-- 1. Slogan de la boutique (optionnel, court)
alter table public.stores add column if not exists slogan text;

-- 2. Bucket Storage pour les images de boutique (logo + couverture)
--    Chaque vendeuse dépose ses fichiers sous {user_id}/…
insert into storage.buckets (id, name, public) values ('store-images', 'store-images', true)
on conflict (id) do nothing;

drop policy if exists "public reads store images" on storage.objects;
create policy "public reads store images" on storage.objects
  for select to public using (bucket_id = 'store-images');

drop policy if exists "owner uploads store images" on storage.objects;
create policy "owner uploads store images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'store-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "owner updates store images" on storage.objects;
create policy "owner updates store images" on storage.objects
  for update to authenticated
  using (bucket_id = 'store-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'store-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "owner deletes store images" on storage.objects;
create policy "owner deletes store images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'store-images' and (storage.foldername(name))[1] = auth.uid()::text);
