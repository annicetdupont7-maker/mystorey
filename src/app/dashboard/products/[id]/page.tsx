import { redirect, notFound } from "next/navigation";
import { getSingleProduct } from "@/features/products/data";
import { getStoreCategories } from "@/features/categories/data";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { ProductForm } from "@/features/products/components/product-form";
import { VariantEditor } from "@/features/variants/components/variant-editor";
import { getVariantsForProduct, productStockSupported, variantsAreAvailable } from "@/features/variants/data";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getSingleProduct(id);
  if (!result.store) redirect("/onboarding");
  if (!result.product) notFound();
  const { store, user, supabase, product } = result;

  const [categories, profileResult, variants, variantsEnabled, stockEnabled] = await Promise.all([
    getStoreCategories(store.id),
    supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
    getVariantsForProduct(supabase, id),
    variantsAreAvailable(supabase),
    productStockSupported(supabase),
  ]);
  // Read separately: the column only exists once the variants migration is applied.
  const { data: stockRow } = stockEnabled ? await supabase.from("products").select("stock").eq("id", id).maybeSingle() : { data: null };
  const productStock = (stockRow as { stock?: number | null } | null)?.stock ?? null;

  return (
    <DashboardShell name={profileResult.data?.display_name ?? ""} storeName={store.name} storeSlug={store.slug} status={store.status} storeLogoUrl={store.logo_url} storeDescription={store.description}>
      <ProductForm
        storeId={store.id}
        categories={categories}
        stockEnabled={stockEnabled}
        storePublished={store.status === "published"}
        product={{
          id: product.id,
          name: product.name,
          note: product.note ?? "",
          description: product.description ?? "",
          price: product.price,
          imageUrl: product.image_url ?? null,
          media: (product.product_media ?? []).map((item) => ({ url: item.public_url, path: item.storage_path })),
          isAvailable: product.is_available,
          isFeatured: product.is_featured,
          categoryId: product.category_id,
          stock: productStock,
        }}
      />
      <VariantEditor
        productId={product.id}
        productPrice={product.price}
        productStock={productStock}
        variants={variants}
        available={variantsEnabled}
      />
    </DashboardShell>
  );
}
