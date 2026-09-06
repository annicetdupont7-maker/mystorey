import { describe, expect, it } from "vitest";
import { buildInsights, buildTodos, suggestFeatured } from "./index";
import { computeOrderOverview } from "@/features/orders/overview";
import type { OrderRow } from "@/features/orders/types";
import type { InsightContext, ProductForInsight } from "../types";

const product = (overrides: Partial<ProductForInsight> = {}): ProductForInsight => ({ id: "p1", name: "Robe noire", note: "", description: "Robe", price: 15000, image_url: "x.jpg", is_available: true, is_featured: false, created_at: "2026-08-01T00:00:00Z", ...overrides });
const order = (overrides: Partial<OrderRow> = {}): OrderRow => ({ id: "o", order_number: "VF-0001", customer_name: "Awa", customer_phone: "", customer_address: "", items: [], total: 0, status: "new", note: "", created_at: "2026-08-29T10:00:00Z", updated_at: "2026-08-29T10:00:00Z", ...overrides });

const ctx = (overrides: Partial<InsightContext> = {}): InsightContext => {
  const products = overrides.products ?? [product()];
  const orders = overrides.orders ?? [];
  return { storePublished: true, whatsappSet: true, products, orders, overview: computeOrderOverview(orders), ...overrides };
};

describe("insights", () => {
  it("guides a brand new seller", () => {
    const insights = buildInsights(ctx({ products: [], orders: [] }));
    expect(insights.map((i) => i.id)).toContain("no-products");
    expect(insights.map((i) => i.id)).toContain("no-data");
  });
  it("asks to publish and set whatsapp", () => {
    const insights = buildInsights(ctx({ storePublished: false, whatsappSet: false }));
    expect(insights.map((i) => i.id)).toEqual(expect.arrayContaining(["not-published", "no-whatsapp"]));
  });
  it("highlights pending orders", () => {
    const orders = [order({ id: "a", status: "new" }), order({ id: "b", status: "to_confirm" })];
    const insights = buildInsights(ctx({ orders }));
    const pending = insights.find((i) => i.id === "pending-orders");
    expect(pending?.title).toBe("2 commandes à traiter");
  });
  it("recognises the most ordered product", () => {
    const orders = [order({ id: "a", status: "delivered", items: [{ productId: "p1", name: "Robe noire", unitPrice: 15000, quantity: 2 }] })];
    const insights = buildInsights(ctx({ orders }));
    expect(insights.find((i) => i.id === "popular-product")?.title).toContain("Robe noire");
  });
  it("correctly types tones", () => {
    const insights = buildInsights(ctx({ orders: [order()] }));
    for (const i of insights) expect(["highlight", "warning", "positive", "opportunity", "quiet"]).toContain(i.tone);
  });
});

describe("todos", () => {
  it("asks to confirm pending orders", () => {
    const orders = [order({ id: "a", status: "new" })];
    const todos = buildTodos(ctx({ orders }));
    expect(todos.find((t) => t.id === "confirm-orders")?.label).toContain("1 commande");
  });
  it("asks for photos", () => {
    const products = [product({ id: "p1" }), product({ id: "p2", image_url: null })];
    const todos = buildTodos(ctx({ products }));
    expect(todos.find((t) => t.id === "add-photos")?.label).toContain("1 produit");
  });
  it("returns no fake tasks when everything is fine", () => {
    const todos = buildTodos(ctx());
    expect(todos.some((t) => t.cta === "Ajouter")).toBe(false);
    expect(todos.some((t) => t.urgent)).toBe(false);
  });
});

describe("featured suggestion", () => {
  it("picks the most ordered product", () => {
    const orders = [order({ id: "a", status: "delivered", total: 15000, items: [{ productId: "p1", name: "Robe noire", unitPrice: 15000, quantity: 1 }] })];
    const suggestion = suggestFeatured(ctx({ orders }));
    expect(suggestion?.product.name).toBe("Robe noire");
    expect(suggestion?.reason).toContain("commande");
  });
  it("returns null when nothing is available", () => {
    expect(suggestFeatured(ctx({ products: [product({ is_available: false })] }))).toBeNull();
  });
});