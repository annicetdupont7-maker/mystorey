import Link from "next/link";
import { redirect } from "next/navigation";
import { getProducts } from "@/features/products/data";
import { getStoreCategories } from "@/features/categories/data";
import { countOrdersByProduct } from "@/features/orders/overview";
import { getOrders } from "@/features/orders/data";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { ProductsCatalog } from "@/features/products/components/products-catalog";
import type { ProductWithFlags } from "@/features/products/data";
import type { ProductOrderStats } from "@/features/orders/types";
export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  // getMyFirstStore() is cached via React.cache() - no duplicate calls
  const result = await getProducts();
  if (!result) redirect("/onboarding");
  const { store, user, supabase, products } = result;

  // Fetch orders and categories in parallel to reduce waterfall
  const [ordersResult, categories] = await Promise.all([getOrders(), getStoreCategories(store.id)]);
  
  const orderStats = ordersResult?.error ? [] : countOrdersByProduct(ordersResult?.orders ?? []);
  const statsById = new Map(orderStats.map((s) => [s.productId, s]));
  const decorated: (ProductWithFlags & { orders: number; revenue: number })[] = products.map((p) => {
    const stat: ProductOrderStats | undefined = statsById.get(p.id);
    return { ...p, orders: stat?.orders ?? 0, revenue: stat?.revenue ?? 0 };
  });

  const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
  return <DashboardShell name={profile?.display_name ?? ""} storeName={store.name} storeSlug={store.slug} status={store.status} storeLogoUrl={store.logo_url} storeDescription={store.description}>
    <section className="page-head">
      <div>
        <p className="vf-eyebrow">Catalogue</p>
        <h1>Votre catalogue.</h1>
        <p className="muted">Gérez vos articles, vendez sur votre vitrine et mettez en avant vos meilleures pièces.</p>
      </div>
      <Link className="vf-button" href="/dashboard/products/new">+ Ajouter un produit</Link>
    </section>
    <ProductsCatalog products={decorated} storeSlug={store.slug} categories={categories} />
  </DashboardShell>;
}