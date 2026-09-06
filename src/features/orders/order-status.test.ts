import { describe, expect, it } from "vitest";
import { isActiveStatus, isOrderFilter, isPendingStatus, isTerminalStatus, isValidTransition, nextOrderStatus, ORDER_FILTERS, ORDER_STATUSES, quickActionFor } from "./order-status";
import { computeOrderTotal, isOrderStatus, orderFormSchema } from "./schemas";
import { computeOrderOverview, countOrdersByProduct } from "./overview";
import type { OrderRow } from "./types";

const makeOrder = (overrides: Partial<OrderRow>): OrderRow => ({
  id: "o1", order_number: "VF-0001", customer_name: "Awa", customer_phone: "+225 07 00 00 00", customer_address: "", items: [], total: 0,
  status: "new", note: "", created_at: "2026-08-29T10:00:00Z", updated_at: "2026-08-29T10:00:00Z", ...overrides,
});

describe("order statuses", () => {
  it("exposes seven statuses", () => expect(ORDER_STATUSES).toHaveLength(7));
  it("moves from new to confirmed", () => {
    expect(nextOrderStatus("new")).toBe("to_confirm");
    expect(nextOrderStatus("confirmed")).toBe("preparing");
  });
  it("terminal statuses have no next step", () => {
    expect(nextOrderStatus("delivered")).toBeNull();
    expect(nextOrderStatus("cancelled")).toBeNull();
    expect(isTerminalStatus("cancelled")).toBe(true);
    expect(isActiveStatus("confirmed")).toBe(true);
    expect(isActiveStatus("delivered")).toBe(false);
  });
  it("validates a status", () => {
    expect(isOrderStatus("preparing")).toBe(true);
    expect(isOrderStatus("hacked")).toBe(false);
  });
  it("it moves new straight to confirmed for the seller", () => {
    expect(isValidTransition("new", "confirmed")).toBe(true);
  });
  it("enforces the forward progression and cancellation", () => {
    expect(isValidTransition("confirmed", "preparing")).toBe(true);
    expect(isValidTransition("preparing", "shipped")).toBe(true);
    expect(isValidTransition("shipped", "delivered")).toBe(true);
    expect(isValidTransition("new", "preparing")).toBe(false);
    expect(isValidTransition("confirmed", "confirmed")).toBe(false);
    expect(isValidTransition("new", "cancelled")).toBe(true);
    expect(isValidTransition("delivered", "cancelled")).toBe(false);
    expect(isValidTransition("cancelled", "confirmed")).toBe(false);
  });
  it("proposes the next obvious action to the seller", () => {
    expect(quickActionFor("new")).toEqual({ to: "confirmed", label: "Confirmer la commande" });
    expect(quickActionFor("to_confirm")?.to).toBe("confirmed");
    expect(quickActionFor("confirmed")?.to).toBe("preparing");
    expect(quickActionFor("preparing")?.to).toBe("shipped");
    expect(quickActionFor("shipped")?.to).toBe("delivered");
    expect(quickActionFor("delivered")).toBeNull();
    expect(quickActionFor("cancelled")).toBeNull();
  });
  it("exposes pending group and filters", () => {
    expect(isPendingStatus("new")).toBe(true);
    expect(isPendingStatus("to_confirm")).toBe(true);
    expect(isPendingStatus("confirmed")).toBe(false);
    expect(isOrderFilter("pending")).toBe(true);
    expect(isOrderFilter("confirmed")).toBe(true);
    expect(isOrderFilter("hacked")).toBe(false);
    expect(ORDER_FILTERS.map((f) => f.value)).toContain("all");
  });
});

describe("order schemas", () => {
  it("accepts a valid command form", () => {
    const out = orderFormSchema.safeParse({ customerName: "Awa", customerPhone: "+225 07000000", note: "Livrer le soir", lines: [{ productId: "p1", quantity: 2 }] });
    expect(out.success).toBe(true);
    if (out.success) { expect(out.data.customerAddress).toBe(""); expect(out.data.note).toBe("Livrer le soir"); }
  });
  it("saves the delivery address", () => {
    const out = orderFormSchema.safeParse({ customerName: "Awa", customerAddress: "Abomey-Calavi, quartier Akassato", lines: [{ productId: "p1", quantity: 1 }] });
    expect(out.success).toBe(true);
    if (out.success) expect(out.data.customerAddress).toBe("Abomey-Calavi, quartier Akassato");
  });
  it("rejects an address longer than 250 characters", () => {
    const out = orderFormSchema.safeParse({ customerName: "Awa", customerAddress: "x".repeat(251), lines: [{ productId: "p1", quantity: 1 }] });
    expect(out.success).toBe(false);
  });
  it("rejects an empty order", () => {
    const out = orderFormSchema.safeParse({ customerName: "Awa", lines: [] });
    expect(out.success).toBe(false);
  });
  it("rejects a missing customer", () => {
    const out = orderFormSchema.safeParse({ customerName: "", lines: [{ productId: "p1", quantity: 1 }] });
    expect(out.success).toBe(false);
  });
  it("computes a total", () => expect(computeOrderTotal([{ productId: "p1", name: "Robe", unitPrice: 15000, quantity: 3 }])).toBe(45000));
});

describe("order overview", () => {
  const now = new Date("2026-08-29T14:00:00Z");
  it("counts revenue without cancelled orders", () => {
    const orders = [
      makeOrder({ id: "a", status: "delivered", total: 5000, created_at: "2026-08-28T10:00:00Z" }),
      makeOrder({ id: "b", status: "cancelled", total: 9999, created_at: "2026-08-28T11:00:00Z" }),
    ];
    const overview = computeOrderOverview(orders, now);
    expect(overview.totalRevenue).toBe(5000);
    expect(overview.totalOrders).toBe(2);
    expect(overview.byStatus.delivered).toBe(1);
  });
  it("flags pending and active orders", () => {
    const overview = computeOrderOverview([
      makeOrder({ id: "a", status: "new" }),
      makeOrder({ id: "b", status: "to_confirm" }),
      makeOrder({ id: "c", status: "delivered", total: 5000 }),
    ], now);
    expect(overview.pendingCount).toBe(2);
    expect(overview.activeCount).toBe(2);
  });
  it("computes weekly evolution", () => {
    const last = new Date("2026-08-26T10:00:00Z");
    const prev = new Date("2026-08-15T10:00:00Z");
    const overview = computeOrderOverview([makeOrder({ id: "a", created_at: last.toISOString() }), makeOrder({ id: "b", created_at: prev.toISOString() })], now);
    expect(overview.lastWeekCount).toBe(1);
    expect(overview.previousWeekCount).toBe(1);
  });
  it("aggregates product order stats", () => {
    const stats = countOrdersByProduct([
      makeOrder({ id: "a", status: "delivered", items: [{ productId: "p1", name: "Robe", unitPrice: 15000, quantity: 2 }] }),
      makeOrder({ id: "b", status: "delivered", items: [{ productId: "p1", name: "Robe", unitPrice: 15000, quantity: 1 }] }),
      makeOrder({ id: "c", status: "cancelled", items: [{ productId: "p1", name: "Robe", unitPrice: 15000, quantity: 10 }] }),
    ]);
    expect(stats).toHaveLength(1);
    expect(stats[0]).toMatchObject({ productId: "p1", orders: 2, quantity: 3, revenue: 45000 });
  });
});