"use client";
import { useCallback, useState } from "react";
import { cartLineKey, type CartItem } from "./whatsapp";
import type { ProductView } from "./storefront-types";
import type { ProductVariant } from "@/features/variants/types";
import { variantPrice } from "@/features/variants/types";

/**
 * The storefront and the product page each carried their own copy of this logic, keyed
 * on the product id — which merged two variants of the same product into one line.
 * One hook now owns it, keyed on the cart line.
 */
export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((product: ProductView, variant: ProductVariant | null = null, quantity = 1) => {
    const key = cartLineKey(product.id, variant?.id);
    setItems((prev) => {
      const found = prev.find((item) => item.key === key);
      if (found) return prev.map((item) => (item.key === key ? { ...item, quantity: item.quantity + quantity } : item));
      return [
        ...prev,
        {
          id: product.id,
          key,
          name: product.name,
          unitPrice: variantPrice(variant, product.unitPrice),
          quantity,
          variantId: variant?.id ?? null,
          variantLabel: variant?.label ?? null,
        },
      ];
    });
  }, []);

  const changeQty = useCallback((key: string, delta: number) => {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, quantity: item.quantity + delta } : item)).filter((item) => item.quantity > 0));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return { items, addItem, changeQty, clear, itemCount };
}
