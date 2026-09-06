import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyFirstStore } from "@/features/stores/data";
import { getStoreCategories } from "@/features/categories/data";
import { CategoryManager } from "@/features/categories/components/category-manager";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const { store, user, supabase } = await getMyFirstStore();
  if (!store) redirect("/onboarding");

  // Fetch categories and product count in parallel
  const [categories, productsData, profileData] = await Promise.all([
    getStoreCategories(store.id),
    supabase.from("products").select("id, category_id").eq("store_id", store.id),
    supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
  ]);

  const countBy = new Map<string, number>();
  for (const product of productsData.data ?? []) {
    if (product.category_id) countBy.set(product.category_id, (countBy.get(product.category_id) ?? 0) + 1);
  }
  const rows = categories.map((c) => ({ ...c, count: countBy.get(c.id) ?? 0 }));
  const { data: profile } = profileData;
  return <DashboardShell name={profile?.display_name ?? ""} storeName={store.name} storeSlug={store.slug} status={store.status} storeLogoUrl={store.logo_url} storeDescription={store.description}>
    <section className="page-head">
      <div>
        <p className="vf-eyebrow">Catalogue</p>
        <h1>Vos catégories.</h1>
        <p className="muted">Organisez vos articles pour aider vos clientes à naviguer plus vite dans votre boutique.</p>
      </div>
      <Link className="vf-button vf-button--ghost" href="/dashboard/products/new">+ Ajouter un produit</Link>
    </section>
    <CategoryManager storeId={store.id} categories={rows} />
  </DashboardShell>;
}