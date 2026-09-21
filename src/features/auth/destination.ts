import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export type Destination = "/admin" | "/dashboard" | "/onboarding";

/**
 * Where a signed-in person belongs. The owner of MYSTOREY lands on the back-office
 * directly instead of having to find it from the seller space; a seller with a shop
 * lands on her dashboard; anyone else is walked through creating one.
 *
 * The role is read from the database on the server, never from anything the browser
 * sends, and /admin re-checks it on every request anyway.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function destinationFor(supabase: SupabaseClient<any, any, any>, user: Pick<User, "id">): Promise<Destination> {
  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from("profiles").select("role").eq("user_id", user.id).maybeSingle(),
    supabase.from("stores").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
  ]);
  if (profile?.role === "admin") return "/admin";
  return count ? "/dashboard" : "/onboarding";
}
