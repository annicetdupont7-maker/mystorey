"use client";
import { useFormStatus } from "react-dom";
import { updateOrderStatus } from "../actions";
import { canCancelStatus, quickActionFor, type OrderStatus } from "../order-status";

function ActionSubmit({ label, danger, confirmMessage }: { label: string; danger?: boolean; confirmMessage?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`order-action${danger ? " order-action--danger" : ""}`} disabled={pending}
      onClick={(e) => { if (confirmMessage && !window.confirm(confirmMessage)) e.preventDefault(); }}>
      {pending ? "…" : label}
    </button>
  );
}

function ActionForm({ orderId, status, label, danger, confirmMessage }: { orderId: string; status: OrderStatus; label: string; danger?: boolean; confirmMessage?: string }) {
  return (
    <form action={updateOrderStatus}>
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="status" value={status} />
      <ActionSubmit label={label} danger={danger} confirmMessage={confirmMessage} />
    </form>
  );
}

export function OrderQuickActions({ orderId, status, orderTag }: { orderId: string; status: OrderStatus; orderTag: string }) {
  const next = quickActionFor(status);
  const cancellable = canCancelStatus(status);
  if (!next && !cancellable) return null;
  return (
    <div className="order-actions">
      {next && (
        <ActionForm
          orderId={orderId}
          status={next.to}
          label={next.label}
          confirmMessage={next.confirm ? `Confirmer « ${next.label} » pour la commande ${orderTag || "en cours"} ?` : undefined}
        />
      )}
      {cancellable && (
        <ActionForm
          orderId={orderId}
          status="cancelled"
          label="Annuler la commande"
          danger
          confirmMessage={`Annuler définitivement la commande ${orderTag || "en cours"} ?`}
        />
      )}
    </div>
  );
}