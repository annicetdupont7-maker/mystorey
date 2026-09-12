import { redirect, notFound } from "next/navigation";
import { getSingleProduct } from "@/features/products/data";
import { getStoreCategories } from "@/features/categories/data";
import { getMyFirstStore } from "@/features/stores/data";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { ProductFormWithPreview } from "@/features/products/components/product-form-with-preview";
import { VariantEditor } from "@/features/variants/components/variant-editor";
import { getVariantsForProduct, variantsAreAvailable } from "@/features/variants/data";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getSingleProduct(id);

  if (!result.store) redirect("/onboarding");
  if (!result.product) notFound();

  const { store, user, supabase } = await getMyFirstStore();
  if (!store) redirect("/onboarding");

  const [categories, profileResult, variants, variantsEnabled] = await Promise.all([
    getStoreCategories(result.store.id),
    supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
    getVariantsForProduct(supabase, id),
    variantsAreAvailable(supabase),
  ]);
  const profile = profileResult.data;
  // Read separately: the column only exists once the variants migration is applied.
  const { data: stockRow } = await supabase.from("products").select("stock").eq("id", id).maybeSingle();
  const productStock = (stockRow as { stock?: number | null } | null)?.stock ?? null;

  return (
    <DashboardShell name={profile?.display_name ?? ""} storeName={store.name} storeSlug={store.slug} status={store.status} storeLogoUrl={store.logo_url} storeDescription={store.description}>
      <section className="page-head">
        <div>
          <p className="vf-eyebrow">Modifier</p>
          <h1>Éditer le produit</h1>
          <p className="muted">Mettez à jour les détails et visualisez les changements en direct avant de valider.</p>
        </div>
      </section>
      <ProductFormWithPreview 
        storeId={result.store.id} 
        categories={categories}
        initialProduct={{
          id: result.product.id,
          name: result.product.name,
          note: result.product.note ?? "",
          description: result.product.description ?? "",
          price: result.product.price,
          imageUrl: result.product.image_url ?? null,
          media: (result.product.product_media ?? []).map((item) => ({ url: item.public_url, path: item.storage_path })),
          isAvailable: result.product.is_available,
          isFeatured: result.product.is_featured,
          categoryId: result.product.category_id
        }}
      />
      <VariantEditor
        productId={result.product.id}
        productPrice={result.product.price}
        productStock={productStock}
        variants={variants}
        available={variantsEnabled}
      />
    </DashboardShell>
  );
}