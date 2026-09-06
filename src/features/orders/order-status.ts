export const ORDER_STATUSES = ["new", "to_confirm", "confirmed", "preparing", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderStatusMeta = { label: string; tone: "violet" | "amber" | "blue" | "cyan" | "indigo" | "green" | "red"; hint: string };
export const ORDER_STATUS_META: Record<OrderStatus, OrderStatusMeta> = {
  new: { label: "Non confirmée", tone: "violet", hint: "Reçue, à confirmer avec le client" },
  to_confirm: { label: "À confirmer", tone: "amber", hint: "À confirmer avec le client" },
  confirmed: { label: "Confirmée", tone: "blue", hint: "Produits à préparer" },
  preparing: { label: "En préparation", tone: "cyan", hint: "Commande en cours de préparation" },
  shipped: { label: "En livraison", tone: "indigo", hint: "Commande remise à la livraison" },
  delivered: { label: "Livrée", tone: "green", hint: "Finalisée" },
  cancelled: { label: "Annulée", tone: "red", hint: "Commande annulée" },
};

export const ORDER_STATUSES_MAIN: OrderStatus[] = ["new", "to_confirm", "confirmed", "preparing", "shipped", "delivered"];

export function isTerminalStatus(status: OrderStatus): boolean {
  return status === "delivered" || status === "cancelled";
}

export function nextOrderStatus(status: OrderStatus): OrderStatus | null {
  const index = ORDER_STATUSES_MAIN.indexOf(status);
  if (index < 0 || index >= ORDER_STATUSES_MAIN.length - 1) return null;
  return ORDER_STATUSES_MAIN[index + 1];
}

export function isActiveStatus(status: OrderStatus): boolean {
  return status !== "cancelled" && status !== "delivered";
}

export const PENDING_STATUSES: OrderStatus[] = ["new", "to_confirm"];

export function isPendingStatus(status: OrderStatus): boolean {
  return PENDING_STATUSES.includes(status);
}

export function canCancelStatus(status: OrderStatus): boolean {
  return status !== "delivered" && status !== "cancelled";
}

// Progression stricte : non confirmée → confirmée → préparation → livraison → livrée ;
// l’annulation reste possible tant que la commande n’est ni livrée ni déjà annulée.
const TRANSITION_MAP: Record<OrderStatus, OrderStatus[]> = {
  new: ["confirmed", "cancelled"],
  to_confirm: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  return from !== to && TRANSITION_MAP[from].includes(to);
}

export type QuickAction = { to: OrderStatus; label: string; confirm?: boolean };

export function quickActionFor(status: OrderStatus): QuickAction | null {
  switch (status) {
    case "new":
    case "to_confirm":
      return { to: "confirmed", label: "Confirmer la commande" };
    case "confirmed":
      return { to: "preparing", label: "Passer en préparation" };
    case "preparing":
      return { to: "shipped", label: "Passer en livraison" };
    case "shipped":
      return { to: "delivered", label: "Marquer comme livrée", confirm: true };
    default:
      return null;
  }
}

export type OrderFilter = "all" | "pending" | OrderStatus;
export const ORDER_FILTERS: ReadonlyArray<{ value: OrderFilter; label: string; matches: (s: OrderStatus) => boolean }> = [
  { value: "all", label: "Toutes", matches: () => true },
  { value: "pending", label: "Non confirmées", matches: (s) => isPendingStatus(s) },
  { value: "confirmed", label: "Confirmées", matches: (s) => s === "confirmed" },
  { value: "preparing", label: "En préparation", matches: (s) => s === "preparing" },
  { value: "shipped", label: "En livraison", matches: (s) => s === "shipped" },
  { value: "delivered", label: "Livrées", matches: (s) => s === "delivered" },
  { value: "cancelled", label: "Annulées", matches: (s) => s === "cancelled" },
];

export function isOrderFilter(value: unknown): value is OrderFilter {
  return typeof value === "string" && ORDER_FILTERS.some((f) => f.value === value);
}