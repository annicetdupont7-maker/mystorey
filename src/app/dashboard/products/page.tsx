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
import { productStockSupported } from "@/features/variants/data";
import { ArrowRight, CheckCircle2, Layers, Plus } from "lucide-react";
export const dynamic = "force-dynamic";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ added?: string; saved?: string }> }) {
  const { added, saved } = await searchParams;
  // getMyFirstStore() is cached via React.cache() - no duplicate calls
  const result = await getProducts();
  if (!result) redirect("/onboarding");
  const { store, user, supabase, products } = result;

  // Fetch orders and categories in parallel to reduce waterfall
  const [ordersResult, categories, stockEnabled] = await Promise.all([getOrders(), getStoreCategories(store.id), productStockSupported(supabase)]);
  const stockById = new Map<string, number | null>();
  if (stockEnabled && products.length) {
    const { data: stockRows } = await supabase.from("products").select("id,stock").eq("store_id", store.id);
    for (const row of (stockRows ?? []) as { id: string; stock: number | null }[]) stockById.set(row.id, row.stock);
  }
  const addedProduct = added ? products.find((p) => p.id === added) : undefined;
  
  const orderStats = ordersResult?.error ? [] : countOrdersByProduct(ordersResult?.orders ?? []);
  const statsById = new Map(orderStats.map((s) => [s.productId, s]));
  const decorated: (ProductWithFlags & { orders: number; revenue: number; stock?: number | null })[] = products.map((p) => {
    const stat: ProductOrderStats | undefined = statsById.get(p.id);
    return { ...p, orders: stat?.orders ?? 0, revenue: stat?.revenue ?? 0, stock: stockEnabled ? stockById.get(p.id) ?? null : undefined };
  });

  const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
  return <DashboardShell name={profile?.display_name ?? ""} storeName={store.name} storeSlug={store.slug} status={store.status} storeLogoUrl={store.logo_url} storeDescription={store.description}>
    <section className="page-head">
      <div>
        <p className="vf-eyebrow">Catalogue</p>
        <h1>Mes produits</h1>
        <p className="muted">{products.length} produit{products.length > 1 ? "s" : ""} · {products.filter((p) => p.is_available).length} visible{products.filter((p) => p.is_available).length > 1 ? "s" : ""} dans votre boutique{store.status !== "published" ? " (dès sa publication)" : ""}.</p>
      </div>
      <Link className="vf-button" href="/dashboard/products/new"><Plus size={16} aria-hidden="true" /> Ajouter un produit</Link>
    </section>
    {addedProduct && (
      <section className="product-added" role="status">
        <CheckCircle2 size={22} aria-hidden="true" />
        <div>
          <strong>« {addedProduct.name} » est ajouté{addedProduct.is_available ? (store.status === "published" ? " et visible dans votre boutique" : "") : " (masqué)"} ✓</strong>
          <p className="muted">{store.status === "published" ? "Vos clientes peuvent déjà le voir." : "Il sera visible dès que votre boutique sera publiée."}</p>
        </div>
        <div className="product-added-actions">
          <Link className="vf-button vf-button--sm" href="/dashboard/products/new"><Plus size={14} aria-hidden="true" /> Ajouter un autre produit</Link>
          <Link className="vf-button vf-button--ghost vf-button--sm" href={`/dashboard/products/${addedProduct.id}#variants`}><Layers size={14} aria-hidden="true" /> Ajouter des couleurs / tailles</Link>
          {store.status !== "published" && <Link className="text-button" href="/dashboard">Continuer le lancement <ArrowRight size={14} aria-hidden="true" /></Link>}
        </div>
      </section>
    )}
    {saved && !addedProduct && <p className="form-success product-saved" role="status">Modifications enregistrées ✓</p>}
    <ProductsCatalog products={decorated} storeSlug={store.slug} categories={categories} />
  </DashboardShell>;
}