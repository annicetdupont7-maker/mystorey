import { describe, expect, it } from "vitest";
import { buildActivityFeed, computeAdminStats, filterOrders, filterProducts, filterStores, filterUsers, formatDate, formatFCFA, paginate } from "./stats";
import type { AdminOrderRow, AdminProductRow, AdminStoreRow, AdminUserRow } from "./types";

const user = (overrides: Partial<AdminUserRow> = {}): AdminUserRow => ({
  id: "u1", email: "awa@example.com", phone: null, name: "Awa", role: "seller", roleSet: true,
  created_at: "2026-08-29T10:00:00Z", banned: false, active: true, stores: 1, ...overrides,
});

const store = (overrides: Partial<AdminStoreRow> = {}): AdminStoreRow => ({
  id: "s1", owner_id: "u1", ownerName: "Awa", name: "Princesse fashion", slug: "princesse-fashion",
  status: "published", created_at: "2026-08-29T10:00:00Z", whatsapp: "+22900000000", products: 2, orders: 3, ...overrides,
});

const product = (overrides: Partial<AdminProductRow> = {}): AdminProductRow => ({
  id: "p1", store_id: "s1", storeName: "Princesse fashion", storeSlug: "princesse-fashion", ownerName: "Awa",
  name: "Ma Bible", note: "", price: 15000, is_available: true, is_featured: false,
  created_at: "2026-08-29T10:00:00Z", image_url: null, ...overrides,
});

const order = (overrides: Partial<AdminOrderRow> = {}): AdminOrderRow => ({
  id: "o1", store_id: "s1", storeName: "Princesse fashion", storeSlug: "princesse-fashion", ownerName: "Awa", order_number: "VF-0001",
  customer_name: "Sarah", customer_phone: "", customer_address: "", total: 25000, status: "new",
  note: "", created_at: "2026-08-29T10:00:00Z", items: [], ...overrides,
});

describe("computeAdminStats", () => {
  it("compte sans chiffres fictifs et ne retient que les commandes livrées", () => {
    const stats = computeAdminStats({
      profiles: [{ role: "admin" }, { role: "seller" }, { role: "seller" }, { role: null }],
      stores: [{ status: "published" }, { status: "draft" }],
      productsCount: 4,
      orders: [
        { status: "new", total: 10000 },
        { status: "delivered", total: 20000 },
        { status: "cancelled", total: 50000 },
      ],
    });
    expect(stats).toEqual({ users: 4, sellers: 2, admins: 1, stores: 2, storesPublished: 1, storesDraft: 1, products: 4, orders: 3, ordersPending: 1, revenue: 20000 });
  });
  it("renvoie proprement 0 sur une base vide", () => {
    const stats = computeAdminStats({ profiles: [], stores: [], orders: [], productsCount: 0 });
    expect(stats).toEqual({ users: 0, sellers: 0, admins: 0, stores: 0, storesPublished: 0, storesDraft: 0, products: 0, orders: 0, ordersPending: 0, revenue: 0 });
  });
});

describe("filterUsers", () => {
  it("recherche par nom, email et id partiel", () => {
    const users = [user({ name: "Awa", email: "awa@x.com" }), user({ id: "abc123", name: "Noriane", email: "n@x.com" })];
    expect(filterUsers(users, "awa", "all")).toHaveLength(1);
    expect(filterUsers(users, "norian", "all")).toHaveLength(1);
    expect(filterUsers(users, "abc", "all")).toHaveLength(1);
    expect(filterUsers(users, "zzz", "all")).toHaveLength(0);
  });
  it("filtre par rôle", () => {
    const users = [user({ role: "admin" }), user({ id: "u2", role: "seller" }), user({ id: "u3", role: null })];
    expect(filterUsers(users, "", "admin")).toHaveLength(1);
    expect(filterUsers(users, "", "seller")).toHaveLength(1);
    expect(filterUsers(users, "", "all")).toHaveLength(3);
  });
});

describe("filterStores / filterProducts / filterOrders", () => {
  it("filtre les boutiques par statut et par nom/slug/vendeur", () => {
    const stores = [store({ name: "Princesse fashion", slug: "princesse-fashion", ownerName: "Awa" }), store({ id: "s2", name: "BY noreem", slug: "by-noreem", ownerName: "Noriane", status: "draft" })];
    expect(filterStores(stores, "princesse", "all")).toHaveLength(1);
    expect(filterStores(stores, "noreem", "all")).toHaveLength(1);
    expect(filterStores(stores, "awa", "all")).toHaveLength(1);
    expect(filterStores(stores, "", "draft")).toHaveLength(1);
  });
  it("filtre les produits par disponibilité et vedette", () => {
    const products = [
      product({ name: "Ma Bible", is_available: false }),
      product({ id: "p2", name: "Sac", is_available: true, is_featured: true }),
    ];
    expect(filterProducts(products, "", "all", false)).toHaveLength(2);
    expect(filterProducts(products, "", "available", false)).toHaveLength(1);
    expect(filterProducts(products, "", "unavailable", false)).toHaveLength(1);
    expect(filterProducts(products, "", "all", true)).toHaveLength(1);
    expect(filterProducts(products, "sac", "all", false)).toHaveLength(1);
  });
  it("filtre les commandes par statut", () => {
    const orders = [order({ status: "new" }), order({ id: "o2", status: "delivered" })];
    expect(filterOrders(orders, "all")).toHaveLength(2);
    expect(filterOrders(orders, "delivered")).toHaveLength(1);
    expect(filterOrders(orders, "cancelled")).toHaveLength(0);
  });
});

describe("paginate", () => {
  it("découpe les pages et borne la page demandée", () => {
    const items = Array.from({ length: 45 }, (_, i) => i);
    expect(paginate(items, 1).items).toHaveLength(20);
    expect(paginate(items, 3).items).toHaveLength(5);
    expect(paginate(items, 99).page).toBe(3);
    expect(paginate(items, 3).pages).toBe(3);
    expect(paginate([], 1).total).toBe(0);
    expect(paginate([], 1).pages).toBe(1);
  });
});

describe("buildActivityFeed", () => {
  it("fusionne comptes, boutiques et commandes triés par date décroissante", () => {
    const feed = buildActivityFeed({
      profiles: [{ id: "p", name: "Awa", email: "awa@x.com", created_at: "2026-08-29T10:00:00Z" }],
      stores: [{ id: "s", name: "Princesse fashion", slug: "p-f", created_at: "2026-08-30T10:00:00Z" }],
      orders: [{ id: "o", order_number: "VF-0001", customer_name: "Sarah", storeName: "Princesse fashion", created_at: "2026-08-31T10:00:00Z" }],
    });
    expect(feed.map((i) => i.kind)).toEqual(["order", "store", "user"]);
    expect(feed[0].title).toContain("VF-0001");
    expect(feed[1].title).toContain("Princesse fashion");
  });
});

describe("format", () => {
  it("formate les montants en FCFA", () => {
    expect(formatFCFA(0)).toContain("CFA");
    expect(formatFCFA(15000)).toContain("15");
  });
  it("ne casse pas sur une date absente ou invalide", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("nope")).toBe("—");
    expect(formatDate("2026-08-30T10:00:00Z")).toContain("2026");
  });
});