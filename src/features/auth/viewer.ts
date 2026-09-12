import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Is the signed-in viewer an administrator? Cached per request so the dashboard
 * layout can ask without adding a query to every page that renders inside it.
 *
 * Read-only and advisory: it decides whether to *show* the back-office entry.
 * Access itself stays enforced by requireAdmin() on the /admin routes, so a
 * seller who guesses the URL is still turned away.
 */
export const viewerIsAdmin = cache(async (): Promise<boolean> => {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("profiles").select("role").eq("user_id", user.id).maybeSingle();
  return data?.role === "admin";
});
