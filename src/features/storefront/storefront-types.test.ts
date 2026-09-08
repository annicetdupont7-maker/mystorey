import { describe, expect, it } from "vitest";
import { formatPrice, toProductView } from "./storefront-types";
describe("formatPrice", () => {
  it("formate en FCFA avec séparateur de milliers", () => { expect(formatPrice(28000)).toBe(`28\u202F000 FCFA`); });
  it("affiche zéro sans décimale", () => { expect(formatPrice(0)).toBe("0 FCFA"); });
});
describe("toProductView", () => {
  it("mappe une ligne produit vers la vue vitrine", () => {
    const row = { id: "p1", name: "Sac Studio", note: "Disponible", price: 19500, image_url: "https://x/y.webp" };
    expect(toProductView(row)).toEqual({ id: "p1", name: "Sac Studio", price: `19\u202F500 FCFA`, note: "Disponible", description: "", image: "https://x/y.webp", images: ["https://x/y.webp"], unitPrice: 19500, featured: false, available: true, categoryId: null });
  });
  it("gère une note et une image absentes", () => {
    const row = { id: "p1", name: "Sac Studio", note: null, price: 19500, image_url: null };
    expect(toProductView(row)).toMatchObject({ note: "", image: null, featured: false });
  });
  it("reporte le statut vedette", () => {
    const row = { id: "p1", name: "Sac Studio", note: null, price: 19500, image_url: null, is_featured: true };
    expect(toProductView(row).featured).toBe(true);
  });
  it("reporte la disponibilité", () => {
    const row = { id: "p1", name: "Sac Studio", note: null, price: 19500, image_url: null, is_available: false };
    expect(toProductView(row).available).toBe(false);
  });
  it("reporte la catégorie du produit", () => {
    const row = { id: "p1", name: "Sac Studio", note: null, price: 19500, image_url: null, category_id: "cat-1" };
    expect(toProductView(row).categoryId).toBe("cat-1");
  });
});