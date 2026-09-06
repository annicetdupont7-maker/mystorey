import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
let cached: SupabaseClient | null = null;
export function createSupabaseServiceClient() {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Configuration Supabase incomplète pour les opérations serveur.");
  cached = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }) as SupabaseClient;
  return cached;
}