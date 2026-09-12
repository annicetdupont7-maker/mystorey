"use client";
/* eslint-disable @next/next/no-img-element */
import { useActionState, useRef, useState } from "react";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { formatPrice } from "@/features/storefront/storefront-types";
import { addVariant, deleteVariant, setProductStock, toggleVariant } from "../actions";
import type { VariantActionState } from "../schemas";
import { DEFAULT_OPTION_GROUP, type ProductVariant } from "../types";

/** Stock for the product as a whole. Blank means "not tracked", which is the default. */
function ProductStockForm({ productId, stock }: { productId: string; stock: number | null }) {
  const [state, action, pending] = useActionState<VariantActionState, FormData>(setProductStock, {});
  return (
    <form action={action} className="stock-form">
      <input type="hidden" name="productId" value={productId} />
      <label className="field">
        <span>Stock du produit</span>
        <div className="stock-row">
          <input name="stock" inputMode="numeric" pattern="\d*" defaultValue={stock ?? ""} placeholder="illimité" />
          <button className="vf-button vf-button--ghost vf-button--sm" disabled={pending}>{pending ? "…" : "Enregistrer"}</button>
        </div>
        <small className="field-hint">Laissez vide si vous ne comptez pas votre stock. À 0, le produit s’affiche comme épuisé et ne peut plus être commandé.</small>
      </label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      {state.success && <p className="form-success" role="status">{state.success}</p>}
    </form>
  );
}

/**
 * One product, several choices — the point being that a seller with a dress in four
 * colours creates ONE product, not four. Kept to a single row of inputs: a name, an
 * optional photo, an optional stock and an optional price. Everything optional stays
 * blank and inherits from the product.
 */
export function VariantEditor({ productId, productPrice, productStock, variants, available }: {
  productId: string;
  productPrice: number;
  productStock: number | null;
  variants: ProductVariant[];
  /** False while the variants migration has not been applied to the database. */
  available: boolean;
}) {
  const [state, action, pending] = useActionState<VariantActionState, FormData>(addVariant, {});
  const [group, setGroup] = useState(variants[0]?.optionGroup ?? DEFAULT_OPTION_GROUP);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  if (!available) {
    return (
      <section className="editor-card">
        <h2>Stock et déclinaisons</h2>
        <p className="banner-warn" role="status">
          Pour proposer un même produit en plusieurs couleurs ou tailles, exécutez la migration
          « 20260912_product_variants » dans le SQL Editor Supabase. Vos produits actuels continuent de fonctionner normalement.
        </p>
      </section>
    );
  }

  return (
    <section className="editor-card">
      <h2>Stock et déclinaisons</h2>

      <ProductStockForm productId={productId} stock={productStock} />

      <p className="editor-hint">
        Un même produit en plusieurs couleurs ou tailles ? Ajoutez une option par choix plutôt que
        de créer plusieurs produits. Chaque option peut avoir sa photo, son stock et son prix.
      </p>

      {variants.length > 0 && (
        <ul className="variant-list">
          {variants.map((variant) => (
            <li key={variant.id} className={`variant-row${variant.isActive ? "" : " is-hidden"}`}>
              <span className="variant-thumb">
                {variant.imageUrl ? <img src={variant.imageUrl} alt="" /> : <span aria-hidden="true">—</span>}
              </span>
              <span className="variant-copy">
                <strong>{variant.label}</strong>
                <small>
                  {variant.price !== null ? formatPrice(variant.price) : `${formatPrice(productPrice)} (prix du produit)`}
                  {variant.stock !== null && ` · ${variant.stock} en stock`}
                  {!variant.isActive && " · masquée"}
                </small>
              </span>
              <span className="variant-actions">
                <form action={toggleVariant}>
                  <input type="hidden" name="variantId" value={variant.id} />
                  <input type="hidden" name="productId" value={productId} />
                  <input type="hidden" name="nextActive" value={String(!variant.isActive)} />
                  <button type="submit" className="icon-button" aria-label={variant.isActive ? `Masquer ${variant.label}` : `Afficher ${variant.label}`} title={variant.isActive ? "Masquer de la boutique" : "Afficher dans la boutique"}>
                    {variant.isActive ? <Eye size={15} aria-hidden="true" /> : <EyeOff size={15} aria-hidden="true" />}
                  </button>
                </form>
                <form action={deleteVariant}>
                  <input type="hidden" name="variantId" value={variant.id} />
                  <input type="hidden" name="productId" value={productId} />
                  <button type="submit" className="icon-button" aria-label={`Supprimer ${variant.label}`} title="Supprimer">
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </form>
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Its own form: adding an option must not submit the product being edited. */}
      <form action={action} className="variant-form">
        <input type="hidden" name="productId" value={productId} />
        <div className="variant-form-grid">
          <label className="field">
            <span>Type de choix</span>
            <input name="optionGroup" value={group} onChange={(event) => setGroup(event.target.value)} maxLength={30} placeholder="Couleur" list="variant-groups" />
            <datalist id="variant-groups">
              <option value="Couleur" />
              <option value="Taille" />
              <option value="Volume" />
              <option value="Parfum" />
            </datalist>
          </label>
          <label className="field">
            <span>Nom de l’option</span>
            <input name="label" maxLength={40} placeholder="Rouge" required />
          </label>
          <label className="field">
            <span>Stock <small>optionnel</small></span>
            <input name="stock" inputMode="numeric" pattern="\d*" placeholder="illimité" />
          </label>
          <label className="field">
            <span>Prix <small>si différent</small></span>
            <input name="price" inputMode="numeric" pattern="\d*" placeholder={String(productPrice)} />
          </label>
        </div>

        <div className="variant-photo-row">
          <input
            ref={photoRef}
            id="variant-image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="visually-hidden"
            onChange={(event) => setPhotoName(event.target.files?.[0]?.name ?? null)}
          />
          <label htmlFor="variant-image" className="vf-button vf-button--ghost vf-button--sm">
            {photoName ? "Changer la photo" : "Photo de cette option"}
          </label>
          {photoName && <small className="field-hint">{photoName}</small>}
          <button className="vf-button vf-button--sm" disabled={pending}>
            {pending ? "Ajout…" : <><Plus size={15} aria-hidden="true" /> Ajouter l’option</>}
          </button>
        </div>

        {state.error && <p className="form-error" role="alert">{state.error}</p>}
        {state.success && <p className="form-success" role="status">{state.success}</p>}
        {state.fieldErrors?.label && <p className="form-error">{state.fieldErrors.label[0]}</p>}
        {state.fieldErrors?.price && <p className="form-error">{state.fieldErrors.price[0]}</p>}
        {state.fieldErrors?.stock && <p className="form-error">{state.fieldErrors.stock[0]}</p>}
      </form>
    </section>
  );
}
