/**
 * A variant is one buyable choice of a product: "Robe Boro" in Noir, Rouge, Bleu, Vert.
 * The seller creates one product and four variants instead of four products.
 *
 * Deliberately ONE option group per product (the seller names it: Couleur, Taille,
 * Volume…) and a single selection. A colour x size matrix would double the interface
 * for a fraction of the sellers; a seller who needs it labels her variants
 * "Rouge — M", "Rouge — L". The column allows more groups later without a migration.
 */
export type ProductVariant = {
  id: string;
  optionGroup: string;
  label: string;
  /** null = inherits the product price. */
  price: number | null;
  /** null = stock not tracked for this variant (falls back to the product's). */
  stock: number | null;
  imageUrl: string | null;
  position: number;
  isActive: boolean;
};

export type VariantRow = {
  id: string;
  option_group: string | null;
  label: string;
  price: number | null;
  stock: number | null;
  image_url: string | null;
  position: number | null;
  is_active: boolean | null;
};

export const DEFAULT_OPTION_GROUP = "Couleur";

export function toVariant(row: VariantRow): ProductVariant {
  return {
    id: row.id,
    optionGroup: row.option_group?.trim() || DEFAULT_OPTION_GROUP,
    label: row.label,
    price: row.price ?? null,
    stock: row.stock ?? null,
    imageUrl: row.image_url ?? null,
    position: row.position ?? 0,
    isActive: row.is_active ?? true,
  };
}

/** Variants a customer may pick: active, and not sold out when stock is tracked. */
export function sellableVariants(variants: ProductVariant[]): ProductVariant[] {
  return variants
    .filter((variant) => variant.isActive)
    .sort((a, b) => a.position - b.position || a.label.localeCompare(b.label, "fr"));
}

export function variantIsSoldOut(variant: ProductVariant, productStock: number | null): boolean {
  const stock = variant.stock ?? productStock;
  return stock !== null && stock <= 0;
}

/** The label shown above the chips. Uses the group the seller named. */
export function optionGroupLabel(variants: ProductVariant[]): string {
  return variants[0]?.optionGroup || DEFAULT_OPTION_GROUP;
}

/** Price of the selected choice: the variant's own price, else the product's. */
export function variantPrice(variant: ProductVariant | null, productPrice: number): number {
  return variant?.price ?? productPrice;
}

/**
 * Does this product force a choice before it can be added to the cart? Only when at
 * least one variant is actually buyable — otherwise the customer would be stuck.
 */
export function requiresVariantChoice(variants: ProductVariant[], productStock: number | null): boolean {
  const usable = sellableVariants(variants);
  return usable.length > 0 && usable.some((variant) => !variantIsSoldOut(variant, productStock));
}

export function availableStock(variant: ProductVariant | null, productStock: number | null): number | null {
  const stock = variant ? variant.stock ?? productStock : productStock;
  return stock;
}
