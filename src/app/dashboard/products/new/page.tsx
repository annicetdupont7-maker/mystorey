import { redirect } from "next/navigation";
import { getMyFirstStore } from "@/features/stores/data";
import { getStoreCategories } from "@/features/categories/data";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { ProductFormWithPreview } from "@/features/products/components/product-form-with-preview";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const { store, user, supabase } = await getMyFirstStore();
  if (!store) redirect("/onboarding");

  const categories = await getStoreCategories(store.id);
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();

  return (
    <DashboardShell name={profile?.display_name ?? ""} storeName={store.name} storeSlug={store.slug} status={store.status} storeLogoUrl={store.logo_url} storeDescription={store.description}>
      <section className="page-head">
        <div>
          <p className="vf-eyebrow">Ajouter</p>
          <h1>Créer un produit</h1>
          <p className="muted">Remplissez les détails et voyez en direct comment votre produit apparaîtra à vos clients.</p>
        </div>
      </section>
      <ProductFormWithPreview storeId={store.id} categories={categories} />
    </DashboardShell>
  );
}
