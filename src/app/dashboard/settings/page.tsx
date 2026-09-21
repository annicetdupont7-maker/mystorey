import { redirect } from "next/navigation";
import { getMyFirstStore } from "@/features/stores/data";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { SettingsForm } from "@/features/stores/components/settings-form";
import { DeleteStoreForm } from "@/features/stores/components/delete-store-form";
import { PublishStoreButton, UnpublishStoreButton } from "@/features/stores/components/publish-button";
export const dynamic = "force-dynamic";
export default async function SettingsPage() {
  const { store, user, supabase } = await getMyFirstStore();
  if (!store) redirect("/onboarding");
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
  return <DashboardShell name={profile?.display_name ?? ""} storeName={store.name} storeSlug={store.slug} status={store.status} storeLogoUrl={store.logo_url} storeDescription={store.description}>
    <section className="products-header">
      <div>
        <p className="vf-eyebrow">Compte &amp; boutique</p>
        <h1>Paramètres.</h1>
        <p className="muted">Le nom de votre boutique, sa description, votre numéro WhatsApp et sa mise en ligne.</p>
      </div>
    </section>
    <SettingsForm storeId={store.id} name={store.name} description={store.description ?? ""} whatsapp={store.whatsapp ?? ""} />
    <section className="panel settings-publish">
      <h2>Mise en ligne</h2>
      <p className="muted">{store.status === "published" ? "Votre boutique est en ligne : tout le monde peut la voir avec votre lien." : "Votre boutique n’est pas encore publiée : vos clientes voient une page d’attente."}</p>
      {store.status === "published" ? <UnpublishStoreButton storeId={store.id} /> : <PublishStoreButton storeId={store.id} />}
    </section>
    <DeleteStoreForm storeId={store.id} />
  </DashboardShell>;
}