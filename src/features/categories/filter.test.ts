import { describe, expect, it } from "vitest";
import { ALL_CATEGORIES, categoriesWithProducts, filterProductsByCategory } from "./filter";

const products = [
  { id: "1", categoryId: "vetements" },
  { id: "2", categoryId: "chaussures" },
  { id: "3", categoryId: "vetements" },
  { id: "4", categoryId: null },
];

describe("filterProductsByCategory", () => {
  it("renvoie tous les produits disponibles pour Tous", () => {
    expect(filterProductsByCategory(products, ALL_CATEGORIES)).toHaveLength(4);
  });
  it("renvoie tous les produits sans catégorie quand le filtre est vide", () => {
    expect(filterProductsByCategory(products, null)).toHaveLength(4);
  });
  it("filtre uniquement les produits de la catégorie choisie", () => {
    const result = filterProductsByCategory(products, "chaussures");
    expect(result.map((p) => p.id)).toEqual(["2"]);
  });
  it("ne garde rien pour une catégorie sans produit", () => {
    expect(filterProductsByCategory(products, "inconnue")).toHaveLength(0);
  });
});

describe("categoriesWithProducts", () => {
  const categories = [
    { id: "vetements", name: "Vêtements" },
    { id: "chaussures", name: "Chaussures" },
    { id: "accessoires", name: "Accessoires" },
  ];
  it("cache les catégories sans produit disponible", () => {
    expect(categoriesWithProducts(categories, products).map((c) => c.id)).toEqual(["vetements", "chaussures"]);
  });
  it("ne cache rien quand toutes les catégories ont des produits", () => {
    const full = [
      { id: "a", categoryId: "vetements" },
      { id: "b", categoryId: "chaussures" },
      { id: "c", categoryId: "accessoires" },
    ];
    expect(categoriesWithProducts(categories, full)).toHaveLength(3);
  });
});