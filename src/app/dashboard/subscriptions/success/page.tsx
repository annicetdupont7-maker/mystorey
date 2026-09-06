import { redirect } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { getMyFirstStore } from "@/features/stores/data";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { getSellerSubscriptionStatus } from "@/features/subscriptions/data";

export const dynamic = "force-dynamic";

export default async function SubscriptionSuccessPage() {
  const { store, user, supabase } = await getMyFirstStore();
  if (!store) redirect("/onboarding");

  const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
  const subscriptionStatus = await getSellerSubscriptionStatus();
  const subscriptionIsActive = subscriptionStatus.subscription?.status === "active" && subscriptionStatus.subscription.payment_status === "paid";

  return (
    <DashboardShell name={profile?.display_name ?? ""} storeName={store.name} storeSlug={store.slug} status={store.status} storeLogoUrl={store.logo_url} storeDescription={store.description}>
      <section className="page-head">
        <div>
          <p className="vf-eyebrow">Paiement</p>
          <h1>{subscriptionIsActive ? "Votre abonnement est activé." : "Votre paiement est en cours de vérification."}</h1>
        </div>
      </section>

      <div className="success-panel">
        <div className="success-icon">
          <Check size={32} />
        </div>

        <div className="success-content">
          <h2>{subscriptionIsActive ? "Merci pour votre confiance" : "Confirmation en cours"}</h2>
          <p>{subscriptionIsActive ? <>Vous avez souscrit avec succès à <strong>{subscriptionStatus.plan.name}</strong>.</> : "Votre abonnement sera activé après confirmation du paiement par Kkiapay."}</p>

          {subscriptionIsActive && <ul className="success-features">
              <li>{subscriptionStatus.plan.productLimit ? `Jusqu'à ${subscriptionStatus.plan.productLimit} produits` : "Produits illimités"}</li>
              <li>Gestion complète de votre boutique</li>
              <li>Commandes WhatsApp intégrées</li>
              <li>Support client prioritaire</li>
            </ul>}

          <div className="success-actions">
            <Link href="/dashboard" className="vf-button">
              Retour au tableau de bord
            </Link>
            <Link href="/dashboard/products" className="text-button">
              Ajouter des produits
            </Link>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
