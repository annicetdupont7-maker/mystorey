import { formatPrice } from "@/features/storefront/storefront-types";
import type { OrderItemSnapshot } from "./schemas";
import type { OrderStatus } from "./order-status";

export type OrderMessageView = {
  order_number: string | null;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  note: string;
  items: OrderItemSnapshot[];
  total: number;
};

const orderTag = (order_number: string | null | undefined) => (order_number ? `#${order_number}` : "#……");

export function buildCheckoutMessage(order: OrderMessageView): string {
  const lines = order.items
    .map((item) => `• ${item.quantity} × ${item.name} — ${formatPrice(item.unitPrice)} = ${formatPrice(item.unitPrice * item.quantity)}`)
    .join("\n");
  const parts = [
    "🛍️ Nouvelle commande VendoFlow",
    "",
    `Commande ${orderTag(order.order_number)}`,
    `Client : ${order.customer_name.trim() || "—"}`,
  ];
  if (order.customer_phone.trim()) parts.push(`Téléphone : ${order.customer_phone.trim()}`);
  if (order.customer_address.trim()) parts.push(`Livraison : ${order.customer_address.trim()}`);
  parts.push("", "Produits :", lines, "", `Total : ${formatPrice(order.total)}`);
  if (order.note.trim()) parts.push("", "Note :", order.note.trim());
  parts.push("", "Merci pour votre commande ❤️ (gérée avec VendoFlow)");
  return parts.join("\n");
}

const STATUS_NOTICE: Record<OrderStatus, string> = {
  new: "Bonjour {name} 👋 Votre commande {tag} a bien été reçue. Nous vous confirmons très vite.",
  to_confirm: "Bonjour {name} 👋 Votre commande {tag} va être confirmée très vite.",
  confirmed: "Bonjour {name} 👋 Votre commande {tag} est confirmée. Nous allons maintenant la préparer.",
  preparing: "Bonjour {name} 👋 Votre commande {tag} est en préparation.",
  shipped: "🚚 Votre commande {tag} est en cours de livraison.",
  delivered: "✅ Votre commande {tag} a été livrée. Merci pour votre commande ❤️",
  cancelled: "Votre commande {tag} a été annulée. Contactez-nous si besoin.",
};

export function buildStatusNoticeMessage(order_number: string | null | undefined, status: OrderStatus, customerName: string): string {
  const template = STATUS_NOTICE[status];
  return template.replace("{name}", customerName.trim() || "chef").replace("{tag}", orderTag(order_number));
}