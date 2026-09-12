import { PENDING_STATUSES, isActiveStatus, type OrderStatus } from "./order-status";
import type { OrderRow, ProductOrderStats } from "./types";

export type OrderOverview = {
  totalOrders: number;
  totalRevenue: number;
  pendingCount: number;
  /** What the unconfirmed orders are worth: the amount a follow-up could still recover. */
  pendingRevenue: number;
  activeCount: number;
  byStatus: Record<OrderStatus, number>;
  lastWeekCount: number;
  previousWeekCount: number;
  weekendShare: number | null;
  firstOrderAt: string | null;
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export function computeOrderOverview(orders: OrderRow[], now: Date = new Date()): OrderOverview {
  const byStatus = Object.fromEntries(PENDING_STATUSES.concat(["confirmed", "preparing", "shipped", "delivered", "cancelled"]).map((s) => [s, 0])) as Record<OrderStatus, number>;
  let totalRevenue = 0;
  let totalOrders = 0;
  let activeCount = 0;
  let pendingCount = 0;
  let pendingRevenue = 0;
  let weekendOrders = 0;
  let datedOrders = 0;
  let firstOrderAt: string | null = null;

  const todayStart = startOfDay(now);
  const lastWeekStart = todayStart - 7 * 86_400_000;
  const prevWeekStart = todayStart - 14 * 86_400_000;
  let lastWeekCount = 0;
  let previousWeekCount = 0;

  for (const order of orders) {
    const created = new Date(order.created_at);
    byStatus[order.status] += 1;
    totalOrders += 1;
    if (order.status === "delivered") totalRevenue += order.total;
    if (isActiveStatus(order.status)) activeCount += 1;
    if (PENDING_STATUSES.includes(order.status)) { pendingCount += 1; pendingRevenue += order.total; }
    if (created.getDay() === 0 || created.getDay() === 6) weekendOrders += 1;
    datedOrders += 1;
    if (!firstOrderAt || created.getTime() < new Date(firstOrderAt).getTime()) firstOrderAt = order.created_at;
    const time = created.getTime();
    if (time >= lastWeekStart && time < todayStart) lastWeekCount += 1;
    if (time >= prevWeekStart && time < lastWeekStart) previousWeekCount += 1;
  }

  return {
    totalOrders,
    totalRevenue,
    pendingCount,
    pendingRevenue,
    activeCount,
    byStatus,
    lastWeekCount,
    previousWeekCount,
    weekendShare: datedOrders >= 8 ? weekendOrders / datedOrders : null,
    firstOrderAt,
  };
}

export function countOrdersByProduct(orders: OrderRow[]): ProductOrderStats[] {
  const map = new Map<string, ProductOrderStats>();
  for (const order of orders) {
    if (order.status !== "delivered") continue;
    for (const item of order.items) {
      const current = map.get(item.productId) ?? { productId: item.productId, orders: 0, quantity: 0, revenue: 0 };
      current.orders += 1;
      current.quantity += item.quantity;
      current.revenue += item.unitPrice * item.quantity;
      map.set(item.productId, current);
    }
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}