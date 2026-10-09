/**
 * Logique pure de la suppression de compte, partagée par l'action serveur et par le
 * formulaire : aucune dépendance à Supabase, donc testable directement.
 */
export const DELETION_PHRASE = "SUPPRIMER MON COMPTE";

export type ArchivedOrderRow = {
  order_id: string;
  store_id: string;
  store_name: string;
  store_slug: string;
  items: unknown;
  total: number;
  status: string;
  ordered_at: string;
  reason: string;
};
type StoreRef = { id: string; name?: string | null; slug?: string | null };
type OrderRow = { id: string; store_id: string; items?: unknown; total?: number | null; status?: string | null; created_at: string };

/**
 * Ce qui reste d'une commande quand la vendeuse s'en va : le montant, la date, le statut
 * et ce qui a été vendu, parce que la comptabilité en a besoin. Jamais `customer_name`,
 * `customer_phone` ni `note` : ces colonnes décrivent une cliente qui n'a rien demandé,
 * et elles ne doivent survivre à aucune suppression de compte.
 */
export function archiveRowsFor(stores: StoreRef[], orders: OrderRow[], reason = "account_deleted"): ArchivedOrderRow[] {
  const byId = new Map(stores.map((store) => [store.id, store]));
  return orders.map((order) => {
    const store = byId.get(order.store_id);
    return {
      order_id: order.id,
      store_id: order.store_id,
      store_name: store?.name ?? "",
      store_slug: store?.slug ?? "",
      items: order.items ?? [],
      total: order.total ?? 0,
      status: order.status ?? "",
      ordered_at: order.created_at,
      reason,
    };
  });
}
