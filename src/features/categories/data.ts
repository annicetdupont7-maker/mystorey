import { createSupabaseServerClient } from "@/lib/supabase/server";
export type CategoryRef = { id: string; name: string };
export async function getStoreCategories(storeId: string): Promise<CategoryRef[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("categories").select("id,name").eq("store_id", storeId).order("name");
  if (error) throw new Error("Impossible de charger les catégories.");
  return (data ?? []) as CategoryRef[];
}