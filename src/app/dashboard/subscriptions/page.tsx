import { redirect } from "next/navigation";
import Link from "next/link";
import { getMyFirstStore } from "@/features/stores/data";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { getSellerSubscriptionStatus } from "@/features/subscriptions/data";
import { subscriptionPlans } from "@/features/subscriptions/types";
import { paidPlansArePurchasable } from "@/features/subscriptions/availability";
import { initiateKkiapayPayment } from "@/features/subscriptions/kkiapay-actions";
import { getProducts } from "@/features/products/data";

export const dynamic = "force-dynamic";

// The raw column value used to be printed as "Statut : active".
const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  pending: "En attente de confirmation",
  expired: "Expiré",
  cancelled: "Résilié",
};

export default async function SubscriptionsPage() {
  const { store, user, supabase } = await getMyFirstStore();
  if (!store) redirect("/onboarding");

  const [profileData, subscriptionStatus, productsResult] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
    getSellerSubscriptionStatus(),
    getProducts(),
  ]);

  const profile = profileData.data;
  const productCount = productsResult?.products.length ?? 0;
  const productLimit = subscriptionStatus.plan.productLimit;
  const canBuy = paidPlansArePurchasable();
  const usageRatio = productLimit ? Math.min(productCount / productLimit, 1) : 0;
  const remaining = productLimit ? Math.max(productLimit - productCount, 0) : null;
  const atLimit = remaining === 0;
  const rawStatus = subscriptionStatus.subscription?.status;
  const expiresAt = subscriptionStatus.subscription?.expires_at;

  return (
    <DashboardShell name={profile?.display_name ?? ""} storeName={store.name} storeSlug={store.slug} status={store.status} storeLogoUrl={store.logo_url} storeDescription={store.description}>
      <section className="page-head">
        <div>
          <p className="vf-eyebrow">Abonnement</p>
          <h1>Votre plan.</h1>
          <p className="muted">
            Toutes les fonctionnalités de MYSTOREY sont incluses dans le plan gratuit. La seule chose qui change d’un plan à l’autre, c’est le nombre de produits que vous pouvez publier.
          </p>
        </div>
      </section>

      <div className="subscription-status-card">
        <span className="vf-eyebrow">Plan actuel</span>
        <strong>{subscriptionStatus.plan.name}</strong>
        <p>{subscriptionStatus.plan.description}</p>

        {productLimit === null ? (
          <span className="subscription-usage">{productCount} produit{productCount > 1 ? "s" : ""} publié{productCount > 1 ? "s" : ""}</span>
        ) : (
          <>
            <span className="subscription-usage">{productCount} / {productLimit} produits utilisés</span>
            <span className="subscription-meter" role="img" aria-label={`${productCount} produits sur ${productLimit} utilisés`}>
              <span className={`subscription-meter-fill${usageRatio >= 1 ? " is-full" : ""}`} style={{ width: `${Math.max(usageRatio * 100, 2)}%` }} />
            </span>
            <span className="muted subscription-usage-hint">
              {atLimit
                ? "Vous avez atteint la limite de votre plan. Vos produits restent en ligne ; pour en ajouter un nouveau, libérez une place ou passez à un plan supérieur."
                : `Il vous reste ${remaining} place${remaining && remaining > 1 ? "s" : ""} pour de nouveaux produits.`}
            </span>
          </>
        )}

        {rawStatus && <span className="subscription-status-label">Statut : {STATUS_LABELS[rawStatus] ?? rawStatus}</span>}
        {expiresAt && subscriptionStatus.plan.id !== "free" && (
          <span className="subscription-status-label">Renouvellement le {new Date(expiresAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
        )}
      </div>

      <div className="subscription-grid">
        {subscriptionPlans.filter((plan) => plan.id !== "growth" || subscriptionStatus.plan.id === "growth").map((plan) => {
          const isCurrent = subscriptionStatus.plan.id === plan.id;
          return (
            <article key={plan.id} className={`subscription-card${isCurrent ? " is-current" : ""}`}>
              {isCurrent ? <span className="subscription-badge">Votre plan</span> : plan.badge && <span className="subscription-badge">{plan.badge}</span>}
              <div className="subscription-card__header">
                <h2>{plan.name}</h2>
                <p>{plan.description}</p>
              </div>

              <div className="subscription-price">{plan.priceLabel}</div>

              <ul className="subscription-list">
                <li><strong>{plan.productLimit ? `Jusqu’à ${plan.productLimit} produits` : "Produits illimités"}</strong></li>
                <li>Boutique personnalisable et publication</li>
                <li>Produits, photos et catégories</li>
                <li>Commandes et relances WhatsApp</li>
                <li>Tableau de bord et statistiques</li>
              </ul>

              {isCurrent ? (
                <button type="button" className="vf-button vf-button--ghost" disabled>Plan actif</button>
              ) : plan.id === "free" ? (
                <button type="button" className="vf-button vf-button--ghost" disabled>Inclus dans votre compte</button>
              ) : canBuy ? (
                <form action={initiateKkiapayPayment}>
                  <input type="hidden" name="planId" value={plan.id} />
                  <button type="submit" className="vf-button">Passer au plan {plan.name}</button>
                </form>
              ) : (
                <button type="button" className="vf-button vf-button--ghost" disabled title="Le paiement en ligne n’est pas encore ouvert">
                  Ouverture prochaine
                </button>
              )}
            </article>
          );
        })}
      </div>

      {!canBuy && (
        <p className="banner-warn" role="status">
          Les paiements en ligne ne sont pas encore ouverts. Vous n’avez rien à faire : votre boutique et vos produits restent en ligne, et vous serez prévenue ici dès que les plans payants seront disponibles.
        </p>
      )}

      <div className="subscription-footer">
        <Link href="/dashboard" className="text-button">Retour au tableau de bord</Link>
      </div>
    </DashboardShell>
  );
}
