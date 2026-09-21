import { redirect } from "next/navigation";
import Link from "next/link";
import { Check, Clock } from "lucide-react";
import { getMyFirstStore } from "@/features/stores/data";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { getSellerSubscriptionStatus } from "@/features/subscriptions/data";

export const dynamic = "force-dynamic";

export default async function SubscriptionSuccessPage() {
  const { store, user, supabase } = await getMyFirstStore();
  if (!store) redirect("/onboarding");

  const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
  const subscriptionStatus = await getSellerSubscriptionStatus();
  // Only a PAID plan confirmed by the provider's webhook counts as a success. The free
  // plan is also "active/paid" in the table, so it must never read as "abonnement activé".
  const subscription = subscriptionStatus.subscription;
  const subscriptionIsActive = Boolean(subscription && subscription.plan_id !== "free" && subscription.provider !== "manual" && subscription.status === "active" && subscription.payment_status === "paid" && subscriptionStatus.plan.id !== "free");

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
          {subscriptionIsActive ? <Check size={32} /> : <Clock size={32} />}
        </div>

        <div className="success-content">
          <h2>{subscriptionIsActive ? "Merci pour votre confiance" : "Confirmation en cours"}</h2>
          <p>{subscriptionIsActive ? <>Vous avez souscrit avec succès à <strong>{subscriptionStatus.plan.name}</strong>.</> : "Aucun paiement confirmé pour le moment. Votre plan changera uniquement quand le prestataire de paiement nous aura confirmé la transaction — vous n’avez rien à refaire."}</p>

          {subscriptionIsActive && <ul className="success-features">
              <li>{subscriptionStatus.plan.productLimit ? `Jusqu'à ${subscriptionStatus.plan.productLimit} produits` : "Produits illimités"}</li>
              <li>Gestion complète de votre boutique</li>
              <li>Commandes WhatsApp intégrées</li>
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
