/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, TrendingUp } from "lucide-react";
import { getMyFirstStore } from "@/features/stores/data";
import { getProducts, type ProductWithFlags } from "@/features/products/data";
import { getOrders } from "@/features/orders/data";
import { computeOrderOverview, countOrdersByProduct } from "@/features/orders/overview";
import { buildInsights, buildTodos } from "@/features/insights/rules";
import { InsightCard } from "@/features/insights/components/insight-card";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { StoreShareSheet } from "@/features/sharing/components/share-sheet";
import { getSellerSubscriptionStatus } from "@/features/subscriptions/data";
import { formatPrice } from "@/features/storefront/storefront-types";
import { StatusBadge } from "@/features/orders/components/status-badge";
import type { ProductForInsight } from "@/features/insights/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { store, user, supabase } = await getMyFirstStore();
  if (!store) redirect("/onboarding");

  // Fetch profile, products, orders and plan in parallel for better performance
  const [profileData, productsResult, ordersResult, subscriptionStatus] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
    getProducts(),
    getOrders(),
    getSellerSubscriptionStatus(),
  ]);

  const { data: profile } = profileData;
  const products: ProductWithFlags[] = productsResult?.products ?? [];
  const orders = ordersResult?.orders ?? [];
  const ordersError = ordersResult?.error;

  const insightProducts: ProductForInsight[] = products.map((p) => ({
    id: p.id, name: p.name, note: p.note ?? "", description: p.description ?? "", price: p.price,
    image_url: p.image_url, is_available: p.is_available, is_featured: p.is_featured, created_at: p.created_at,
  }));
  const overview = computeOrderOverview(orders);
  const context = { storePublished: store.status === "published", whatsappSet: Boolean(store.whatsapp?.trim()), products: insightProducts, orders, overview };
  const insights = buildInsights(context);
  const todos = buildTodos(context);

  // Extract primary sales KPI and secondary KPIs for hierarchical display
  const salesKpi = { label: "Chiffre d'affaires", value: formatPrice(overview.totalRevenue), detail: overview.totalOrders > 0 ? "commandes livrées" : "aucune vente pour l'instant" };
  const productLimit = subscriptionStatus.plan.productLimit;
  const secondaryKpis = [
    { label: "Commandes", value: String(overview.totalOrders), detail: `${overview.activeCount} en cours` },
    { label: "À traiter", value: String(overview.pendingCount), detail: "nouvelle / à confirmer" },
    {
      label: "Produits",
      value: productLimit ? `${products.length} / ${productLimit}` : String(products.length),
      detail: `${products.filter((p) => p.is_available).length} en vente`,
      // A seller should notice she is nearing her plan limit before she is blocked.
      meter: productLimit ? Math.min(products.length / productLimit, 1) : null,
    },
  ];
  const published = store.status === "published";
  const publicPath = `/store/${store.slug}`;
  const recentOrders = orders.slice(0, 5);
  const salesByDay = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    const total = orders.filter((order) => order.created_at.slice(0, 10) === key && order.status !== "cancelled").reduce((sum, order) => sum + order.total, 0);
    return { key, label: date.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", ""), total };
  });
  const maxDailySales = Math.max(...salesByDay.map((day) => day.total), 1);
  const statsByProduct = new Map(countOrdersByProduct(orders).map((stat) => [stat.productId, stat]));
  const bestSeller = [...products]
    .sort((a, b) => (statsByProduct.get(b.id)?.quantity ?? 0) - (statsByProduct.get(a.id)?.quantity ?? 0))
    .find((product) => (statsByProduct.get(product.id)?.quantity ?? 0) > 0);
  const recentProducts = products.slice(0, 3);

  return (
    <DashboardShell name={profile?.display_name ?? ""} storeName={store.name} storeSlug={store.slug} status={store.status} storeLogoUrl={store.logo_url} storeDescription={store.description}>
      {store.status !== "published" && <section className="publish-next-step"><div><p className="vf-eyebrow">Dernière étape</p><h2>Votre boutique est presque prête</h2><p>Choisissez une apparence, puis publiez votre boutique pour la rendre accessible à vos clientes.</p><ol><li className="is-done">Boutique créée</li><li className={products.length > 0 ? "is-done" : ""}>Produits ajoutés</li><li>Apparence à choisir</li><li>Boutique à publier</li></ol></div><Link className="vf-button" href="/dashboard/storefront/appearance">Choisir un thème et publier ma boutique <ArrowRight size={16} /></Link></section>}
      {ordersError && <p className="banner-warn" role="status">{ordersError} Exécutez la migration &quot;orders &amp; produit vedette&quot; dans le Supabase SQL Editor pour activer le suivi des commandes.</p>}
      
      {/* Hero Sales KPI - Prominent */}
      <section className="dashboard-sales-hero">
        <div className="sales-kpi-large">
          <div className="sales-kpi-header">
            <p className="vf-eyebrow">Ventes</p>
            <TrendingUp size={18} className="trending-icon" />
          </div>
          <div className="sales-kpi-value">{salesKpi.value}</div>
          <p className="sales-kpi-detail">{salesKpi.detail}</p>
        </div>
        <div className="sales-chart" aria-label="Chiffre d'affaires sur les sept derniers jours">
          <div className="sales-chart-bars" role="img" aria-label="Diagramme des ventes des sept derniers jours">
            {salesByDay.map((day) => (
              <div className="sales-chart-bar-group" key={day.key}>
                <span className="sales-chart-bar-value">{day.total > 0 ? formatPrice(day.total) : "-"}</span>
                <span className="sales-chart-bar-track"><span className="sales-chart-bar" style={{ height: `${Math.max((day.total / maxDailySales) * 100, day.total > 0 ? 8 : 3)}%` }} /></span>
                <span className="sales-chart-bar-label">{day.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Secondary KPIs */}
      <section className="kpis-secondary" aria-label="Métriques secondaires">
        {secondaryKpis.map((kpi) => (
          <article className="kpi-secondary" key={kpi.label}>
            <span className="kpi-label">{kpi.label}</span>
            <strong className="kpi-value">{kpi.value}</strong>
            <span className="kpi-detail">{kpi.detail}</span>
            {kpi.meter !== null && kpi.meter !== undefined && (
              <span className="kpi-meter" aria-hidden="true">
                <span className={`kpi-meter-fill${kpi.meter >= 1 ? " is-full" : ""}`} style={{ width: `${Math.max(kpi.meter * 100, 3)}%` }} />
              </span>
            )}
          </article>
        ))}
      </section>

      {/* The activation moment: a published shop is worth nothing unshared, so the link
          and the share action sit on the home screen rather than behind a header icon. */}
      {published && (
        <section className="share-spotlight">
          <div className="share-spotlight-copy">
            <p className="vf-eyebrow">Votre boutique est en ligne</p>
            <h2>Partagez votre lien à vos clientes</h2>
            <p className="share-spotlight-url">{publicPath}</p>
          </div>
          <div className="share-spotlight-actions">
            <StoreShareSheet storeName={store.name} storeSlug={store.slug} />
            <Link className="vf-button vf-button--ghost" href={publicPath} target="_blank" rel="noopener noreferrer">Voir ma boutique</Link>
          </div>
        </section>
      )}

      {/* §10: unconfirmed orders are the closest thing to an abandoned cart in a
          WhatsApp flow — the amount still recoverable, and one click to act on it. */}
      {overview.pendingCount > 0 && (
        <section className="recovery-banner">
          <div>
            <p className="vf-eyebrow">À récupérer</p>
            <h2>{overview.pendingCount} commande{overview.pendingCount > 1 ? "s" : ""} en attente de confirmation</h2>
            <p className="muted">Soit {formatPrice(overview.pendingRevenue)} encore en jeu. Un message WhatsApp préparé suffit souvent à les conclure.</p>
          </div>
          <Link className="vf-button" href="/dashboard/marketing">Relancer mes clientes <ArrowRight size={16} aria-hidden="true" /></Link>
        </section>
      )}

      <section className="dashboard-orders-panel panel">
        <div className="panel-head">
          <div>
            <p className="vf-eyebrow">Activité</p>
            <h2>Commandes récentes</h2>
          </div>
          <Link className="text-button" href="/dashboard/orders">Voir toutes les commandes</Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="muted">Les nouvelles commandes apparaîtront ici dès leur première validation.</p>
        ) : (
          <div className="dashboard-orders-list">
            {recentOrders.map((order) => (
              <Link key={order.id} href="/dashboard/orders" className="dashboard-order-row">
                <span className="dashboard-order-customer"><strong>{order.customer_name || "Client anonyme"}</strong><small>{order.order_number || "Commande"}</small></span>
                <span className="dashboard-order-total">{formatPrice(order.total)}</span>
                <StatusBadge status={order.status} />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* À faire section - Action queue */}
      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="vf-eyebrow">Priorités</p>
            <h2>À faire aujourd&apos;hui</h2>
          </div>
        </div>
        <ul className="todo-list">
          {todos.map((todo) => (
            <li className={`todo-item${todo.urgent ? " is-urgent" : ""}`} key={todo.id}>
              <span className="todo-dot" aria-hidden="true" />
              <div className="todo-main">
                <strong>{todo.label}</strong>
                <span className="muted">{todo.detail}</span>
              </div>
              <Link className="vf-button vf-button--ghost vf-button--sm" href={todo.href}>
                {todo.cta}
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </li>
          ))}
          {todos.length === 0 && (
            <li className="todo-empty">Tout est à jour. Vos prochaines commandes apparaîtront ici dès leur enregistrement.</li>
          )}
        </ul>
      </section>

      {/* Store pulse: image-first products and insights */}
      <section className="store-pulse">
        <div className="store-pulse-featured panel">
          <div className="panel-head">
            <div>
              <p className="vf-eyebrow">Votre boutique en ce moment</p>
              <h2>Produit le plus vendu</h2>
            </div>
            <Link className="text-button" href="/dashboard/products">Catalogue</Link>
          </div>
          {bestSeller ? (
            <Link className="dashboard-product-hero" href={`/dashboard/products/${bestSeller.id}`}>
              <div className="dashboard-product-hero-media">
                {bestSeller.image_url ? <img src={bestSeller.image_url} alt={bestSeller.name} loading="lazy" /> : <span aria-hidden="true">📦</span>}
              </div>
              <div className="dashboard-product-hero-info">
                <span className="tag tag--featured">Le plus vendu</span>
                <h3>{bestSeller.name}</h3>
                <strong>{formatPrice(bestSeller.price)}</strong>
                <p>{statsByProduct.get(bestSeller.id)?.quantity ?? 0} unité{(statsByProduct.get(bestSeller.id)?.quantity ?? 0) > 1 ? "s" : ""} vendue{(statsByProduct.get(bestSeller.id)?.quantity ?? 0) > 1 ? "s" : ""} · {formatPrice(statsByProduct.get(bestSeller.id)?.revenue ?? 0)} générés</p>
              </div>
            </Link>
          ) : (
            <div className="featured-empty"><p>Votre produit le plus vendu apparaîtra dès la première commande.</p><Link className="vf-button vf-button--ghost vf-button--sm" href="/dashboard/products">Voir le catalogue</Link></div>
          )}
        </div>

        <div className="store-pulse-recent panel">
          <div className="panel-head">
            <div><p className="vf-eyebrow">Sélection récente</p><h2>Produits récents</h2></div>
            <Link className="text-button" href="/dashboard/products">Tout voir</Link>
          </div>
          <div className="dashboard-recent-products">
            {recentProducts.map((product) => <Link className="dashboard-product-mini" href={`/dashboard/products/${product.id}`} key={product.id}>
              <span className="dashboard-product-mini-media">{product.image_url ? <img src={product.image_url} alt="" loading="lazy" /> : <span aria-hidden="true">📦</span>}</span>
              <span className="dashboard-product-mini-copy"><strong>{product.name}</strong><small>{formatPrice(product.price)}</small><em>{product.is_available ? "En vente" : "Caché"}</em></span>
            </Link>)}
            {recentProducts.length === 0 && <p className="muted">Ajoutez votre premier produit pour composer votre vitrine.</p>}
          </div>
        </div>
      </section>

      <section className="dashboard-grid">

        <div className="panel">
          <div className="panel-head">
            <div>
              <p className="vf-eyebrow">Votre activité</p>
              <h2>À savoir aujourd&apos;hui 🔎</h2>
            </div>
          </div>
          {insights.length === 0 ? (
            <p className="muted">Dès vos premières commandes, vous retrouverez ici des observations concrètes sur votre boutique.</p>
          ) : (
            <div className="insights-grid">{insights.map((insight) => <InsightCard key={insight.id} insight={insight} />)}</div>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
