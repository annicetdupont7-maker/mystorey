import type { OrderFilter, OrderStatus } from "@/features/orders/order-status";
import type {
  ActivityItem,
  AdminOrderRow,
  AdminProductRow,
  AdminRole,
  AdminStats,
  AdminStoreRow,
  AdminUserRow,
} from "./types";

export const PAGE_SIZE = 20;

const fcf = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 });

export function formatFCFA(value: number): string {
  return fcf.format(value);
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return dateTimeFormatter.format(date);
}

const PENDING: OrderStatus[] = ["new", "to_confirm"];

export function computeAdminStats(input: {
  profiles: { role: AdminRole | null }[];
  stores: { status: AdminStoreRow["status"] }[];
  orders: { status: OrderStatus; total: number }[];
  productsCount: number;
}): AdminStats {
  const orders = input.orders.length;
  const revenue = input.orders.reduce((sum, o) => (o.status === "delivered" ? sum + o.total : sum), 0);
  return {
    users: input.profiles.length,
    sellers: input.profiles.filter((p) => p.role === "seller").length,
    admins: input.profiles.filter((p) => p.role === "admin").length,
    stores: input.stores.length,
    storesPublished: input.stores.filter((s) => s.status === "published").length,
    storesDraft: input.stores.filter((s) => s.status === "draft").length,
    products: input.productsCount,
    orders,
    ordersPending: input.orders.filter((o) => PENDING.includes(o.status)).length,
    revenue,
  };
}

export function filterUsers(users: AdminUserRow[], search: string, role: "all" | AdminRole): AdminUserRow[] {
  const q = search.trim().toLowerCase();
  const byRef = q
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          (u.email ?? "").toLowerCase().includes(q) ||
          (u.phone ?? "").toLowerCase().includes(q) ||
          // recherche aussi par id (partiel) pour un accès direct
          u.id.toLowerCase().startsWith(q),
      )
    : users;
  return role === "all" ? byRef : byRef.filter((u) => u.role === role);
}

export function filterStores(stores: AdminStoreRow[], search: string, status: "all" | "draft" | "published"): AdminStoreRow[] {
  const q = search.trim().toLowerCase();
  const byRef = q
    ? stores.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.slug.toLowerCase().includes(q) ||
          s.ownerName.toLowerCase().includes(q),
      )
    : stores;
  return status === "all" ? byRef : byRef.filter((s) => s.status === status);
}

export function filterProducts(products: AdminProductRow[], search: string, availability: "all" | "available" | "unavailable", featured: boolean): AdminProductRow[] {
  const q = search.trim().toLowerCase();
  const byRef = q
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.note.toLowerCase().includes(q) ||
          p.storeName.toLowerCase().includes(q) ||
          p.ownerName.toLowerCase().includes(q),
      )
    : products;
  const byAvailability =
    availability === "all" ? byRef : byRef.filter((p) => (availability === "available" ? p.is_available : !p.is_available));
  return featured ? byAvailability.filter((p) => p.is_featured) : byAvailability;
}

export function filterOrders(orders: AdminOrderRow[], status: OrderFilter): AdminOrderRow[] {
  if (status === "all") return orders;
  if (status === "pending") return orders.filter((o) => PENDING.includes(o.status));
  return orders.filter((o) => o.status === status);
}

export function paginate<T>(items: T[], page: number, pageSize = PAGE_SIZE): { items: T[]; page: number; pages: number; total: number } {
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pages);
  return { items: items.slice((safePage - 1) * pageSize, safePage * pageSize), page: safePage, pages, total };
}

export function buildActivityFeed(input: {
  profiles: { id: string; name: string; email: string | null; created_at: string | null }[];
  stores: { id: string; name: string; slug: string; created_at: string }[];
  orders: { id: string; order_number: string | null; customer_name: string; storeName: string; created_at: string }[];
}, limit = 10): ActivityItem[] {
  const items: ActivityItem[] = [];
  for (const p of input.profiles) {
    if (!p.created_at) continue;
    items.push({ id: `user-${p.id}`, kind: "user", title: `Nouveau compte — ${p.name || "sans nom"}`, detail: p.email ?? "", date: p.created_at });
  }
  for (const s of input.stores) {
    items.push({ id: `store-${s.id}`, kind: "store", title: `Nouvelle boutique — ${s.name}`, detail: `/${s.slug}`, date: s.created_at });
  }
  for (const o of input.orders) {
    items.push({ id: `order-${o.id}`, kind: "order", title: `Nouvelle commande — ${o.order_number ?? "sans numéro"}`, detail: `${o.storeName} · ${o.customer_name || "client anonyme"}`, date: o.created_at });
  }
  return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}