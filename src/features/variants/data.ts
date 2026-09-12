import type { SupabaseClient } from "@supabase/supabase-js";
import { toVariant, type ProductVariant, type VariantRow } from "./types";

const COLUMNS = "id,option_group,label,price,stock,image_url,position,is_active";

/**
 * Variants live behind the 20260912_product_variants migration. Until it is applied,
 * the query fails and every caller must keep working exactly as before — a storefront
 * must never 500 because an optional table is missing. So a failed read means
 * "this product has no variants", never an exception.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, any, any>;

export async function getVariantsForProduct(supabase: AnyClient, productId: string): Promise<ProductVariant[]> {
  const { data, error } = await supabase.from("product_variants").select(COLUMNS).eq("product_id", productId).order("position");
  if (error || !data) return [];
  return (data as VariantRow[]).map(toVariant);
}

export async function getVariantsForProducts(supabase: AnyClient, productIds: string[]): Promise<Map<string, ProductVariant[]>> {
  const byProduct = new Map<string, ProductVariant[]>();
  if (productIds.length === 0) return byProduct;
  const { data, error } = await supabase
    .from("product_variants")
    .select(`product_id,${COLUMNS}`)
    .in("product_id", productIds)
    .order("position");
  if (error || !data) return byProduct;
  for (const row of data as (VariantRow & { product_id: string })[]) {
    const list = byProduct.get(row.product_id) ?? [];
    list.push(toVariant(row));
    byProduct.set(row.product_id, list);
  }
  return byProduct;
}

/** True when the variants table is reachable, so the seller UI can be shown. */
export async function variantsAreAvailable(supabase: AnyClient): Promise<boolean> {
  const { error } = await supabase.from("product_variants").select("id", { count: "exact", head: true }).limit(1);
  return !error;
}
