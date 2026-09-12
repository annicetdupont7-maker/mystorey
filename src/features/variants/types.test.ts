import { describe, expect, it } from "vitest";
import {
  availableStock,
  optionGroupLabel,
  requiresVariantChoice,
  sellableVariants,
  toVariant,
  variantIsSoldOut,
  variantPrice,
  type ProductVariant,
} from "./types";

const variant = (overrides: Partial<ProductVariant> = {}): ProductVariant => ({
  id: "v1",
  optionGroup: "Couleur",
  label: "Rouge",
  price: null,
  stock: null,
  imageUrl: null,
  position: 0,
  isActive: true,
  ...overrides,
});

describe("variant rows", () => {
  it("falls back to the default group when the column is blank", () => {
    const out = toVariant({ id: "v", option_group: "  ", label: "Rouge", price: null, stock: null, image_url: null, position: null, is_active: null });
    expect(out.optionGroup).toBe("Couleur");
    expect(out.isActive).toBe(true);
    expect(out.position).toBe(0);
  });
});

describe("sellable variants", () => {
  it("drops inactive variants and orders by position then label", () => {
    const list = sellableVariants([
      variant({ id: "c", label: "Bleu", position: 1 }),
      variant({ id: "a", label: "Noir", position: 0 }),
      variant({ id: "b", label: "Vert", isActive: false }),
    ]);
    expect(list.map((v) => v.id)).toEqual(["a", "c"]);
  });
});

describe("stock", () => {
  it("treats a null variant stock as the product's", () => {
    expect(availableStock(variant({ stock: null }), 4)).toBe(4);
    expect(availableStock(variant({ stock: 2 }), 4)).toBe(2);
  });

  it("is never sold out when nothing tracks stock", () => {
    expect(variantIsSoldOut(variant({ stock: null }), null)).toBe(false);
  });

  it("is sold out at zero, on the variant or inherited from the product", () => {
    expect(variantIsSoldOut(variant({ stock: 0 }), 10)).toBe(true);
    expect(variantIsSoldOut(variant({ stock: null }), 0)).toBe(true);
  });
});

describe("price", () => {
  it("uses the variant price when set, the product price otherwise", () => {
    expect(variantPrice(variant({ price: 30000 }), 25000)).toBe(30000);
    expect(variantPrice(variant({ price: null }), 25000)).toBe(25000);
    expect(variantPrice(null, 25000)).toBe(25000);
  });

  it("keeps an explicit zero price instead of falling back", () => {
    expect(variantPrice(variant({ price: 0 }), 25000)).toBe(0);
  });
});

describe("choice requirement", () => {
  it("does not force a choice on a product without variants", () => {
    expect(requiresVariantChoice([], null)).toBe(false);
  });

  it("forces a choice when at least one variant can be bought", () => {
    expect(requiresVariantChoice([variant({ stock: 0 }), variant({ id: "v2", label: "Noir", stock: 3 })], null)).toBe(true);
  });

  it("does not lock the customer out when every variant is sold out", () => {
    expect(requiresVariantChoice([variant({ stock: 0 }), variant({ id: "v2", label: "Noir", stock: 0 })], null)).toBe(false);
  });

  it("ignores inactive variants entirely", () => {
    expect(requiresVariantChoice([variant({ isActive: false })], null)).toBe(false);
  });
});

describe("group label", () => {
  it("uses the group the seller named", () => {
    expect(optionGroupLabel([variant({ optionGroup: "Taille" })])).toBe("Taille");
    expect(optionGroupLabel([])).toBe("Couleur");
  });
});
