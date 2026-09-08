import { formatPrice } from "./storefront-types";
export type CartItem = { id: string; name: string; unitPrice: number; quantity: number };
export function normalizeWhatsAppNumber(raw: string): string { return raw.replace(/\D/g, ""); }
export function buildOrderMessage(items: CartItem[], storeName: string): string {
  if (items.length === 0) return "";
  const rows = items.map((item) => `• ${item.name} : ${item.quantity} × ${formatPrice(item.unitPrice)} = ${formatPrice(item.unitPrice * item.quantity)}`).join("\n");
  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  return `Bonjour ${storeName} 👋\n\nJe souhaite commander :\n${rows}\n\nTotal : ${formatPrice(total)}\n\nMerci ! (via MYSTOREY)`;
}
export function buildWhatsAppLink(whatsapp: string, message: string): string | null {
  const digits = normalizeWhatsAppNumber(whatsapp);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}