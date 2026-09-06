"use client";
import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createOrder } from "../actions";
import { formatPrice } from "@/features/storefront/storefront-types";

export type ProductChoice = { id: string; name: string; price: number };
type Line = { productId: string; quantity: string };

export function OrderCreateForm({ storeId, products }: { storeId: string; products: ProductChoice[] }) {
  const [state, action, pending] = useActionState(createOrder, {});
  const [lines, setLines] = useState<Line[]>([{ productId: products[0]?.id ?? "", quantity: "1" }]);
  const priceById = new Map(products.map((p) => [p.id, p.price]));
  const validLines = lines.filter((l) => l.productId && Number(l.quantity) > 0);
  const total = validLines.reduce((sum, l) => sum + (priceById.get(l.productId) ?? 0) * Number(l.quantity), 0);

  const updateLine = (index: number, patch: Partial<Line>) => setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  const rendered = products.length === 0;

  return (
    <div className="order-create">
      <div className="order-create-head">
        <strong>Enregistrer une commande reçue (WhatsApp, appel, …)</strong>
        <span className="muted">Consignez la commande ici pour la suivre de la confirmation à la livraison.</span>
      </div>
      {rendered ? (
        <p className="muted">Ajoutez d’abord un produit à votre catalogue pour créer une commande.</p>
      ) : (
        <form className="settings-form" action={action}>
          <input type="hidden" name="storeId" value={storeId} />
          <input type="hidden" name="lines" value={JSON.stringify(validLines.map((l) => ({ productId: l.productId, quantity: Number(l.quantity) })))} />
          <div className="order-lines">
            {lines.map((line, index) => (
              <div className="order-line" key={index}>
                <select aria-label={`Produit ${index + 1}`} value={line.productId} onChange={(e) => updateLine(index, { productId: e.target.value })}>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} · {formatPrice(p.price)}</option>)}
                </select>
                <input type="number" min={1} max={999} aria-label={`Quantité ${index + 1}`} value={line.quantity} onChange={(e) => updateLine(index, { quantity: e.target.value })} />
                <strong className="order-line-total">{formatPrice((priceById.get(line.productId) ?? 0) * Math.max(1, Number(line.quantity) || 1))}</strong>
                <button type="button" className="icon-button" title="Retirer cette ligne" aria-label={`Retirer la ligne ${index + 1}`} disabled={lines.length < 2} onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
          <button type="button" className="text-button" onClick={() => setLines((prev) => [...prev, { productId: products[0]?.id ?? "", quantity: "1" }])}><Plus size={14} /> Ajouter une ligne</button>
          <div className="order-total"><span>Total</span><strong>{formatPrice(total)}</strong></div>
          <label className="field"><span>Nom du client</span><input name="customerName" required maxLength={120} placeholder="Ex. Amina Traoré" /></label>
          {state.fieldErrors?.customerName && <p className="form-error">{state.fieldErrors.customerName[0]}</p>}
          <label className="field"><span>Téléphone (optionnel)</span><input name="customerPhone" maxLength={40} placeholder="+225 07 00 00 00" /></label>
          <label className="field"><span>Adresse / lieu de livraison (optionnel)</span><input name="customerAddress" maxLength={250} placeholder="Quartier, ville…" /></label>
          <label className="field"><span>Note (optionnel)</span><textarea name="note" rows={2} maxLength={500} placeholder="Livraison, taille, préférences…" /></label>
          {state.error && <p className="form-error" role="alert">{state.error}</p>}
          {state.success && <p className="form-success" role="status">{state.success}</p>}
          <button className="vf-button" disabled={pending || validLines.length === 0}>{pending ? "Enregistrement…" : "Enregistrer la commande"}</button>
        </form>
      )}
    </div>
  );
}