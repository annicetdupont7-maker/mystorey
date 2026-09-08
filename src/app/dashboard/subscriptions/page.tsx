import { redirect } from "next/navigation";
import Link from "next/link";
import { getMyFirstStore } from "@/features/stores/data";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { getSellerSubscriptionStatus } from "@/features/subscriptions/data";
import { subscriptionPlans } from "@/features/subscriptions/types";
import { getProducts } from "@/features/products/data";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  const { store, user, supabase } = await getMyFirstStore();
  if (!store) redirect("/onboarding");

  const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
  const subscriptionStatus = await getSellerSubscriptionStatus();
  const productsResult = await getProducts();
  const productCount = productsResult?.products.length ?? 0;
  const productLimit = subscriptionStatus.plan.productLimit;

  return (
    <DashboardShell name={profile?.display_name ?? ""} storeName={store.name} storeSlug={store.slug} status={store.status} storeLogoUrl={store.logo_url} storeDescription={store.description}>
      <section className="page-head">
        <div>
          <p className="vf-eyebrow">Abonnement</p>
          <h1>Choisissez votre plan.</h1>
           <p className="muted">La V1 de test inclut le plan gratuit. Les plans payants seront disponibles prochainement.</p>
        </div>
      </section>

      <div className="subscription-status-card">
        <span className="vf-eyebrow">Plan actuel</span>
        <strong>{subscriptionStatus.plan.name}</strong>
        <p>{subscriptionStatus.plan.description}</p>
        <span className="subscription-usage">{productLimit === null ? `${productCount} produit${productCount > 1 ? "s" : ""} utilisé${productCount > 1 ? "s" : ""}` : `${productCount} / ${productLimit} produits utilisés`}</span>
        {subscriptionStatus.subscription?.status && <span className="subscription-status-label">Statut : {subscriptionStatus.subscription.status}</span>}
      </div>

      <div className="subscription-grid">
        {subscriptionPlans.map((plan) => {
          const isCurrent = subscriptionStatus.plan.id === plan.id;
          return (
            <article key={plan.id} className={`subscription-card${isCurrent ? " is-current" : ""}`}>
              {plan.badge && <span className="subscription-badge">{plan.badge}</span>}
              <div className="subscription-card__header">
                <h2>{plan.name}</h2>
                <p>{plan.description}</p>
              </div>

              <div className="subscription-price">{plan.priceLabel}</div>

              <ul className="subscription-list">
                <li>{plan.productLimit ? `Jusqu’à ${plan.productLimit} produits` : "Produits illimités"}</li>
                <li>Gestion de votre boutique</li>
                <li>Commandes WhatsApp</li>
                <li>Support prioritaire</li>
              </ul>

              {plan.id === "free" && isCurrent ? (
                <button type="button" className="vf-button vf-button--ghost" disabled>Plan gratuit actif</button>
              ) : plan.id === "free" ? (
                <button type="button" className="vf-button vf-button--ghost" disabled>Plan gratuit disponible</button>
              ) : (
                <button type="button" className="vf-button vf-button--ghost" disabled>Disponible prochainement</button>
              )}
            </article>
          );
        })}
      </div>

      <div className="subscription-footer">
        <Link href="/dashboard" className="text-button">Retour au tableau de bord</Link>
      </div>
    </DashboardShell>
  );
}
