import { redirect } from "next/navigation";
import { getMyFirstStore } from "@/features/stores/data";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { SettingsForm } from "@/features/stores/components/settings-form";
import { DeleteStoreForm } from "@/features/stores/components/delete-store-form";
export const dynamic = "force-dynamic";
export default async function SettingsPage() {
  const { store, user, supabase } = await getMyFirstStore();
  if (!store) redirect("/onboarding");
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
  return <DashboardShell name={profile?.display_name ?? ""} storeName={store.name} storeSlug={store.slug} status={store.status} storeLogoUrl={store.logo_url} storeDescription={store.description}>
    <section className="products-header">
      <div>
        <p className="vf-eyebrow">Boutique · Mission 4</p>
        <h1>Paramètres.</h1>
        <p className="muted">Votre nom, votre description et le numéro WhatsApp qui reçoit les commandes de vos clients.</p>
      </div>
    </section>
    <SettingsForm storeId={store.id} name={store.name} description={store.description ?? ""} whatsapp={store.whatsapp ?? ""} />
    <DeleteStoreForm storeId={store.id} />
  </DashboardShell>;
}