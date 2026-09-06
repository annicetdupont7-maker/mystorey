import { ORDER_STATUS_META, type OrderStatus } from "../order-status";

export function StatusBadge({ status }: { status: OrderStatus }) {
  const meta = ORDER_STATUS_META[status];
  return <span className={`order-status order-status--${meta.tone}`} title={meta.hint}>{meta.label}</span>;
}