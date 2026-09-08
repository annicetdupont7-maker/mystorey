import { getMyFirstStore } from "@/features/stores/data";
export type ProductMedia = { id: string; public_url: string; position: number };
export type ProductWithFlags = { id: string; name: string; note: string | null; description: string | null; price: number; image_url: string | null; is_available: boolean; is_featured: boolean; category_id: string | null; created_at: string; media?: ProductMedia[] };
export async function getProducts() {
  const { store, user, supabase } = await getMyFirstStore();
  if (!store) return null;
  const { data, error } = await supabase.from("products").select("id,name,note,description,price,image_url,is_available,is_featured,category_id,created_at").eq("store_id", store.id).order("created_at", { ascending: false });
  if (error) throw new Error("Impossible de charger le catalogue.");
  const products = (data ?? []) as ProductWithFlags[];
  const { data: media } = await supabase.from("product_media").select("id,product_id,public_url,position").in("product_id", products.map((product) => product.id)).order("position");
  const mediaByProduct = new Map<string, ProductMedia[]>();
  for (const item of media ?? []) { const list = mediaByProduct.get(item.product_id) ?? []; list.push({ id: item.id, public_url: item.public_url, position: item.position }); mediaByProduct.set(item.product_id, list); }
  return { store, user, supabase, products: products.map((product) => ({ ...product, media: mediaByProduct.get(product.id) ?? [] })) };
}
export async function getSingleProduct(id: string) {
  const result = await getMyFirstStore();
  if (!result.store) return { ...result, product: null };
  const { data, error } = await result.supabase.from("products").select("id,name,note,description,price,image_url,is_available,is_featured,category_id").eq("id", id).eq("store_id", result.store.id).maybeSingle();
  if (error) throw new Error("Impossible de charger le produit.");
  const { data: media } = await result.supabase.from("product_media").select("id,public_url,position").eq("product_id", id).order("position");
  return { ...result, product: data ? { ...data, product_media: media ?? [] } : data };
}