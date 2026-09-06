import { describe, expect, it } from "vitest";
import { priceSchema, productFormSchema } from "./schemas";
describe("priceSchema", () => {
  it("accepte un prix entier", () => { expect(priceSchema.parse("28000")).toBe(28000); });
  it("accepte zéro (produit gratuit)", () => { expect(priceSchema.parse("0")).toBe(0); });
  it("rejette un prix vide", () => { const r = productFormSchema.safeParse({ name: "Sac", price: "" }); expect(r.success).toBe(false); if (!r.success) expect(r.error.flatten().fieldErrors.price?.[0]).toBe("Le prix est requis."); });
  it("rejette les symboles et séparateurs", () => { expect(priceSchema.safeParse("28 000").success).toBe(false); expect(priceSchema.safeParse("28000F").success).toBe(false); });
});
describe("productFormSchema", () => {
  const base = { name: "Sac Studio", price: "19500", note: "Disponible", image: undefined as unknown };
  it("valide un produit complet", () => { const out = productFormSchema.parse(base); expect(out).toMatchObject({ name: "Sac Studio", price: 19500, isAvailable: false }); expect(out.note).toBe("Disponible"); expect(out.description).toBe(""); });
  it("détecte la case disponible cochée", () => { const out = productFormSchema.parse({ ...base, isAvailable: "on" }); expect(out.isAvailable).toBe(true); });
  it("détecte la case vedette cochée", () => { const out = productFormSchema.parse({ ...base, isFeatured: "on" }); expect(out.isFeatured).toBe(true); expect(out.isAvailable).toBe(false); });
  it("ne met pas un produit en avant par défaut", () => { expect(productFormSchema.parse(base).isFeatured).toBe(false); });
  it("accepte une case absente rendue null par le navigateur", () => { expect(productFormSchema.parse({ ...base, isAvailable: null }).isAvailable).toBe(false); });
  it("rend un produit indisponible si la case est absente", () => { expect(productFormSchema.parse(base).isAvailable).toBe(false); });
  it("rejette un nom vide", () => { const r = productFormSchema.safeParse({ ...base, name: "" }); expect(r.success).toBe(false); if (!r.success) expect(r.error.flatten().fieldErrors.name).toBeDefined(); });
  it("tronque silencieusement les espaces de la note", () => { expect(productFormSchema.parse({ ...base, note: "  Édition limitée  " }).note).toBe("Édition limitée"); });
});