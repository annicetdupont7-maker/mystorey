import { getMyFirstStore } from "@/features/stores/data";
import type { OrderRow } from "./types";

type StoreContext = Awaited<ReturnType<typeof getMyFirstStore>>;
type OrdersContext = { store: NonNullable<StoreContext["store"]>; user: StoreContext["user"]; supabase: StoreContext["supabase"]; orders: OrderRow[]; error?: string };

export async function getOrders(): Promise<OrdersContext | null> {
  const { store, user, supabase } = await getMyFirstStore();
  if (!store) return null;
  const { data, error } = await supabase.from("orders").select("id,order_number,customer_name,customer_phone,customer_address,items,total,status,note,created_at,updated_at").eq("store_id", store.id).order("created_at", { ascending: false }).order("status", { ascending: true });
  if (error) return { store, user, supabase, orders: [] as OrderRow[], error: "Impossible de charger les commandes." };
  return { store, user, supabase, orders: (data ?? []) as OrderRow[] };
}