import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveStoreTheme, themeCssVariables } from "@/features/themes/resolve-theme";
import { StoreProductPage } from "@/features/storefront/components";
import { toProductView } from "@/features/storefront/storefront-types";
export const dynamic = "force-dynamic";
export default async function PublicStoreProductPage({ params }: { params: Promise<{ slug: string; productId: string }> }) {
  const { slug, productId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase.from("stores").select("id,name,slug,status,whatsapp,logo_url").eq("slug", slug).maybeSingle();
  if (!store || store.status !== "published") notFound();
  const { data: product } = await supabase.from("products").select("id,name,note,description,price,image_url,is_available,is_featured,product_media(id,public_url,position)").eq("id", productId).eq("store_id", store.id).eq("is_available", true).maybeSingle();
  if (!product) notFound();
  const { data: theme } = await supabase.from("store_themes").select("preset_id,overrides,layout,version").eq("store_id", store.id).maybeSingle();
  const { tokens } = resolveStoreTheme(theme ?? { preset_id: "modern", version: 1 });
  return <div style={themeCssVariables(tokens)}><StoreProductPage product={toProductView(product)} storeName={store.name} logoUrl={store.logo_url} whatsapp={store.whatsapp ?? ""} slug={store.slug} /></div>;
}