"use server";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/features/products/schemas";
import { productStockSchema, variantSchema, type VariantActionState } from "./schemas";

type StoreClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * Every action re-checks that the product belongs to a store the caller owns. RLS
 * already enforces it, but the check here turns a silent no-op into a clear message
 * and keeps the ownership rule readable next to the code that relies on it.
 */
async function ownedProduct(supabase: StoreClient, productId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("products")
    .select("id,store_id,stores!inner(owner_id)")
    .eq("id", productId)
    .eq("stores.owner_id", user.id)
    .maybeSingle();
  return data ? { userId: user.id, productId } : null;
}

async function uploadVariantImage(supabase: StoreClient, file: File, userId: string, productId: string) {
  if (file.size > MAX_IMAGE_BYTES) return { ok: false as const, message: "Image trop lourde (5 Mo maximum)." };
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) return { ok: false as const, message: "Format d’image non accepté (JPEG, PNG ou WebP)." };
  let optimized: Buffer;
  try {
    optimized = await sharp(Buffer.from(await file.arrayBuffer()), { failOn: "error" })
      .rotate()
      .resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return { ok: false as const, message: "Image illisible ou corrompue." };
  }
  const path = `${userId}/${productId}/variant-${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from("product-images").upload(path, optimized, { contentType: "image/webp" });
  if (error) return { ok: false as const, message: "Impossible d’enregistrer l’image." };
  return { ok: true as const, url: supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl };
}

function variantPathFromPublicUrl(url: string | null) {
  if (!url) return null;
  const marker = "/storage/v1/object/public/product-images/";
  const index = url.indexOf(marker);
  return index >= 0 ? decodeURIComponent(url.slice(index + marker.length)) : null;
}

const MIGRATION_HINT = "Les variantes ne sont pas encore activées sur votre base. Exécutez la migration « 20260912_product_variants » dans le SQL Editor Supabase.";

export async function addVariant(_: VariantActionState, formData: FormData): Promise<VariantActionState> {
  const parsed = variantSchema.safeParse({
    productId: String(formData.get("productId") ?? ""),
    optionGroup: String(formData.get("optionGroup") ?? "Couleur"),
    label: String(formData.get("label") ?? ""),
    price: String(formData.get("price") ?? ""),
    stock: String(formData.get("stock") ?? ""),
  });
  if (!parsed.success) return { error: "Vérifiez cette option.", fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createSupabaseServerClient();
  const owner = await ownedProduct(supabase, parsed.data.productId);
  if (!owner) return { error: "Produit introuvable." };

  let imageUrl: string | null = null;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    const uploaded = await uploadVariantImage(supabase, file, owner.userId, parsed.data.productId);
    if (!uploaded.ok) return { error: uploaded.message };
    imageUrl = uploaded.url;
  }

  const { data: last } = await supabase
    .from("product_variants")
    .select("position")
    .eq("product_id", parsed.data.productId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("product_variants").insert({
    product_id: parsed.data.productId,
    option_group: parsed.data.optionGroup,
    label: parsed.data.label,
    price: parsed.data.price,
    stock: parsed.data.stock,
    image_url: imageUrl,
    position: ((last as { position?: number } | null)?.position ?? -1) + 1,
  });

  if (error) {
    if (error.code === "23505") return { error: `« ${parsed.data.label} » existe déjà pour ce produit.` };
    if (error.code === "42P01") return { error: MIGRATION_HINT };
    return { error: "Impossible d’ajouter cette option." };
  }

  revalidatePath(`/dashboard/products/${parsed.data.productId}`);
  return { success: `« ${parsed.data.label} » ajouté.` };
}

export async function deleteVariant(formData: FormData): Promise<void> {
  const variantId = String(formData.get("variantId") ?? "");
  const productId = String(formData.get("productId") ?? "");
  if (!variantId || !productId) return;

  const supabase = await createSupabaseServerClient();
  if (!(await ownedProduct(supabase, productId))) return;

  const { data: variant } = await supabase.from("product_variants").select("image_url").eq("id", variantId).eq("product_id", productId).maybeSingle();
  const { error } = await supabase.from("product_variants").delete().eq("id", variantId).eq("product_id", productId);
  if (error) return;

  // Only remove the file once the row is gone, so a failed delete never orphans a photo.
  const path = variantPathFromPublicUrl((variant as { image_url?: string | null } | null)?.image_url ?? null);
  if (path) await supabase.storage.from("product-images").remove([path]);

  revalidatePath(`/dashboard/products/${productId}`);
}

/**
 * Product-level stock lives here rather than in the main product form on purpose: the
 * `stock` column arrives with the same migration as the variants, and slipping it into
 * the product insert would break product creation on a database without it.
 */
export async function setProductStock(_: VariantActionState, formData: FormData): Promise<VariantActionState> {
  const productId = String(formData.get("productId") ?? "");
  const parsed = productStockSchema.safeParse(String(formData.get("stock") ?? ""));
  if (!parsed.success) return { error: "Stock invalide : entrez un nombre entier, ou laissez vide." };

  const supabase = await createSupabaseServerClient();
  if (!(await ownedProduct(supabase, productId))) return { error: "Produit introuvable." };

  const { error } = await supabase.from("products").update({ stock: parsed.data }).eq("id", productId);
  if (error) return { error: error.code === "42703" ? MIGRATION_HINT : "Impossible d’enregistrer le stock." };

  revalidatePath(`/dashboard/products/${productId}`);
  return { success: parsed.data === null ? "Stock non suivi pour ce produit." : `Stock enregistré : ${parsed.data}.` };
}

export async function toggleVariant(formData: FormData): Promise<void> {
  const variantId = String(formData.get("variantId") ?? "");
  const productId = String(formData.get("productId") ?? "");
  const nextActive = formData.get("nextActive") === "true";
  if (!variantId || !productId) return;

  const supabase = await createSupabaseServerClient();
  if (!(await ownedProduct(supabase, productId))) return;

  await supabase.from("product_variants").update({ is_active: nextActive }).eq("id", variantId).eq("product_id", productId);
  revalidatePath(`/dashboard/products/${productId}`);
}
