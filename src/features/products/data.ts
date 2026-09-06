import { getMyFirstStore } from "@/features/stores/data";
export type ProductWithFlags = { id: string; name: string; note: string | null; description: string | null; price: number; image_url: string | null; is_available: boolean; is_featured: boolean; category_id: string | null; created_at: string };
export async function getProducts() {
  const { store, user, supabase } = await getMyFirstStore();
  if (!store) return null;
  const { data, error } = await supabase.from("products").select("id,name,note,description,price,image_url,is_available,is_featured,category_id,created_at").eq("store_id", store.id).order("created_at", { ascending: false });
  if (error) throw new Error("Impossible de charger le catalogue.");
  return { store, user, supabase, products: (data ?? []) as ProductWithFlags[] };
}
export async function getSingleProduct(id: string) {
  const result = await getMyFirstStore();
  if (!result.store) return { ...result, product: null };
  const { data, error } = await result.supabase.from("products").select("id,name,note,description,price,image_url,is_available,is_featured,category_id").eq("id", id).eq("store_id", result.store.id).maybeSingle();
  if (error) throw new Error("Impossible de charger le produit.");
  return { ...result, product: data };
}