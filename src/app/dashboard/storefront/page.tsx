import { redirect } from "next/navigation";
import { getMyFirstStore } from "@/features/stores/data";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { IdentityForm } from "@/features/stores/components/identity-form";
import { resolveStoreTheme } from "@/features/themes/resolve-theme";
export const dynamic="force-dynamic";
export default async function StorefrontSettingsPage(){
  const { store, user, supabase } = await getMyFirstStore();
  if(!store)redirect("/onboarding");
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
  const theme = Array.isArray(store.store_themes) ? store.store_themes[0] : store.store_themes;
  const { tokens } = resolveStoreTheme(theme ?? { preset_id:"modern", version:1 });
  return <DashboardShell name={profile?.display_name ?? ""} storeName={store.name} storeSlug={store.slug} status={store.status} storeLogoUrl={store.logo_url} storeDescription={store.description}>
    <section className="products-header">
      <div>
        <p className="vf-eyebrow">Ma boutique · Identité</p>
        <h1>Votre identité.</h1>
        <p className="muted">Le logo, la phrase d’accroche et la présentation qui font de votre boutique une vraie marque. Retrouvez-les sur votre vitrine publique.</p>
      </div>
    </section>
    <IdentityForm storeId={store.id} name={store.name ?? ""} slogan={store.slogan ?? ""} description={store.description ?? ""} whatsapp={store.whatsapp ?? ""} logoUrl={store.logo_url ?? null} coverUrl={store.cover_url ?? null} slug={store.slug} tokens={tokens} />
  </DashboardShell>;
}
