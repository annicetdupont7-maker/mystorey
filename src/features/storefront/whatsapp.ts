import { formatPrice } from "./storefront-types";
/**
 * `id` stays the product id (the checkout payload needs it). `key` identifies the cart
 * LINE, so "Robe Boro — Rouge" and "Robe Boro — Bleu" are two lines rather than one
 * quantity of two. Products without variants keep a key equal to their product id.
 */
export type CartItem = { id: string; key: string; name: string; unitPrice: number; quantity: number; variantId?: string | null; variantLabel?: string | null };

export function cartLineKey(productId: string, variantId?: string | null): string {
  return variantId ? `${productId}:${variantId}` : productId;
}

/** What the customer reads in the cart and in the WhatsApp message. */
export function cartLineName(item: Pick<CartItem, "name" | "variantLabel">): string {
  return item.variantLabel ? `${item.name} — ${item.variantLabel}` : item.name;
}
export function normalizeWhatsAppNumber(raw: string): string { return raw.replace(/\D/g, ""); }
export function buildOrderMessage(items: CartItem[], storeName: string): string {
  if (items.length === 0) return "";
  const rows = items.map((item) => `• ${cartLineName(item)} : ${item.quantity} × ${formatPrice(item.unitPrice)} = ${formatPrice(item.unitPrice * item.quantity)}`).join("\n");
  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  return `Bonjour ${storeName} 👋\n\nJe souhaite commander :\n${rows}\n\nTotal : ${formatPrice(total)}\n\nMerci ! (via MYSTOREY)`;
}
export function buildWhatsAppOrderDraft(items: CartItem[], storeName: string): string {
  if (items.length === 0) return "";
  const rows = items.map((item) => `- ${cartLineName(item)} × ${item.quantity} : ${formatPrice(item.unitPrice * item.quantity)}`).join("\n");
  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  return `Bonjour, je souhaite commander auprès de ${storeName}.\n\nMa commande :\n${rows}\n\nTotal estimé : ${formatPrice(total)}\n\nNom :\nTéléphone :\nAdresse ou lieu de livraison :\nInformations complémentaires :`;
}
export function buildWhatsAppLink(whatsapp: string, message: string): string | null {
  const digits = normalizeWhatsAppNumber(whatsapp);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}