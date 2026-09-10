"use server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canAddProduct, getPlanById } from "@/features/subscriptions/types";
import sharp from "sharp";
import { ALLOWED_IMAGE_TYPES, MAX_GALLERY_BYTES, MAX_IMAGE_BYTES, productFormSchema, type ProductActionState } from "./schemas";
const extensionFor = () => "webp";
type StoreClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
async function confirmStoreOwner(supabase: StoreClient, storeId: string) { const { data: { user } } = await supabase.auth.getUser(); if (!user) return false; const { data } = await supabase.from("stores").select("id").eq("id", storeId).eq("owner_id", user.id).limit(1).maybeSingle(); return !!data; }
async function ensureSubscriptionAllowsProductCreation(supabase: StoreClient, storeId: string) {
  const { data: sub } = await supabase.from("seller_subscriptions").select("plan_id,status,payment_status,expires_at").eq("store_id", storeId).maybeSingle();
  const isExpired = sub?.expires_at && new Date(sub.expires_at).getTime() <= Date.now();
  const isPaidPlanActive = !sub || sub.plan_id === "free" || (sub.status === "active" && sub.payment_status === "paid" && !isExpired);
  if (!isPaidPlanActive) return { ok: false as const, message: "Votre abonnement n’est pas actif. Réactivez votre plan pour ajouter des produits." };
  const plan = getPlanById(sub?.plan_id ?? "free");
  const { count, error } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("store_id", storeId);
  if (error) return { ok: false as const, message: "Impossible de vérifier votre limite d’abonnement." };
  if (!canAddProduct(count ?? 0, plan.id)) {
    return { ok: false as const, message: `Vous avez atteint la limite de votre abonnement ${plan.name}. Passez à un plan supérieur pour ajouter davantage de produits.` };
  }
  return { ok: true as const };
}
async function uploadProductImage(supabase: StoreClient, file: File, userId: string, productId: string): Promise<{ ok: true; url: string; path: string } | { ok: false; message: string }> {
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, message: "Image trop lourde (5 Mo maximum)." };
  const allowed = ALLOWED_IMAGE_TYPES as readonly string[];
  if (!allowed.includes(file.type)) return { ok: false, message: "Format d’image non accepté (JPEG, PNG ou WebP)." };
  let optimized: Buffer;
  try {
    optimized = await sharp(Buffer.from(await file.arrayBuffer()), { failOn: "error" })
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return { ok: false, message: "Image illisible ou corrompue." };
  }
  const path = `${userId}/${productId}/${crypto.randomUUID()}.${extensionFor()}`;
  const { error } = await supabase.storage.from("product-images").upload(path, optimized, { contentType: "image/webp" });
  if (error) return { ok: false, message: "Impossible d’enregistrer l’image." };
  const publicUrl = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  if (!publicUrl) return { ok: false, message: "Impossible de générer l’URL publique de l’image." };
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
function parseProduct(formData: FormData) { return productFormSchema.safeParse({ name: formData.get("name"), note: formData.get("note"), description: formData.get("description"), price: formData.get("price"), categoryId: formData.get("categoryId"), isAvailable: formData.get("isAvailable"), isFeatured: formData.get("isFeatured") }); }
function parseRemovedImagePaths(formData: FormData) {
  try {
    const value = JSON.parse(String(formData.get("removedImagePaths") || "[]"));
    return Array.isArray(value) ? value.filter((path): path is string => typeof path === "string" && path.length > 0) : [];
  } catch {
    return [];
  }
}
function storagePathFromPublicUrl(url: string | null) {
  if (!url) return null;
  const marker = "/storage/v1/object/public/product-images/";
  const index = url.indexOf(marker);
  return index >= 0 ? decodeURIComponent(url.slice(index + marker.length)) : null;
}
export async function createProduct(_: ProductActionState, formData: FormData): Promise<ProductActionState> {
  const parsed = parseProduct(formData);
  if (!parsed.success) return { error: "Vérifiez les informations du produit.", fieldErrors: parsed.error.flatten().fieldErrors };
  const storeId = String(formData.get("storeId") || "");
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!storeId || !(await confirmStoreOwner(supabase, storeId))) return { error: "Boutique introuvable." };
  const canCreate = await ensureSubscriptionAllowsProductCreation(supabase, storeId);
  if (!canCreate.ok) return { error: canCreate.message };
  const { data: created, error } = await supabase.from("products").insert({ store_id: storeId, name: parsed.data.name, note: parsed.data.note, description: parsed.data.description, price: parsed.data.price, image_url: null, is_available: parsed.data.isAvailable, is_featured: parsed.data.isFeatured, category_id: parsed.data.categoryId }).select("id").single();
  if (error || !created) return { error: "Impossible de créer le produit. Réessayez." };
  const files = formData.getAll("images").filter((file): file is File => file instanceof File && file.size > 0);
  if (files.reduce((total, file) => total + file.size, 0) > MAX_GALLERY_BYTES) return { error: "La taille totale des photos ne doit pas dépasser 5 Mo." };
  if (files.length) {
    const gallery = await uploadProductGallery(supabase, files, user.id, created.id);
    if (!gallery.ok) { await supabase.from("products").delete().eq("id", created.id); return { error: gallery.message }; }
    const mediaRows = gallery.uploaded.map((item, position) => ({ product_id: created.id, storage_path: item.path, public_url: item.url, position }));
    const { error: mediaError } = await supabase.from("product_media").insert(mediaRows);
    if (mediaError) { await supabase.storage.from("product-images").remove(gallery.uploaded.map((item) => item.path)); await supabase.from("products").delete().eq("id", created.id); return { error: "Impossible d’enregistrer les photos du produit." }; }
    await supabase.from("products").update({ image_url: gallery.uploaded[0].url }).eq("id", created.id);
  }
  redirect("/dashboard/products");
}
export async function updateProduct(_: ProductActionState, formData: FormData): Promise<ProductActionState> {
  const parsed = parseProduct(formData);
  if (!parsed.success) return { error: "Vérifiez les informations du produit.", fieldErrors: parsed.error.flatten().fieldErrors };
  const id = String(formData.get("productId") || "");
  const storeId = String(formData.get("storeId") || "");
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!storeId || !(await confirmStoreOwner(supabase, storeId))) return { error: "Boutique introuvable." };
  const { data: existing } = await supabase.from("products").select("id,image_url").eq("id", id).eq("store_id", storeId).maybeSingle();
  if (!existing) return { error: "Produit introuvable." };
  const requestedRemovedPaths = parseRemovedImagePaths(formData);
  const removeLegacyImage = formData.get("removeLegacyImage") === "true";
  const { data: removableMedia } = requestedRemovedPaths.length ? await supabase.from("product_media").select("storage_path").eq("product_id", id).in("storage_path", requestedRemovedPaths) : { data: [] as { storage_path: string }[] };
  const removablePaths = (removableMedia ?? []).map((item) => item.storage_path);
  const files = formData.getAll("images").filter((file): file is File => file instanceof File && file.size > 0);
  if (files.reduce((total, file) => total + file.size, 0) > MAX_GALLERY_BYTES) return { error: "La taille totale des photos ne doit pas dépasser 5 Mo." };
  if (files.length) {
    const gallery = await uploadProductGallery(supabase, files, user.id, id);
    if (!gallery.ok) return { error: gallery.message };
    const { data: lastMedia } = await supabase.from("product_media").select("position").eq("product_id", id).order("position", { ascending: false }).limit(1).maybeSingle();
    const start = (lastMedia?.position ?? -1) + 1;
    const mediaRows = gallery.uploaded.map((item, offset) => ({ product_id: id, storage_path: item.path, public_url: item.url, position: start + offset }));
    const { error: mediaError } = await supabase.from("product_media").insert(mediaRows);
    if (mediaError) { await supabase.storage.from("product-images").remove(gallery.uploaded.map((item) => item.path)); return { error: "Impossible d’enregistrer les photos du produit." }; }
    if (!parsed.data.name) return { error: "Nom du produit requis." };
    const imageUrl: string | null | undefined = gallery.uploaded[0].url;
    const payload: Partial<Record<string, unknown>> = { name: parsed.data.name, note: parsed.data.note, description: parsed.data.description, price: parsed.data.price, is_available: parsed.data.isAvailable, is_featured: parsed.data.isFeatured, category_id: parsed.data.categoryId, image_url: imageUrl };
    const { error } = await supabase.from("products").update(payload).eq("id", id);
    if (error) { await supabase.from("product_media").delete().in("storage_path", gallery.uploaded.map((item) => item.path)); await supabase.storage.from("product-images").remove(gallery.uploaded.map((item) => item.path)); return { error: "Impossible d’enregistrer le produit. Réessayez." }; }
    if (removablePaths.length) { await supabase.from("product_media").delete().eq("product_id", id).in("storage_path", removablePaths); await supabase.storage.from("product-images").remove(removablePaths); }
    redirect("/dashboard/products");
  }
  const { data: allMedia } = removablePaths.length ? await supabase.from("product_media").select("public_url,storage_path").eq("product_id", id).order("position") : { data: [] as { public_url: string; storage_path: string }[] };
  const remainingMedia = (allMedia ?? []).filter((item) => !removablePaths.includes(item.storage_path)).slice(0, 1);
  const payload: Partial<Record<string, unknown>> = { name: parsed.data.name, note: parsed.data.note, description: parsed.data.description, price: parsed.data.price, is_available: parsed.data.isAvailable, is_featured: parsed.data.isFeatured, category_id: parsed.data.categoryId, ...(removablePaths.length || removeLegacyImage ? { image_url: remainingMedia?.[0]?.public_url ?? null } : {}) };
  const { error } = await supabase.from("products").update(payload).eq("id", id);
  if (error) return { error: "Impossible d’enregistrer le produit. Réessayez." };
  if (removablePaths.length) { await supabase.from("product_media").delete().eq("product_id", id).in("storage_path", removablePaths); await supabase.storage.from("product-images").remove(removablePaths); }
  if (removeLegacyImage && existing.image_url) { const legacyPath = storagePathFromPublicUrl(existing.image_url); if (legacyPath) await supabase.storage.from("product-images").remove([legacyPath]); }
  redirect("/dashboard/products");
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
  redirect("/dashboard/products");
}