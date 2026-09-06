import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Building2, ClipboardList, Coins, Package, ShoppingBag, Store, Users, UserPlus } from "lucide-react";
import { getAdminDashboard } from "@/features/admin/data";
import { formatDateTime, formatFCFA } from "@/features/admin/stats";
import { StatusBadge } from "@/features/orders/components/status-badge";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const { stats, recentOrders, activity, error } = await getAdminDashboard();
  return (
    <div className="admin-page">
      <header className="page-head">
        <div>
          <p className="vf-eyebrow">Administration</p>
          <h1>Vue d’ensemble</h1>
          <p className="muted">L’état de la plateforme MYSTOREY, en temps réel.</p>
        </div>
        <Link className="vf-button vf-button--ghost" href="/admin/users">Gérer les utilisateurs</Link>
      </header>

      {error && <p className="banner-warn" role="alert">{error}</p>}

      <section className="admin-kpis" aria-label="Indicateurs clés">
        <AdminKpi label="Comptes" value={String(stats.users)} icon={Users} tone="violet" />
        <AdminKpi label="Vendeurs" value={String(stats.sellers)} icon={Store} tone="blue" />
        <AdminKpi label="Boutiques" value={String(stats.stores)} detail={`${stats.storesPublished} publiée(s) · ${stats.storesDraft} brouillon(s)`} icon={Building2} tone="cyan" />
        <AdminKpi label="Produits" value={String(stats.products)} icon={Package} tone="indigo" />
        <AdminKpi label="Commandes" value={String(stats.orders)} detail={`${stats.ordersPending} non confirmée(s)`} icon={ClipboardList} tone="amber" />
        <AdminKpi label="CA livré des boutiques" value={formatFCFA(stats.revenue)} detail="commandes au statut livré" icon={Coins} tone="green" />
      </section>

      <section className="admin-panels">
        <div className="panel">
          <div className="panel-head">
            <div>
              <p className="vf-eyebrow">Commandes</p>
              <h2>Commandes récentes</h2>
            </div>
            <Link className="text-button" href="/admin/orders">Tout voir</Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="admin-empty-mini">Aucune commande sur la plateforme pour le moment.</div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>N°</th><th>Boutique</th><th>Client</th><th>Total</th><th>Statut</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr key={o.id}>
                      <td className="admin-order-number">{o.order_number ?? "—"}</td>
                      <td>{o.storeName}</td>
                      <td>{o.customer_name || "Client anonyme"}</td>
                      <td className="admin-strong">{formatFCFA(o.total)}</td>
                      <td><StatusBadge status={o.status} /></td>
                      <td className="muted">{formatDateTime(o.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <p className="vf-eyebrow">Activité</p>
              <h2>Activité récente</h2>
            </div>
          </div>
          {activity.length === 0 ? (
            <div className="admin-empty-mini">Pas encore d’activité.</div>
          ) : (
            <ul className="admin-activity">
              {activity.map((item) => {
                const Icon = item.kind === "user" ? UserPlus : item.kind === "store" ? Building2 : ShoppingBag;
                return (
                  <li key={item.id} className="admin-activity-item">
                    <span className={`admin-activity-icon admin-activity-icon--${item.kind}`} aria-hidden="true"><Icon size={16} /></span>
                    <span className="admin-activity-body">
                      <strong>{item.title}</strong>
                      <span>{item.detail || formatDateTime(item.date)}</span>
                    </span>
                    <time className="muted" dateTime={item.date}>{formatDateTime(item.date)}</time>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function AdminKpi({ label, value, detail, icon: Icon, tone }: { label: string; value: string; detail?: string; icon: LucideIcon; tone: "violet" | "blue" | "cyan" | "indigo" | "amber" | "green" }) {
  return (
    <div className={`admin-kpi admin-kpi--${tone}`}>
      <span className="admin-kpi-icon" aria-hidden="true"><Icon size={18} aria-hidden="true" /></span>
      <span className="admin-kpi-label">{label}</span>
      <span className="admin-kpi-value">{value}</span>
      {detail && <span className="admin-kpi-detail">{detail}</span>}
    </div>
  );
}