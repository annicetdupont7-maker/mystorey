import { describe, expect, it } from "vitest";
import { computeOrderOverview } from "./overview";
import type { OrderRow } from "./types";

const order = (overrides: Partial<OrderRow> = {}): OrderRow => ({
  id: "o",
  order_number: "VF-0001",
  customer_name: "Awa",
  customer_phone: "",
  customer_address: "",
  items: [],
  total: 0,
  status: "new",
  note: "",
  created_at: "2026-09-10T10:00:00Z",
  updated_at: "2026-09-10T10:00:00Z",
  ...overrides,
});

describe("pending revenue", () => {
  it("adds up what the unconfirmed orders are worth", () => {
    const overview = computeOrderOverview([
      order({ id: "a", status: "new", total: 12000 }),
      order({ id: "b", status: "to_confirm", total: 8000 }),
      order({ id: "c", status: "delivered", total: 50000 }),
      order({ id: "d", status: "cancelled", total: 9000 }),
    ]);
    expect(overview.pendingCount).toBe(2);
    expect(overview.pendingRevenue).toBe(20000);
  });

  it("counts delivered orders as revenue and never as pending", () => {
    const overview = computeOrderOverview([order({ status: "delivered", total: 50000 })]);
    expect(overview.totalRevenue).toBe(50000);
    expect(overview.pendingRevenue).toBe(0);
  });

  it("is zero without orders", () => {
    const overview = computeOrderOverview([]);
    expect(overview.pendingRevenue).toBe(0);
    expect(overview.totalRevenue).toBe(0);
  });
});
