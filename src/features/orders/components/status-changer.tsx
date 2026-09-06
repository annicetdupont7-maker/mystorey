"use client";
import { useRef } from "react";
import { deleteOrder } from "../actions";

export function DeleteOrderButton({ orderId }: { orderId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={deleteOrder}>
      <input type="hidden" name="orderId" value={orderId} />
      <button type="button" className="text-button text-button--danger" onClick={() => {
        if (window.confirm("Supprimer définitivement cette commande ?")) formRef.current?.requestSubmit();
      }}>Supprimer</button>
    </form>
  );
}