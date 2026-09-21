import { redirect } from "next/navigation";
import { getMyFirstStore } from "@/features/stores/data";
import { getStoreCategories } from "@/features/categories/data";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { ProductForm } from "@/features/products/components/product-form";
import { productStockSupported } from "@/features/variants/data";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const { store, user, supabase } = await getMyFirstStore();
  if (!store) redirect("/onboarding");

  const [categories, { data: profile }, stockEnabled] = await Promise.all([
    getStoreCategories(store.id),
    supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
    productStockSupported(supabase),
  ]);

  return (
    <DashboardShell name={profile?.display_name ?? ""} storeName={store.name} storeSlug={store.slug} status={store.status} storeLogoUrl={store.logo_url} storeDescription={store.description}>
      <ProductForm storeId={store.id} categories={categories} stockEnabled={stockEnabled} storePublished={store.status === "published"} />
    </DashboardShell>
  );
}
