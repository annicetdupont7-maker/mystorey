"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { cartLineKey, type CartItem } from "./whatsapp";
import type { ProductView } from "./storefront-types";
import type { ProductVariant } from "@/features/variants/types";
import { variantPrice } from "@/features/variants/types";

const storageKey = (slug: string) => `mystorey:cart:${slug}`;

/** Only well-formed lines survive a reload: storage is user-controlled. */
export function readStoredCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const line = item as Record<string, unknown>;
      const quantity = Number(line.quantity);
      if (typeof line.id !== "string" || typeof line.key !== "string" || typeof line.name !== "string" || typeof line.unitPrice !== "number") return [];
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) return [];
      return [{
        id: line.id, key: line.key, name: line.name, unitPrice: line.unitPrice, quantity,
        variantId: typeof line.variantId === "string" ? line.variantId : null,
        variantLabel: typeof line.variantLabel === "string" ? line.variantLabel : null,
      }];
    }).slice(0, 50);
  } catch {
    return [];
  }
}

/**
 * The storefront and the product page share one cart per shop. It used to live in
 * component state, so opening a product page from the shop — or coming back — silently
 * emptied it. It is now kept in the browser, per shop. Prices shown here are only a
 * preview: the server recomputes every total from the database at checkout.
 */
export function useCart(slug?: string) {
  const [items, setItems] = useState<CartItem[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    if (!slug) { loaded.current = true; return; }
    try {
      const stored = readStoredCart(window.localStorage.getItem(storageKey(slug)));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from storage once, after mount
      if (stored.length) setItems(stored);
    } catch { /* storage unavailable (private mode): the cart simply is not remembered */ }
    loaded.current = true;
  }, [slug]);

  useEffect(() => {
    if (!slug || !loaded.current) return;
    try {
      if (items.length) window.localStorage.setItem(storageKey(slug), JSON.stringify(items));
      else window.localStorage.removeItem(storageKey(slug));
    } catch { /* ignore */ }
  }, [items, slug]);

  const addItem = useCallback((product: ProductView, variant: ProductVariant | null = null, quantity = 1) => {
    const key = cartLineKey(product.id, variant?.id);
    setItems((prev) => {
      const found = prev.find((item) => item.key === key);
      if (found) return prev.map((item) => (item.key === key ? { ...item, quantity: Math.min(item.quantity + quantity, 999) } : item));
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
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, quantity: Math.min(item.quantity + delta, 999) } : item)).filter((item) => item.quantity > 0));
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return { items, addItem, changeQty, removeItem, clear, itemCount };
}
