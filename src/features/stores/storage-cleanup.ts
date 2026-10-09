import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { selectAll } from "@/lib/supabase/paginate";

const PRODUCT_BUCKET = "product-images";
const STORE_BUCKET = "store-images";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, any, any>;
export type StoreMedia = { productPaths: string[]; storePaths: string[] };

function pathFromPublicUrl(url: string | null | undefined, bucket: string) {
  const marker = `/storage/v1/object/public/${bucket}/`;
  if (!url) return null;
  const index = url.indexOf(marker);
  return index >= 0 ? decodeURIComponent(url.slice(index + marker.length)) : null;
}
const kept = (path: string | null): path is string => !!path;
export const storeImagePathFromPublicUrl = (url: string | null) => pathFromPublicUrl(url, STORE_BUCKET);

/**
 * Les fichiers ne partent pas en cascade : les buckets Storage ignorent les clés
 * étrangères de Postgres. Il faut relever les chemins **avant** de supprimer les lignes,
 * sinon plus rien ne dit quels fichiers appartenaient à la boutique et ils occupent le
 * quota gratuit pour toujours.
 *
 * Le client passé décide de ce qui est visible : celui de la vendeuse pour sa propre
 * boutique, celui à clé de service quand on efface un compte entier.
 */
export async function collectStoreMedia(client: AnyClient, storeIds: string[]): Promise<StoreMedia> {
  if (!storeIds.length) return { productPaths: [], storePaths: [] };
  const [{ data: stores }, { data: products }] = await Promise.all([
    client.from("stores").select("logo_url,cover_url").in("id", storeIds),
    selectAll<{ id: string; image_url: string | null }>((from, to) => client.from("products").select("id,image_url").in("store_id", storeIds).order("id", { ascending: true }).range(from, to)),
  ]);
  const productIds = (products ?? []).map((product: { id: string }) => product.id);
  const { data: media } = productIds.length
    ? await selectAll<{ storage_path: string }>((from, to) => client.from("product_media").select("storage_path").in("product_id", productIds).order("storage_path", { ascending: true }).range(from, to))
    : { data: [] as { storage_path: string }[] };
  return {
    productPaths: [
      ...(media ?? []).map((item: { storage_path: string }) => item.storage_path),
      ...(products ?? []).map((product: { image_url: string | null }) => pathFromPublicUrl(product.image_url, PRODUCT_BUCKET)),
    ].filter(kept),
    storePaths: (stores ?? [])
      .flatMap((store: { logo_url: string | null; cover_url: string | null }) => [storeImagePathFromPublicUrl(store.logo_url), storeImagePathFromPublicUrl(store.cover_url)])
      .filter(kept),
  };
}

/**
 * À n'appeler qu'après la suppression des lignes : un échec en base ne doit pas laisser
 * une boutique vivante dont les images ont disparu.
 */
export async function removeStoreMedia(client: AnyClient, media: StoreMedia) {
  if (media.productPaths.length) await client.storage.from(PRODUCT_BUCKET).remove(media.productPaths);
  if (media.storePaths.length) await client.storage.from(STORE_BUCKET).remove(media.storePaths);
}
