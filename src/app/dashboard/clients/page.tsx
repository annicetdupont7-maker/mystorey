import { redirect } from "next/navigation";
import { getMyFirstStore } from "@/features/stores/data";
import { getOrders } from "@/features/orders/data";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { formatPrice } from "@/features/storefront/storefront-types";

export const dynamic = "force-dynamic";

type ClientSummary = { name: string; phone: string; orders: number; total: number; lastOrder: string };

export default async function ClientsPage() {
  const result = await getMyFirstStore();
  if (!result.store) redirect("/onboarding");
  const [ordersResult, profileData] = await Promise.all([
    getOrders(),
    result.supabase.from("profiles").select("display_name").eq("user_id", result.user.id).maybeSingle(),
  ]);
  const summaries = new Map<string, ClientSummary>();
  for (const order of ordersResult?.orders ?? []) {
    const key = order.customer_phone || order.customer_name || order.id;
    const current = summaries.get(key);
    summaries.set(key, {
      name: order.customer_name || "Client anonyme",
      phone: order.customer_phone,
      orders: (current?.orders ?? 0) + 1,
      total: (current?.total ?? 0) + (order.status === "cancelled" ? 0 : order.total),
      lastOrder: current && current.lastOrder > order.created_at ? current.lastOrder : order.created_at,
    });
  }
  const clients = [...summaries.values()].sort((a, b) => b.lastOrder.localeCompare(a.lastOrder));
  const { store } = result;
  const { data: profile } = profileData;

  return (
    <DashboardShell name={profile?.display_name ?? ""} storeName={store.name} storeSlug={store.slug} status={store.status} storeLogoUrl={store.logo_url} storeDescription={store.description}>
      <section className="page-head">
        <div><p className="vf-eyebrow">Développer</p><h1>Vos clients.</h1><p className="muted">Retrouvez les personnes qui commandent dans votre boutique.</p></div>
      </section>
      {clients.length === 0 ? (
        <section className="empty-state"><h2>Votre clientèle commence ici.</h2><p>Les clients apparaîtront après vos premières commandes.</p></section>
      ) : (
        <section className="panel client-list" aria-label="Liste des clients">
          <div className="panel-head"><h2>{clients.length} client{clients.length > 1 ? "s" : ""}</h2></div>
          {clients.map((client) => <article className="client-row" key={client.phone || client.name}><div><strong>{client.name}</strong><small>{client.phone || "Téléphone non renseigné"}</small></div><span>{client.orders} commande{client.orders > 1 ? "s" : ""}</span><strong>{formatPrice(client.total)}</strong></article>)}
        </section>
      )}
    </DashboardShell>
  );
}
