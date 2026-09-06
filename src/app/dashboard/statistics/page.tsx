/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, BarChart3, CalendarDays, Package, ShoppingBag, Users } from "lucide-react";
import { getMyFirstStore } from "@/features/stores/data";
import { getOrders } from "@/features/orders/data";
import { getProducts } from "@/features/products/data";
import { computeOrderOverview, countOrdersByProduct } from "@/features/orders/overview";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { formatPrice } from "@/features/storefront/storefront-types";
import { ORDER_STATUS_META, type OrderStatus } from "@/features/orders/order-status";
import type { OrderRow } from "@/features/orders/types";

export const dynamic = "force-dynamic";

type Period = "7" | "30" | "90" | "year";

const periodLabels: Record<Period, string> = { "7": "7 jours", "30": "30 jours", "90": "3 mois", year: "Cette année" };

function getPeriodStart(period: Period, now: Date) {
  const start = new Date(now);
  if (period === "year") return new Date(start.getFullYear(), 0, 1);
  start.setDate(start.getDate() - Number(period) + 1);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getChartBuckets(period: Period, orders: OrderRow[], now: Date) {
  const bucketCount = period === "year" ? 12 : period === "90" ? 6 : Number(period) <= 7 ? 7 : 6;
  const start = getPeriodStart(period, now);
  const bucketSize = period === "year" ? "month" : "day";
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const date = new Date(start);
    if (bucketSize === "month") date.setMonth(index);
    else if (period === "90") date.setDate(start.getDate() + Math.round(index * 89 / Math.max(bucketCount - 1, 1)));
    else if (period === "30") date.setDate(start.getDate() + Math.round(index * 29 / Math.max(bucketCount - 1, 1)));
    else date.setDate(start.getDate() + index);
    const key = bucketSize === "month" ? `${date.getFullYear()}-${date.getMonth()}` : date.toISOString().slice(0, 10);
    return { key, date, total: 0, label: bucketSize === "month" ? date.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "") : date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }).replace(".", "") };
  });
  const span = Math.max(now.getTime() - start.getTime(), 1);
  for (const order of orders) {
    if (order.status === "cancelled") continue;
    const created = new Date(order.created_at);
    const monthIndex = (created.getFullYear() - start.getFullYear()) * 12 + created.getMonth() - start.getMonth();
    const position = bucketSize === "month" ? monthIndex : Math.round(((created.getTime() - start.getTime()) / span) * (bucketCount - 1));
    const index = Math.min(bucketCount - 1, Math.max(0, position));
    buckets[index].total += order.total;
  }
  return buckets.map(({ key, total, label }) => ({ key, total, label }));
}

export default async function StatisticsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const result = await getMyFirstStore();
  if (!result.store) redirect("/onboarding");
  const [ordersResult, productsResult, profileData] = await Promise.all([getOrders(), getProducts(), result.supabase.from("profiles").select("display_name").eq("user_id", result.user.id).maybeSingle()]);
  const orders = ordersResult?.orders ?? [];
  const params = await searchParams;
  const period: Period = params.period === "7" || params.period === "30" || params.period === "90" || params.period === "year" ? params.period : "30";
  const now = new Date();
  const periodStart = getPeriodStart(period, now);
  const periodOrders = orders.filter((order) => new Date(order.created_at) >= periodStart);
  const overview = computeOrderOverview(periodOrders);
  const { store } = result;
  const { data: profile } = profileData;
  const paidOrders = periodOrders.filter((order) => order.status !== "cancelled");
  const averageOrder = paidOrders.length ? Math.round(overview.totalRevenue / paidOrders.length) : 0;
  const productRows = productsResult?.products ?? [];
  const productsById = new Map(productRows.map((product) => [product.id, product]));
  const productStats = countOrdersByProduct(periodOrders).slice(0, 4).map((stat) => ({ stat, product: productsById.get(stat.productId) }));
  const clientCount = new Set(periodOrders.map((order) => order.customer_phone || order.customer_name || order.id)).size;
  const chart = getChartBuckets(period, periodOrders, now);
  const maxChart = Math.max(...chart.map((point) => point.total), 1);
  const chartPoints = chart.map((point, index) => `${(index / Math.max(chart.length - 1, 1)) * 100},${96 - (point.total / maxChart) * 78}`).join(" ");
  const statusEntries = Object.entries(overview.byStatus) as [OrderStatus, number][];
  const statusTotal = Math.max(statusEntries.reduce((sum, [, count]) => sum + count, 0), 1);
  const statusColors: Record<OrderStatus, string> = { new: "#8b6a52", to_confirm: "#c98d2d", confirmed: "#6c8fb0", preparing: "#6d9d9b", shipped: "#8176a4", delivered: "#6f927d", cancelled: "#b58c8c" };
  const statusGradient = statusEntries.reduce<{ stops: string[]; offset: number }>((result, [status, count]) => {
    const next = result.offset + (count / statusTotal) * 100;
    result.stops.push(`${statusColors[status]} ${result.offset}% ${next}%`);
    return { stops: result.stops, offset: next };
  }, { stops: [], offset: 0 });
  const mostSold = productStats[0];

  return (
    <DashboardShell name={profile?.display_name ?? ""} storeName={store.name} storeSlug={store.slug} status={store.status} storeLogoUrl={store.logo_url} storeDescription={store.description}>
      <section className="statistics-heading">
        <div><p className="vf-eyebrow">Développer</p><h1>Vos ventes en un coup d&apos;œil</h1><p className="muted">Voici comment {store.name} évolue.</p></div>
        <nav className="statistics-periods" aria-label="Période des statistiques">
          {(Object.keys(periodLabels) as Period[]).map((value) => <Link key={value} className={period === value ? "is-active" : ""} href={`/dashboard/statistics?period=${value}`}>{periodLabels[value]}</Link>)}
          <span className="statistics-calendar" aria-hidden="true"><CalendarDays size={16} /></span>
        </nav>
      </section>

      <section className="statistics-revenue" aria-label="Chiffre d'affaires">
        <div className="statistics-revenue-copy"><p className="vf-eyebrow">Chiffre d&apos;affaires</p><strong>{formatPrice(overview.totalRevenue)}</strong><span className="statistics-revenue-note"><ArrowUpRight size={15} /> Données réelles · {periodLabels[period]}</span></div>
        <div className="statistics-chart"><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`Évolution du chiffre d'affaires sur ${periodLabels[period]}`}><polyline className="statistics-chart-area" points={`0,100 ${chartPoints} 100,100`} /><polyline className="statistics-chart-line" points={chartPoints} />{chart.map((point, index) => <circle key={point.key} cx={(index / Math.max(chart.length - 1, 1)) * 100} cy={96 - (point.total / maxChart) * 78} r={point.total > 0 ? 1.7 : 1} />)}</svg><div className="statistics-chart-labels">{chart.map((point) => <span key={point.key}>{point.label}</span>)}</div></div>
      </section>

      <section className="statistics-metrics" aria-label="Indicateurs importants">
        <article><span className="statistics-metric-icon"><ShoppingBag size={18} /></span><div><span>Commandes</span><strong>{overview.totalOrders}</strong><small>{overview.pendingCount} à traiter</small></div></article>
        <article><span className="statistics-metric-icon"><BarChart3 size={18} /></span><div><span>Panier moyen</span><strong>{formatPrice(averageOrder)}</strong><small>sur les commandes actives</small></div></article>
        <article><span className="statistics-metric-icon"><Users size={18} /></span><div><span>Clients</span><strong>{clientCount}</strong><small>sur la période</small></div></article>
        <article><span className="statistics-metric-icon"><Package size={18} /></span><div><span>Produits vendus</span><strong>{countOrdersByProduct(periodOrders).reduce((sum, stat) => sum + stat.quantity, 0)}</strong><small>{productRows.filter((product) => product.is_available).length} en ligne</small></div></article>
      </section>

      <section className="statistics-lower-grid">
        <div className="statistics-products panel"><div className="panel-head"><div><p className="vf-eyebrow">Votre catalogue vivant</p><h2>Vos produits en vedette</h2></div><Link className="text-button" href="/dashboard/products">Voir tout</Link></div>{productStats.length ? <div className="statistics-product-grid">{productStats.map(({ stat, product }) => <Link className="statistics-product-card" href={product ? `/dashboard/products/${product.id}` : "/dashboard/products"} key={stat.productId}><div className="statistics-product-image">{product?.image_url ? <img src={product.image_url} alt={product.name} loading="lazy" /> : <span>📦</span>}</div><div><strong>{product?.name ?? "Produit retiré"}</strong><span>{formatPrice(stat.revenue)} · {stat.quantity} unité{stat.quantity > 1 ? "s" : ""}</span><em>{stat.orders} commande{stat.orders > 1 ? "s" : ""} · {stat.quantity > 1 ? "Très performant" : "En progression"}</em></div></Link>)}</div> : <div className="statistics-empty"><Package size={22} /><p>Vos produits apparaîtront ici dès votre première commande.</p></div>}</div>
        <div className="statistics-status panel"><div className="panel-head"><div><p className="vf-eyebrow">Suivi opérationnel</p><h2>Où en sont vos commandes ?</h2></div></div><div className="statistics-status-content"><div className="statistics-donut" style={{ background: `conic-gradient(${statusGradient.stops.join(", ")})` }}><div><strong>{overview.totalOrders}</strong><span>commandes</span></div></div><div className="statistics-status-list">{statusEntries.map(([status, count]) => <div className="statistics-status-row" key={status}><span><i className={`status-dot status-dot--${ORDER_STATUS_META[status].tone}`} />{ORDER_STATUS_META[status].label}</span><strong>{count}</strong></div>)}</div></div></div>
      </section>

      <section className="statistics-insight"><span className="statistics-insight-icon">✦</span><div><p className="vf-eyebrow">Une petite chose à remarquer</p><h2>{mostSold ? `“${mostSold.product?.name ?? "Votre produit"}” mène actuellement vos ventes.` : "Votre boutique prend forme."}</h2><p>{mostSold ? `${mostSold.stat.quantity} unité${mostSold.stat.quantity > 1 ? "s" : ""} vendue${mostSold.stat.quantity > 1 ? "s" : ""} et ${formatPrice(mostSold.stat.revenue)} générés sur ${periodLabels[period].toLowerCase()}.` : "Les premières commandes permettront à VendoFlow de faire émerger vos produits les plus performants."}</p></div><Link href="/dashboard/products">Découvrir mes produits <ArrowUpRight size={15} /></Link></section>
    </DashboardShell>
  );
}
