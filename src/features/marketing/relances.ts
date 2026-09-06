import type { OrderStatus } from "@/features/orders/order-status";

export type ReengagementKind = "pending_order" | "inactive_customer";

export type ReengagementCandidate = {
  phone: string;
  name: string;
  orderId: string;
  orderNumber: string | null;
  kind: ReengagementKind;
  lastOrderAt: string;
  lastOrderTotal: number;
  orderStatus: OrderStatus;
  consent: boolean;
  optedOut: boolean;
  recentlyContacted: boolean;
};

const PENDING_STATUSES: OrderStatus[] = ["new", "to_confirm", "confirmed", "preparing"];

export function isPendingOrder(status: OrderStatus) {
  return PENDING_STATUSES.includes(status);
}

export function isInactiveCustomer(lastOrderAt: string, now = new Date(), days = 30) {
  return now.getTime() - new Date(lastOrderAt).getTime() >= days * 24 * 60 * 60 * 1000;
}

export function buildReengagementMessage(candidate: Pick<ReengagementCandidate, "name" | "orderNumber" | "kind">) {
  const name = candidate.name.trim() || "Bonjour";
  const tag = candidate.orderNumber ? ` ${candidate.orderNumber}` : "";
  if (candidate.kind === "pending_order") {
    return `Bonjour ${name} 👋 Nous revenons vers vous au sujet de votre commande${tag}. Souhaitez-vous toujours la confirmer ? Répondez à ce message et nous vous aiderons avec plaisir.`;
  }
  return `Bonjour ${name} 👋 Cela fait un moment que nous ne vous avons pas accueillie dans notre boutique. Une nouvelle sélection vous attend, passez nous voir quand vous le souhaitez.`;
}

export function whatsappUrl(phone: string, message: string) {
  const normalized = phone.replace(/[^0-9]/g, "");
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
