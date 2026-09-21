"use client";
/* eslint-disable @next/next/no-img-element */
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { formatPrice } from "@/features/storefront/storefront-types";
import { addVariant, deleteVariant, toggleVariant } from "../actions";
import { compressImage } from "@/features/products/image-compress";
import type { VariantActionState } from "../schemas";
import { DEFAULT_OPTION_GROUP, type ProductVariant } from "../types";

/**
 * One product, several choices — the point being that a seller with a dress in four
 * colours creates ONE product, not four. Kept to a single row of inputs: a name, an
 * optional photo, an optional stock and an optional price. Everything optional stays
 * blank and inherits from the product.
 */
export function VariantEditor({ productId, productPrice, variants, available }: {
  productId: string;
  productPrice: number;
  /** Product-level stock is edited in the product form; kept for callers. */
  productStock?: number | null;
  variants: ProductVariant[];
  /** False while the variants migration has not been applied to the database. */
  available: boolean;
}) {
  const [state, action, pending] = useActionState<VariantActionState, FormData>(addVariant, {});
  const [group, setGroup] = useState(variants[0]?.optionGroup ?? DEFAULT_OPTION_GROUP);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const [preparing, setPreparing] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  // A new success clears the form: the file label during render, the DOM in an effect.
  const [seenSuccess, setSeenSuccess] = useState<string | undefined>(undefined);
  if (state.success && state.success !== seenSuccess) {
    setSeenSuccess(state.success);
    setPhotoName(null);
  }
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  // Sellers never see a database message: until variants are enabled the section stays out of the way.
  if (!available) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const file = data.get("image");
    setPhotoError(null);
    if (file instanceof File && file.size > 0) {
      setPreparing(true);
      try {
        const compressed = await compressImage(file);
        data.set("image", compressed, compressed.name);
      } catch {
        setPreparing(false);
        setPhotoError("Cette photo n’a pas pu être lue. Essayez une photo JPG ou une capture d’écran.");
        return;
      }
      setPreparing(false);
    }
    startTransition(() => action(data));
  }

  return (
    <section className="editor-card" id="variants">
      <h2>Couleurs, tailles… <small className="muted">(facultatif)</small></h2>

      <p className="editor-hint">
        Un même produit en plusieurs couleurs ou tailles ? Ajoutez un choix par option (Noir, Rouge, Bleu…)
        au lieu de créer plusieurs produits. Chaque choix peut avoir sa photo, son stock et son prix.
        Vos clientes le choisiront sur la page du produit.
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
                <form action={deleteVariant} onSubmit={(event) => { if (!window.confirm(`Supprimer « ${variant.label} » ?`)) event.preventDefault(); }}>
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
      <form ref={formRef} onSubmit={submit} className="variant-form">
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
            <span>Nom du choix</span>
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
            accept="image/*"
            className="visually-hidden"
            onChange={(event) => setPhotoName(event.target.files?.[0]?.name ?? null)}
          />
          <label htmlFor="variant-image" className="vf-button vf-button--ghost vf-button--sm">
            {photoName ? "Changer la photo" : "Photo de cette option"}
          </label>
          {photoName && <small className="field-hint">{photoName}</small>}
          <button className="vf-button vf-button--sm" disabled={pending || preparing}>
            {pending || preparing ? "Ajout…" : <><Plus size={15} aria-hidden="true" /> Ajouter ce choix</>}
          </button>
        </div>

        {photoError && <p className="form-error" role="alert">{photoError}</p>}
        {state.error && <p className="form-error" role="alert">{state.error}</p>}
        {state.success && <p className="form-success" role="status">{state.success}</p>}
        {state.fieldErrors?.label && <p className="form-error">{state.fieldErrors.label[0]}</p>}
        {state.fieldErrors?.price && <p className="form-error">{state.fieldErrors.price[0]}</p>}
        {state.fieldErrors?.stock && <p className="form-error">{state.fieldErrors.stock[0]}</p>}
      </form>
    </section>
  );
}
