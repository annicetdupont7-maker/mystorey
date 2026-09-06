"use client";
import { useRef } from "react";
import { deleteProduct } from "../actions";
export function DeleteProductButton({ id }: { id: string }) {
  const form = useRef<HTMLFormElement>(null);
  return <form ref={form} action={deleteProduct}>
    <input type="hidden" name="id" value={id} />
    <button type="button" className="text-button text-button--danger" onClick={() => { if (window.confirm("Supprimer définitivement ce produit ?")) form.current?.requestSubmit(); }}>Supprimer</button>
  </form>;
}