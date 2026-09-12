import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveStoreTheme, themeCssVariables } from "@/features/themes/resolve-theme";
import { StoreProductPage } from "@/features/storefront/components";
import { toProductView, formatPrice } from "@/features/storefront/storefront-types";
import { getVariantsForProduct } from "@/features/variants/data";

export const dynamic = "force-dynamic";

// Shared by generateMetadata and the page so a visit costs one set of queries, not two.
const loadProduct = cache(async (slug: string, productId: string) => {
  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase.from("stores").select("id,name,slug,status,whatsapp,logo_url").eq("slug", slug).maybeSingle();
  if (!store || store.status !== "published") return { supabase, store: null, product: null, media: [] };

  // `stock` lands with the 20260912 migration; selecting it before that would fail the
  // whole query, so it is read separately and treated as "not tracked" on error.
  const { data: product } = await supabase
    .from("products")
    .select("id,name,note,description,price,image_url,is_available,is_featured")
    .eq("id", productId)
    .eq("store_id", store.id)
    .eq("is_available", true)
    .maybeSingle();
  if (!product) return { supabase, store, product: null, media: [], variants: [], stock: null };

  const [mediaResult, variants, stockResult] = await Promise.all([
    supabase.from("product_media").select("id,public_url,position").eq("product_id", productId).order("position"),
    getVariantsForProduct(supabase, productId),
    supabase.from("products").select("stock").eq("id", productId).maybeSingle(),
  ]);

  return {
    supabase,
    store,
    product,
    media: mediaResult.data ?? [],
    variants,
    stock: (stockResult.data as { stock?: number | null } | null)?.stock ?? null,
  };
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string; productId: string }> }): Promise<Metadata> {
  const { slug, productId } = await params;
  const { store, product, media } = await loadProduct(slug, productId);
  if (!store || !product) return { title: "Produit introuvable", robots: { index: false, follow: false } };

  // This is the URL the "partager ce produit" button hands to WhatsApp: the preview has to
  // show the photo, the name and the price, or the share is just a bare link.
  const description = (product.note?.trim() || product.description?.trim() || `Disponible chez ${store.name}.`).slice(0, 200);
  const image = product.image_url || media[0]?.public_url || store.logo_url || null;

  return {
    title: `${product.name} — ${formatPrice(product.price)}`,
    description,
    alternates: { canonical: `/store/${store.slug}/produit/${product.id}` },
    openGraph: {
      type: "website",
      siteName: store.name,
      title: `${product.name} · ${formatPrice(product.price)}`,
      description,
      url: `/store/${store.slug}/produit/${product.id}`,
      locale: "fr_FR",
      ...(image ? { images: [{ url: image, alt: product.name }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: `${product.name} · ${formatPrice(product.price)}`,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function PublicStoreProductPage({ params }: { params: Promise<{ slug: string; productId: string }> }) {
  const { slug, productId } = await params;
  const { supabase, store, product, media, variants, stock } = await loadProduct(slug, productId);
  if (!store || !product) notFound();

  const { data: theme } = await supabase.from("store_themes").select("preset_id,overrides,layout,version").eq("store_id", store.id).maybeSingle();
  const { tokens } = resolveStoreTheme(theme ?? { preset_id: "modern", version: 1 });

  return (
    <div style={themeCssVariables(tokens)}>
      <StoreProductPage
        product={toProductView({ ...product, product_media: media })}
        storeName={store.name}
        logoUrl={store.logo_url}
        whatsapp={store.whatsapp ?? ""}
        slug={store.slug}
        variants={variants}
        productStock={stock}
      />
    </div>
  );
}
