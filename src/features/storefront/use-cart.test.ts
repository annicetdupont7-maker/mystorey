import { describe, expect, it } from "vitest";
import { readStoredCart } from "./use-cart";

describe("readStoredCart", () => {
  it("relit un panier enregistré", () => {
    const raw = JSON.stringify([{ id: "p1", key: "p1:v1", name: "Robe", unitPrice: 15000, quantity: 2, variantId: "v1", variantLabel: "Rouge" }]);
    expect(readStoredCart(raw)).toEqual([{ id: "p1", key: "p1:v1", name: "Robe", unitPrice: 15000, quantity: 2, variantId: "v1", variantLabel: "Rouge" }]);
  });
  it("ignore les lignes abîmées ou trafiquées", () => {
    const raw = JSON.stringify([{ id: "p1", key: "p1", name: "Robe", unitPrice: 15000, quantity: -3 }, { id: 4 }, "x", { id: "p2", key: "p2", name: "Sac", unitPrice: 9000, quantity: 1.5 }]);
    expect(readStoredCart(raw)).toEqual([]);
  });
  it("résiste à un stockage vide ou corrompu", () => {
    expect(readStoredCart(null)).toEqual([]);
    expect(readStoredCart("{pas du json")).toEqual([]);
    expect(readStoredCart(JSON.stringify({ a: 1 }))).toEqual([]);
  });
});
