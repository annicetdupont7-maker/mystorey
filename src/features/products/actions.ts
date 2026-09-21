"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canAddProduct, getPlanById } from "@/features/subscriptions/types";
import sharp from "sharp";
import { ALLOWED_IMAGE_TYPES, MAX_GALLERY_BYTES, MAX_IMAGE_BYTES, parsePhotoOrder, productFormSchema, stockFieldSchema, type PhotoToken, type ProductActionState } from "./schemas";
import { MAX_PHOTOS } from "./image-compress";
type StoreClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
async function confirmStoreOwner(supabase: StoreClient, storeId: string) { const { data: { user } } = await supabase.auth.getUser(); if (!user) return false; const { data } = await supabase.from("stores").select("id").eq("id", storeId).eq("owner_id", user.id).limit(1).maybeSingle(); return !!data; }
async function ensureSubscriptionAllowsProductCreation(supabase: StoreClient, storeId: string) {
  // Until the subscriptions table exists the read fails and the shop is on the free plan.
  const { data: sub } = await supabase.from("seller_subscriptions").select("plan_id,status,payment_status,expires_at").eq("store_id", storeId).maybeSingle();
  const isExpired = sub?.expires_at && new Date(sub.expires_at).getTime() <= Date.now();
  const paidActive = sub && sub.plan_id !== "free" && sub.status === "active" && sub.payment_status === "paid" && !isExpired;
  // A lapsed paid plan falls back to the free limit instead of blocking the seller outright.
  const plan = getPlanById(paidActive ? sub.plan_id : "free");
  const { count, error } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("store_id", storeId);
  if (error) return { ok: false as const, message: "Impossible de vérifier votre limite d’abonnement." };
  if (!canAddProduct(count ?? 0, plan.id)) {
    return { ok: false as const, message: `Vous avez atteint la limite de ${plan.productLimit} produits du plan ${plan.name}. Supprimez ou remplacez un produit pour en ajouter un nouveau.` };
  }
  return { ok: true as const };
}
async function uploadProductImage(supabase: StoreClient, file: File, userId: string, productId: string): Promise<{ ok: true; url: string; path: string } | { ok: false; message: string }> {
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, message: "Photo trop lourde (5 Mo maximum)." };
  const allowed = ALLOWED_IMAGE_TYPES as readonly string[];
  if (!allowed.includes(file.type)) return { ok: false, message: "Format de photo non accepté (JPEG, PNG ou WebP)." };
  let optimized: Buffer;
  try {
    optimized = await sharp(Buffer.from(await file.arrayBuffer()), { failOn: "error" })
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return { ok: false, message: "Une photo est illisible ou abîmée. Choisissez-en une autre." };
  }
  const path = `${userId}/${productId}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from("product-images").upload(path, optimized, { contentType: "image/webp" });
  if (error) return { ok: false, message: "Impossible d’enregistrer la photo. Vérifiez votre connexion et réessayez." };
  const publicUrl = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  if (!publicUrl) return { ok: false, message: "Impossible de générer l’adresse de la photo." };
  return { ok: true, url: publicUrl, path };
}
async function uploadProductGallery(supabase: StoreClient, files: File[], userId: string, productId: string) {
  const uploaded: { url: string; path: string }[] = [];
  for (const file of files) {
    const result = await uploadProductImage(supabase, file, userId, productId);
    if (!result.ok) {
      if (uploaded.length) await supabase.storage.from("product-images").remove(uploaded.map((item) => item.path));
      return result;
    }
    uploaded.push(result);
  }
  return { ok: true as const, uploaded };
}
function parseProduct(formData: FormData) { return productFormSchema.safeParse({ name: formData.get("name"), note: formData.get("note") ?? "", description: formData.get("description") ?? "", price: String(formData.get("price") ?? ""), categoryId: formData.get("categoryId") ?? "", isAvailable: formData.get("isAvailable"), isFeatured: formData.get("isFeatured") }); }
function storagePathFromPublicUrl(url: string | null) {
  if (!url) return null;
  const marker = "/storage/v1/object/public/product-images/";
  const index = url.indexOf(marker);
  return index >= 0 ? decodeURIComponent(url.slice(index + marker.length)) : null;
}
function readFiles(formData: FormData) {
  return formData.getAll("images").filter((file): file is File => file instanceof File && file.size > 0);
}
/**
 * Stock lives in a column added by the variants migration. It is written separately so
 * that product creation keeps working on a database that does not have it yet.
 */
async function saveStock(supabase: StoreClient, productId: string, formData: FormData): Promise<string | null> {
  if (!formData.has("stock")) return null;
  const parsed = stockFieldSchema.safeParse(String(formData.get("stock") ?? ""));
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Stock invalide.";
  const { error } = await supabase.from("products").update({ stock: parsed.data }).eq("id", productId);
  if (error && error.code !== "42703" && error.code !== "PGRST204") return "Le produit est enregistré, mais pas le stock. Réessayez depuis sa fiche.";
  return null;
}
function validateGallery(files: File[], keptCount: number): string | null {
  if (files.reduce((total, file) => total + file.size, 0) > MAX_GALLERY_BYTES) return "Les photos sont trop lourdes ensemble. Ajoutez-les en deux fois.";
  if (files.length + keptCount > MAX_PHOTOS) return `${MAX_PHOTOS} photos maximum par produit.`;
  return null;
}

export async function createProduct(_: ProductActionState, formData: FormData): Promise<ProductActionState> {
  const parsed = parseProduct(formData);
  if (!parsed.success) return { error: "Il manque une information : vérifiez les champs en rouge.", fieldErrors: parsed.error.flatten().fieldErrors };
  const stockCheck = stockFieldSchema.safeParse(String(formData.get("stock") ?? ""));
  if (!stockCheck.success) return { error: "Vérifiez le stock.", fieldErrors: { stock: [stockCheck.error.issues[0]?.message ?? "Stock invalide."] } };
  const storeId = String(formData.get("storeId") || "");
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!storeId || !(await confirmStoreOwner(supabase, storeId))) return { error: "Boutique introuvable." };
  const files = readFiles(formData);
  const galleryError = validateGallery(files, 0);
  if (galleryError) return { error: galleryError };
  const canCreate = await ensureSubscriptionAllowsProductCreation(supabase, storeId);
  if (!canCreate.ok) return { error: canCreate.message };
  const { data: created, error } = await supabase.from("products").insert({ store_id: storeId, name: parsed.data.name, note: parsed.data.note, description: parsed.data.description, price: parsed.data.price, image_url: null, is_available: parsed.data.isAvailable, is_featured: parsed.data.isFeatured, category_id: parsed.data.categoryId }).select("id").single();
  if (error || !created) {
    if (error?.message?.includes("product_limit_reached")) return { error: "Vous avez atteint la limite de produits de votre plan. Supprimez ou remplacez un produit pour en ajouter un nouveau." };
    return { error: "Impossible de créer le produit. Réessayez." };
  }
  // New files arrive in the order the seller arranged them; the first one is the cover.
  if (files.length) {
    const gallery = await uploadProductGallery(supabase, files, user.id, created.id);
    if (!gallery.ok) { await supabase.from("products").delete().eq("id", created.id); return { error: gallery.message }; }
    const mediaRows = gallery.uploaded.map((item, position) => ({ product_id: created.id, storage_path: item.path, public_url: item.url, position }));
    const { error: mediaError } = await supabase.from("product_media").insert(mediaRows);
    if (mediaError) { await supabase.storage.from("product-images").remove(gallery.uploaded.map((item) => item.path)); await supabase.from("products").delete().eq("id", created.id); return { error: "Impossible d’enregistrer les photos du produit." }; }
    await supabase.from("products").update({ image_url: gallery.uploaded[0].url }).eq("id", created.id);
  }
  await saveStock(supabase, created.id, formData);
  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/products?added=${created.id}`);
}

export async function updateProduct(_: ProductActionState, formData: FormData): Promise<ProductActionState> {
  const parsed = parseProduct(formData);
  if (!parsed.success) return { error: "Il manque une information : vérifiez les champs en rouge.", fieldErrors: parsed.error.flatten().fieldErrors };
  const stockCheck = stockFieldSchema.safeParse(String(formData.get("stock") ?? ""));
  if (!stockCheck.success) return { error: "Vérifiez le stock.", fieldErrors: { stock: [stockCheck.error.issues[0]?.message ?? "Stock invalide."] } };
  const id = String(formData.get("productId") || "");
  const storeId = String(formData.get("storeId") || "");
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!storeId || !(await confirmStoreOwner(supabase, storeId))) return { error: "Boutique introuvable." };
  const { data: existing } = await supabase.from("products").select("id,image_url").eq("id", id).eq("store_id", storeId).maybeSingle();
  if (!existing) return { error: "Produit introuvable." };

  const { data: mediaRows } = await supabase.from("product_media").select("id,storage_path,public_url,position").eq("product_id", id).order("position");
  const media = mediaRows ?? [];
  const hasLegacy = !media.length && Boolean(existing.image_url);
  // Without an explicit order (older client), keep every photo and append the new ones.
  const files = readFiles(formData);
  const order: PhotoToken[] = parsePhotoOrder(formData.get("photoOrder")) ?? [
    ...media.map((item) => ({ kind: "existing" as const, path: item.storage_path })),
    ...(hasLegacy ? [{ kind: "legacy" as const }] : []),
    ...files.map((_, index) => ({ kind: "new" as const, index })),
  ];
  const mediaByPath = new Map(media.map((item) => [item.storage_path, item]));
  const keptExisting = order.filter((token): token is { kind: "existing"; path: string } => token.kind === "existing" && mediaByPath.has(token.path));
  const keepLegacy = hasLegacy && order.some((token) => token.kind === "legacy");
  const galleryError = validateGallery(files, keptExisting.length + (keepLegacy ? 1 : 0));
  if (galleryError) return { error: galleryError };

  let uploaded: { url: string; path: string }[] = [];
  if (files.length) {
    const gallery = await uploadProductGallery(supabase, files, user.id, id);
    if (!gallery.ok) return { error: gallery.message };
    uploaded = gallery.uploaded;
  }

  // Final gallery, in the seller's order. Unknown or duplicate tokens are dropped.
  type Slot = { path: string; url: string; source: "existing" | "legacy" | "new"; mediaId?: string };
  const final: Slot[] = [];
  const seen = new Set<string>();
  for (const token of order) {
    let slot: Slot | null = null;
    if (token.kind === "existing") { const item = mediaByPath.get(token.path); if (item) slot = { path: item.storage_path, url: item.public_url, source: "existing", mediaId: item.id }; }
    else if (token.kind === "legacy" && keepLegacy && existing.image_url) slot = { path: storagePathFromPublicUrl(existing.image_url) ?? "", url: existing.image_url, source: "legacy" };
    else if (token.kind === "new" && uploaded[token.index]) slot = { ...uploaded[token.index], source: "new" };
    if (slot && !seen.has(slot.url)) { seen.add(slot.url); final.push(slot); }
  }
  // Uploaded files the order forgot are still kept (never lose a photo the seller sent).
  for (const item of uploaded) if (!seen.has(item.url)) { seen.add(item.url); final.push({ ...item, source: "new" }); }

  // New rows (uploaded files, and the legacy image once the gallery takes over).
  const inserts = final.map((slot, position) => ({ slot, position })).filter(({ slot }) => slot.source === "new" || (slot.source === "legacy" && final.length > 1))
    .map(({ slot, position }) => ({ product_id: id, storage_path: slot.path, public_url: slot.url, position }));
  if (inserts.length) {
    const { error: mediaError } = await supabase.from("product_media").insert(inserts);
    if (mediaError) {
      if (uploaded.length) await supabase.storage.from("product-images").remove(uploaded.map((item) => item.path));
      return { error: "Impossible d’enregistrer les photos du produit." };
    }
  }
  const { error } = await supabase.from("products").update({ name: parsed.data.name, note: parsed.data.note, description: parsed.data.description, price: parsed.data.price, is_available: parsed.data.isAvailable, is_featured: parsed.data.isFeatured, category_id: parsed.data.categoryId, image_url: final[0]?.url ?? null }).eq("id", id).eq("store_id", storeId);
  if (error) {
    if (uploaded.length) {
      await supabase.from("product_media").delete().eq("product_id", id).in("storage_path", uploaded.map((item) => item.path));
      await supabase.storage.from("product-images").remove(uploaded.map((item) => item.path));
    }
    return { error: "Impossible d’enregistrer le produit. Réessayez." };
  }
  // Reposition kept photos, then remove the ones the seller took out.
  await Promise.all(final.map((slot, position) => slot.mediaId && mediaByPath.get(slot.path)?.position !== position
    ? supabase.from("product_media").update({ position }).eq("id", slot.mediaId).eq("product_id", id)
    : null));
  const removed = media.filter((item) => !keptExisting.some((token) => token.path === item.storage_path)).map((item) => item.storage_path);
  if (removed.length) {
    await supabase.from("product_media").delete().eq("product_id", id).in("storage_path", removed);
    const files = removed.filter((path) => path.length > 0);
    if (files.length) await supabase.storage.from("product-images").remove(files);
  }
  if (hasLegacy && !keepLegacy) { const legacyPath = storagePathFromPublicUrl(existing.image_url); if (legacyPath) await supabase.storage.from("product-images").remove([legacyPath]); }
  const stockError = await saveStock(supabase, id, formData);
  if (stockError) return { error: stockError };
  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/products?saved=${id}`);
}

export async function deleteProduct(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const id = String(formData.get("id") || "");
  const { data: product } = await supabase.from("products").select("id,store_id,image_url").eq("id", id).maybeSingle();
  if (product && await confirmStoreOwner(supabase, product.store_id)) {
    const { data: media } = await supabase.from("product_media").select("storage_path").eq("product_id", id);
    const { error } = await supabase.from("products").delete().eq("id", id).eq("store_id", product.store_id);
    const paths = [...(media ?? []).map((item) => item.storage_path), storagePathFromPublicUrl(product.image_url)].filter((path): path is string => !!path);
    if (!error && paths.length) await supabase.storage.from("product-images").remove(paths);
  }
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/products");
}

/** Publish or hide a product in one tap from the catalogue. */
export async function toggleProductAvailability(formData: FormData): Promise<void> {
  const id = String(formData.get("id") || "");
  const next = formData.get("next") === "true";
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: product } = await supabase.from("products").select("id,store_id").eq("id", id).maybeSingle();
  if (!product || !(await confirmStoreOwner(supabase, product.store_id))) return;
  await supabase.from("products").update({ is_available: next }).eq("id", id).eq("store_id", product.store_id);
  revalidatePath("/dashboard", "layout");
}
