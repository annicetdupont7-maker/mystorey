import Link from "next/link";
import { getAdminBilling } from "@/features/admin/insights-data";
import { formatDate, formatFCFA } from "@/features/admin/stats";
import { paidPlansArePurchasable } from "@/features/subscriptions/availability";
import { getPlanById } from "@/features/subscriptions/types";

export const dynamic = "force-dynamic";

const PAYMENT_STATUS: Record<string, string> = { pending: "En attente", approved: "Confirmé", declined: "Refusé", cancelled: "Annulé" };

export default async function AdminSubscriptionsPage() {
  const { subscriptions, subscriptionsAvailable, payments, paymentsAvailable, plans } = await getAdminBilling();
  const paymentsOpen = paidPlansArePurchasable();
  const byPlan = new Map<string, number>();
  for (const sub of subscriptions) byPlan.set(sub.planId, (byPlan.get(sub.planId) ?? 0) + 1);
  const confirmed = payments.filter((p) => p.status === "approved");
  const nearLimit = subscriptions.filter((sub) => {
    const limit = getPlanById(sub.planId).productLimit;
    return limit !== null && sub.products >= limit - 2;
  });

  return (
    <div className="admin-page">
      <header className="page-head">
        <div>
          <p className="vf-eyebrow">Administration</p>
          <h1>Abonnements &amp; paiements</h1>
          <p className="muted">L’état réel des plans et des paiements, tel qu’enregistré en base.</p>
        </div>
      </header>

      <section className={`admin-billing-status${paymentsOpen ? " is-open" : ""}`} role="status">
        <strong>{paymentsOpen ? "Paiement en ligne : OUVERT" : "Paiement en ligne : FERMÉ"}</strong>
        <p>
          {paymentsOpen
            ? "Les vendeuses peuvent acheter un plan payant via KKiaPay. Un plan ne s’active qu’après confirmation signée du webhook."
            : "Les plans payants sont affichés « Ouverture prochaine » : aucune vendeuse ne peut payer. Pour ouvrir, il faut une intégration KKiaPay validée en réel, les 3 clés live et KKIAPAY_PAYMENTS_ENABLED=true dans Vercel."}
        </p>
      </section>

      <section className="admin-kpis" aria-label="Répartition des plans">
        {(plans.length ? plans : [{ id: "free", name: "Découverte", price: 0, product_limit: 10 }]).map((plan) => (
          <div className="admin-kpi admin-kpi--violet" key={plan.id}>
            <span className="admin-kpi-label">{plan.name} · {plan.price ? `${formatFCFA(plan.price)}/mois` : "gratuit"}</span>
            <span className="admin-kpi-value">{byPlan.get(plan.id) ?? 0}</span>
            <span className="admin-kpi-detail">boutique(s) · {plan.product_limit ? `${plan.product_limit} produits max` : "illimité"}</span>
          </div>
        ))}
        <div className="admin-kpi admin-kpi--green">
          <span className="admin-kpi-label">Paiements confirmés</span>
          <span className="admin-kpi-value">{confirmed.length}</span>
          <span className="admin-kpi-detail">{formatFCFA(confirmed.reduce((sum, p) => sum + p.amount, 0))} encaissés</span>
        </div>
      </section>

      {!subscriptionsAvailable && (
        <p className="banner-warn" role="status">La table <code>seller_subscriptions</code> n’existe pas encore en base : toutes les boutiques sont traitées comme « Découverte » (limite appliquée par l’application). Appliquez <code>20260921_launch_hardening.sql</code> pour l’enregistrer en base et faire respecter la limite par la base elle-même.</p>
      )}

      {nearLimit.length > 0 && (
        <section className="panel">
          <div className="panel-head"><div><p className="vf-eyebrow">Opportunités</p><h2>Boutiques proches de leur limite</h2></div></div>
          <ul className="admin-watch-list">
            {nearLimit.map((sub) => <li key={sub.storeId}><Link href={`/store/${sub.storeSlug}`} target="_blank" rel="noopener noreferrer">{sub.storeName}</Link><span className="muted">{sub.products} / {getPlanById(sub.planId).productLimit} produits · {sub.ownerName}</span></li>)}
          </ul>
        </section>
      )}

      <section className="panel">
        <div className="panel-head"><div><p className="vf-eyebrow">Abonnements</p><h2>Plan de chaque boutique</h2></div></div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Boutique</th><th>Propriétaire</th><th>Plan</th><th>Produits</th><th>Statut</th><th>Échéance</th></tr></thead>
            <tbody>
              {subscriptions.map((sub) => (
                <tr key={sub.storeId}>
                  <td><Link href={`/store/${sub.storeSlug}`} target="_blank" rel="noopener noreferrer">{sub.storeName}</Link></td>
                  <td>{sub.ownerName}</td>
                  <td>{getPlanById(sub.planId).name}{!sub.recorded && <small className="muted"> (par défaut)</small>}</td>
                  <td>{sub.products}{getPlanById(sub.planId).productLimit ? ` / ${getPlanById(sub.planId).productLimit}` : ""}</td>
                  <td>{sub.status === "active" ? "Actif" : sub.status === "pending" ? "En attente" : sub.status === "expired" ? "Expiré" : sub.status}</td>
                  <td className="muted">{sub.expiresAt ? formatDate(sub.expiresAt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><div><p className="vf-eyebrow">Paiements</p><h2>Transactions KKiaPay</h2></div></div>
        {!paymentsAvailable ? (
          <p className="muted">Aucune table de paiement en base pour l’instant : aucun paiement n’a jamais pu être créé.</p>
        ) : payments.length === 0 ? (
          <p className="muted">Aucune transaction. C’est normal tant que le paiement en ligne est fermé.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Date</th><th>Boutique</th><th>Plan</th><th>Montant</th><th>Statut</th></tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}><td className="muted">{formatDate(p.createdAt)}</td><td>{p.storeName}</td><td>{getPlanById(p.planId).name}</td><td className="admin-strong">{formatFCFA(p.amount)}</td><td>{PAYMENT_STATUS[p.status] ?? p.status}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
