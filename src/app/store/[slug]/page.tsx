import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveStoreTheme, themeCssVariables } from "@/features/themes/resolve-theme";
import { Storefront } from "@/features/storefront/components";
import { toProductView } from "@/features/storefront/storefront-types";
import { getVariantsForProducts } from "@/features/variants/data";

export const dynamic = "force-dynamic";

// generateMetadata and the page both need the store row. cache() keeps that to one
// query per request instead of two on the most-visited page of the product.
const loadStore = cache(async (slug: string) => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("stores")
    .select("id,owner_id,name,slug,description,status,whatsapp,cover_url,logo_url,slogan")
    .eq("slug", slug)
    .maybeSingle();
  return { supabase, store: data };
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { store } = await loadStore(slug);
  if (!store) return { title: "Boutique introuvable", robots: { index: false, follow: false } };

  // A seller's link lives or dies in a WhatsApp preview: it must show HER shop,
  // not the MYSTOREY defaults inherited from the root layout.
  const published = store.status === "published";
  const tagline = store.slogan?.trim() || store.description?.trim() || `Découvrez les produits de ${store.name} et commandez directement sur WhatsApp.`;
  const image = store.cover_url || store.logo_url || null;

  return {
    title: { absolute: `${store.name} — boutique en ligne` },
    description: tagline.slice(0, 200),
    alternates: { canonical: `/store/${store.slug}` },
    robots: published ? undefined : { index: false, follow: false },
    openGraph: {
      type: "website",
      siteName: store.name,
      title: store.name,
      description: tagline.slice(0, 200),
      url: `/store/${store.slug}`,
      locale: "fr_FR",
      ...(image ? { images: [{ url: image, alt: store.name }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: store.name,
      description: tagline.slice(0, 200),
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function PublicStorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase, store } = await loadStore(slug);
  if (!store) notFound();

  // RLS only returns an unpublished shop to its owner, but check explicitly: the owner
  // gets a private preview (the "APERÇU" step before "PUBLIER"), everyone else a waiting page.
  const isPreview = store.status !== "published";
  if (isPreview) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== store.owner_id) {
      return (
        <main className="store-coming-soon">
          <div className="store-coming-soon-card">
            <span className="store-logo-mark">{store.name.charAt(0).toUpperCase() || "M"}</span>
            <h1>{store.name}</h1>
            <p>Cette boutique ouvre très bientôt. Revenez dans quelques instants !</p>
          </div>
        </main>
      );
    }
  }

  const { data: products } = await supabase
    .from("products")
    .select("id,name,note,description,price,image_url,is_featured,category_id")
    .eq("store_id", store.id)
    .eq("is_available", true)
    .order("created_at", { ascending: false });
  const productIds = (products ?? []).map((product) => product.id);

  const [{ data: media }, { data: categories }, { data: theme }, variants] = await Promise.all([
    productIds.length ? supabase.from("product_media").select("id,product_id,public_url,position").in("product_id", productIds).order("position") : Promise.resolve({ data: [] as { id: string; product_id: string; public_url: string; position: number }[] }),
    supabase.from("categories").select("id,name").eq("store_id", store.id).order("name", { ascending: true }),
    supabase.from("store_themes").select("preset_id,overrides,layout,version").eq("store_id", store.id).maybeSingle(),
    getVariantsForProducts(supabase, productIds),
  ]);

  const mediaByProduct = new Map<string, { id: string; public_url: string; position: number }[]>();
  for (const item of media ?? []) {
    const list = mediaByProduct.get(item.product_id) ?? [];
    list.push({ id: item.id, public_url: item.public_url, position: item.position });
    mediaByProduct.set(item.product_id, list);
  }
  const { tokens } = resolveStoreTheme(theme ?? { preset_id: "modern", version: 1 });

  return (
    <div style={themeCssVariables(tokens)}>
      {isPreview && (
        <div className="store-preview-banner" role="status">
          <span><strong>Aperçu privé.</strong> Vous êtes la seule personne à voir cette page : votre boutique n’est pas encore publiée.</span>
          <Link className="vf-button vf-button--sm" href="/dashboard">Publier ma boutique</Link>
        </div>
      )}
      <Storefront
        tokens={tokens}
        products={(products ?? []).map((product) => ({
          ...toProductView({ ...product, product_media: mediaByProduct.get(product.id) ?? [] }),
          hasVariants: (variants.get(product.id) ?? []).some((variant) => variant.isActive),
        }))}
        categories={(categories ?? []).map((c) => ({ id: c.id, name: c.name }))}
        storeName={store.name}
        slogan={store.slogan ?? undefined}
        description={store.description}
        logoUrl={store.logo_url}
        whatsapp={store.whatsapp ?? ""}
        coverUrl={store.cover_url ?? ""}
        slug={store.slug}
        disableCheckout={isPreview}
      />
    </div>
  );
}
