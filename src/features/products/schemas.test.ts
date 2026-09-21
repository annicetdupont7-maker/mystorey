import { describe, expect, it } from "vitest";
import { parsePhotoOrder, priceSchema, productFormSchema, stockFieldSchema } from "./schemas";
import { scaleToFit } from "./image-compress";
describe("priceSchema", () => {
  it("accepte un prix entier", () => { expect(priceSchema.parse("28000")).toBe(28000); });
  it("refuse zéro : un produit à 0 FCFA est un prix oublié", () => {
    const r = priceSchema.safeParse("0");
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("Indiquez un prix supérieur à 0.");
  });
  it("rejette un prix vide", () => { const r = productFormSchema.safeParse({ name: "Sac", price: "" }); expect(r.success).toBe(false); if (!r.success) expect(r.error.flatten().fieldErrors.price?.[0]).toBe("Le prix est requis."); });
  it("accepte les prix écrits comme sur un téléphone", () => {
    expect(priceSchema.parse("28 000")).toBe(28000);
    expect(priceSchema.parse("28.000")).toBe(28000);
    expect(priceSchema.parse("28 000 FCFA")).toBe(28000);
    expect(priceSchema.parse("28000F")).toBe(28000);
  });
  it("rejette les lettres et les nombres négatifs", () => {
    expect(priceSchema.safeParse("vingt").success).toBe(false);
    expect(priceSchema.safeParse("-500").success).toBe(false);
  });
});
describe("productFormSchema", () => {
  const base = { name: "Sac Studio", price: "19500", note: "Disponible", image: undefined as unknown };
  it("valide un produit complet", () => { const out = productFormSchema.parse(base); expect(out).toMatchObject({ name: "Sac Studio", price: 19500, isAvailable: false }); expect(out.note).toBe("Disponible"); expect(out.description).toBe(""); });
  it("détecte la case disponible cochée", () => { const out = productFormSchema.parse({ ...base, isAvailable: "on" }); expect(out.isAvailable).toBe(true); });
  it("détecte la case vedette cochée", () => { const out = productFormSchema.parse({ ...base, isFeatured: "on" }); expect(out.isFeatured).toBe(true); expect(out.isAvailable).toBe(false); });
  it("ne met pas un produit en avant par défaut", () => { expect(productFormSchema.parse(base).isFeatured).toBe(false); });
  it("accepte une case absente rendue null par le navigateur", () => { expect(productFormSchema.parse({ ...base, isAvailable: null }).isAvailable).toBe(false); });
  it("rend un produit indisponible si la case est absente", () => { expect(productFormSchema.parse(base).isAvailable).toBe(false); });
  it("rejette un nom vide avec un message clair", () => { const r = productFormSchema.safeParse({ ...base, name: "" }); expect(r.success).toBe(false); if (!r.success) expect(r.error.flatten().fieldErrors.name?.[0]).toBe("Donnez un nom à votre produit."); });
  it("tronque silencieusement les espaces de la note", () => { expect(productFormSchema.parse({ ...base, note: "  Édition limitée  " }).note).toBe("Édition limitée"); });
});
describe("stockFieldSchema", () => {
  it("vide = stock non suivi", () => { expect(stockFieldSchema.parse("")).toBeNull(); expect(stockFieldSchema.parse(undefined)).toBeNull(); });
  it("accepte un entier, zéro compris", () => { expect(stockFieldSchema.parse("12")).toBe(12); expect(stockFieldSchema.parse("0")).toBe(0); });
  it("refuse les décimales et le texte", () => { expect(stockFieldSchema.safeParse("1.5").success).toBe(false); expect(stockFieldSchema.safeParse("beaucoup").success).toBe(false); });
});
describe("parsePhotoOrder", () => {
  it("lit l'ordre choisi par la vendeuse", () => {
    expect(parsePhotoOrder(JSON.stringify(["new:1", "existing:u/p/a.webp", "legacy", "new:0"]))).toEqual([
      { kind: "new", index: 1 }, { kind: "existing", path: "u/p/a.webp" }, { kind: "legacy" }, { kind: "new", index: 0 },
    ]);
  });
  it("ignore les entrées inconnues et refuse un JSON cassé", () => {
    expect(parsePhotoOrder(JSON.stringify(["hack", 3, "new:abc"]))).toEqual([]);
    expect(parsePhotoOrder("{oops")).toBeNull();
    expect(parsePhotoOrder(null)).toBeNull();
  });
});
describe("scaleToFit", () => {
  it("réduit une photo de téléphone en gardant les proportions", () => { expect(scaleToFit(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 }); });
  it("n'agrandit jamais une petite image", () => { expect(scaleToFit(800, 600, 1600)).toEqual({ width: 800, height: 600 }); });
  it("gère les photos verticales", () => { expect(scaleToFit(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 }); });
});
