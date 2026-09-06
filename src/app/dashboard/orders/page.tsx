import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrders } from "@/features/orders/data";
import { computeOrderOverview } from "@/features/orders/overview";
import { getProducts } from "@/features/products/data";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { StatusBadge } from "@/features/orders/components/status-badge";
import { OrderQuickActions } from "@/features/orders/components/order-quick-actions";
import { ShareStatusButton } from "@/features/orders/components/share-status-button";
import { DeleteOrderButton } from "@/features/orders/components/status-changer";
import { OrderCreateForm, type ProductChoice } from "@/features/orders/components/order-create-form";
import { ORDER_FILTERS, isOrderFilter, isPendingStatus, type OrderFilter, type OrderStatus } from "@/features/orders/order-status";
import { formatPrice } from "@/features/storefront/storefront-types";
export const dynamic = "force-dynamic";

const dateTime = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const waDigits = (raw: string) => raw.replace(/\D/g, "");

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const filter: OrderFilter = isOrderFilter(status) ? status : "all";
  
  // Fetch orders and products in parallel for better performance
  const [result, productsResult] = await Promise.all([getOrders(), getProducts()]);
  
  if (!result) redirect("/onboarding");
  const { store, user, supabase, orders, error: ordersError } = result;
  const overview = computeOrderOverview(orders);
  const choices: ProductChoice[] = (productsResult?.products ?? []).filter((p) => p.is_available).map((p) => ({ id: p.id, name: p.name, price: p.price }));
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();

  const activeFilter = ORDER_FILTERS.find((f) => f.value === filter) ?? ORDER_FILTERS[0];
  const filtered = orders.filter((order) => activeFilter.matches(order.status));
  const pendingCount = orders.filter((o) => isPendingStatus(o.status)).length;
  const countFor = (value: OrderFilter): number => {
    if (value === "all") return orders.length;
    if (value === "pending") return pendingCount;
    return overview.byStatus[value as OrderStatus] ?? 0;
  };

  return <DashboardShell name={profile?.display_name ?? ""} storeName={store.name} storeSlug={store.slug} status={store.status} storeLogoUrl={store.logo_url} storeDescription={store.description}>
    <section className="page-head">
      <div>
        <p className="vf-eyebrow">Pilotage</p>
        <h1>Commandes.</h1>
        <p className="muted">Chaque commande enregistrée depuis ta vitrine arrive ici automatiquement.</p>
      </div>
    </section>

    {ordersError && <p className="banner-warn" role="status">{ordersError} Exécutez la migration “orders & parcours de commande” dans le Supabase SQL Editor pour activer le suivi des commandes.</p>}

    <section className="order-toolbar">
      <p className="order-summary muted">
        {orders.length} commande{orders.length > 1 ? "s" : ""} au total
        {pendingCount > 0 ? <span className="order-summary-alert"> · <strong>{pendingCount} à confirmer</strong></span> : " · rien à confirmer"}
      </p>
      <div className="order-filters" role="group" aria-label="Filtrer les commandes par statut">
        {ORDER_FILTERS.map((f) => {
          const active = f.value === filter;
          return (
            <Link key={f.value} href={`/dashboard/orders${f.value === "all" ? "" : `?status=${f.value}`}`} className={`order-filter${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>
              {f.label} <span className="order-filter-count">{countFor(f.value)}</span>
            </Link>
          );
        })}
      </div>
    </section>

    <details className="order-create-details">
      <summary className="text-button">＋ Enregistrer une commande reçue (appel, arrivée sur place…)</summary>
      <OrderCreateForm storeId={store.id} products={choices} />
    </details>

    {filtered.length === 0 ? (
      <section className="empty-state">
        <h2>{orders.length === 0 ? "Aucune commande pour l’instant." : "Aucune commande dans cette vue."}</h2>
        <p>{orders.length === 0
          ? "Dès qu’un client finalise son panier sur ta vitrine, la commande apparaît ici (statut « Non confirmée »), prête à être confirmée et livrée."
          : "Choisissez un autre statut pour voir les commandes correspondantes."}</p>
      </section>
    ) : (
      <ul className="orders-list" aria-label="Liste des commandes">
        {filtered.map((order) => (
          <li className="order-card" key={order.id}>
            <div className="order-card-top">
              <div className="order-customer">
                <strong>{order.order_number ? <span className="order-tag">#{order.order_number}</span> : null} {order.customer_name || "Client sans nom"}</strong>
                {order.customer_phone && (
                  <a className="muted" href={`https://wa.me/${waDigits(order.customer_phone)}?text=${encodeURIComponent(`Bonjour ${order.customer_name}, suite à votre commande ${order.order_number ? `#${order.order_number}` : ""} chez ${store.name}…`)}`} target="_blank" rel="noopener noreferrer">{order.customer_phone}</a>
                )}
                {order.customer_address && <span className="order-address">{order.customer_address}</span>}
              </div>
              <StatusBadge status={order.status} />
            </div>
            <ul className="order-items">
              {order.items.map((item, index) => (
                <li key={index}>
                  <span>{item.quantity} × {item.name}<small className="order-unit"> {formatPrice(item.unitPrice)}</small></span>
                  <strong>{formatPrice(item.unitPrice * item.quantity)}</strong>
                </li>
              ))}
            </ul>
            {order.note && <p className="order-note">{order.note}</p>}
            <div className="order-card-foot">
              <span className="muted">{dateTime.format(new Date(order.created_at))}</span>
              <strong className="order-total">{formatPrice(order.total)}</strong>
              <span className="order-foot-spacer" />
              <ShareStatusButton orderNumber={order.order_number ?? ""} status={order.status} customerName={order.customer_name} customerPhone={order.customer_phone} />
              <DeleteOrderButton orderId={order.id} />
            </div>
            <OrderQuickActions orderId={order.id} status={order.status} orderTag={`#${order.order_number ?? ""}`} />
          </li>
        ))}
      </ul>
    )}
  </DashboardShell>;
}