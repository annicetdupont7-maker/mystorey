import { redirect } from "next/navigation";
import { getMyFirstStore } from "@/features/stores/data";
import { getProducts } from "@/features/products/data";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { IdentityForm } from "@/features/stores/components/identity-form";
import { resolveStoreTheme } from "@/features/themes/resolve-theme";
import { toProductView } from "@/features/storefront/storefront-types";

export const dynamic = "force-dynamic";

export default async function StoreIdentityPage() {
  const { store, user, supabase } = await getMyFirstStore();
  if (!store) redirect("/onboarding");

  const [profileResult, productsResult] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
    getProducts(),
  ]);
  const theme = Array.isArray(store.store_themes) ? store.store_themes[0] : store.store_themes;
  const { tokens } = resolveStoreTheme(theme ?? { preset_id: "modern", version: 1 });
  // Preview the seller's own catalogue whenever there is one: it is the whole point of a preview.
  const products = (productsResult?.products ?? []).filter((product) => product.is_available).map(toProductView);

  return (
    <DashboardShell name={profileResult.data?.display_name ?? ""} storeName={store.name} storeSlug={store.slug} status={store.status} storeLogoUrl={store.logo_url} storeDescription={store.description}>
      <section className="page-head">
        <div>
          <p className="vf-eyebrow">Ma boutique</p>
          <h1>Votre identité.</h1>
          <p className="muted">Le logo, la phrase d’accroche et l’histoire qui font de votre boutique une vraie marque. Tout ce que vous modifiez ici apparaît immédiatement dans l’aperçu.</p>
        </div>
      </section>
      <IdentityForm
        storeId={store.id}
        name={store.name ?? ""}
        slogan={store.slogan ?? ""}
        description={store.description ?? ""}
        whatsapp={store.whatsapp ?? ""}
        logoUrl={store.logo_url ?? null}
        coverUrl={store.cover_url ?? null}
        slug={store.slug}
        tokens={tokens}
        products={products}
      />
    </DashboardShell>
  );
}
