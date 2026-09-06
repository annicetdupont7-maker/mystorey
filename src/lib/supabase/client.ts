import { createClient } from "@supabase/supabase-js";
/** This browser factory intentionally accepts only public Supabase credentials. */
export function createSupabaseBrowserClient() { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; if (!url || !key) throw new Error("Variables Supabase publiques manquantes."); return createClient(url, key); }
