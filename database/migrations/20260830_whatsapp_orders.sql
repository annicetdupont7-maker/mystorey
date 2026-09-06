-- Mission 4 : commandes WhatsApp
-- Numéro WhatsApp du vendeur, reçoit les commandes des clients.
-- Idempotent : relançable sans erreur dans le SQL Editor Supabase.
alter table public.stores add column if not exists whatsapp text;