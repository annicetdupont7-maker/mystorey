import { isOrderFilter } from "@/features/orders/order-status";
import { getAdminOrders, getAdminStoreRefs } from "@/features/admin/data";
import { OrdersView } from "./orders-view";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; store?: string }> }) {
  const sp = await searchParams;
  const [{ orders, error }, stores] = await Promise.all([getAdminOrders(), getAdminStoreRefs()]);
  const initialStatus = isOrderFilter(sp.status) ? sp.status : "all";
  return (
    <div className="admin-page">
      <header className="page-head">
        <div>
          <p className="vf-eyebrow">Administration</p>
          <h1>Commandes</h1>
          <p className="muted">{orders.length} commande(s) à l’échelle de la plateforme, en lecture seule.</p>
        </div>
      </header>
      {error ? <p className="banner-warn" role="alert">{error}</p> : <OrdersView orders={orders} stores={stores} initialStatus={initialStatus} initialStore={typeof sp.store === "string" && sp.store.length > 0 ? sp.store : "all"} />}
    </div>
  );
}