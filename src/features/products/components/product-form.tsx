"use client";
/* eslint-disable @next/next/no-img-element */
import React, { startTransition, useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Camera, ChevronDown, ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { createProduct, updateProduct } from "../actions";
import type { ProductActionState } from "../schemas";
import { compressImage, MAX_PHOTOS, MAX_UPLOAD_TOTAL_BYTES } from "../image-compress";
import { formatPrice } from "@/features/storefront/storefront-types";

export type ProductFormData = { id: string; name: string; note: string; description: string; price: number; imageUrl: string | null; media?: { url: string; path?: string }[]; isAvailable: boolean; isFeatured: boolean; categoryId: string | null; stock?: number | null };
export type CategoryOption = { id: string; name: string };

type Photo =
  | { key: string; kind: "existing"; path: string; url: string }
  | { key: string; kind: "legacy"; url: string }
  | { key: string; kind: "new"; file: File; url: string };

function initialPhotos(product?: ProductFormData): Photo[] {
  if (!product) return [];
  if (product.media?.length) return product.media.filter((item) => item.path).map((item) => ({ key: `e:${item.path}`, kind: "existing" as const, path: item.path as string, url: item.url }));
  return product.imageUrl ? [{ key: "legacy", kind: "legacy", url: product.imageUrl }] : [];
}

const digitsOnly = (value: string) => value.replace(/[^\d]/g, "");
const without = (errors: Record<string, string[]>, key: string) => Object.fromEntries(Object.entries(errors).filter(([k]) => k !== key));

/**
 * Photo → name → price → the rest. The only required fields are the ones a client needs
 * to buy: a name and a price (a photo is strongly suggested). Everything secondary sits in
 * "Plus d'options". Photos are shrunk on the phone before upload.
 */
export function ProductForm({ storeId, product, categories = [], stockEnabled = false, storePublished = true }: { storeId: string; product?: ProductFormData; categories?: CategoryOption[]; stockEnabled?: boolean; storePublished?: boolean }) {
  const isEdit = !!product;
  const [state, formAction, pending] = useActionState<ProductActionState, FormData>(isEdit ? updateProduct : createProduct, {});
  const [photos, setPhotos] = useState<Photo[]>(() => initialPhotos(product));
  const [processing, setProcessing] = useState(0);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [note, setNote] = useState(product?.note ?? "");
  const [isAvailable, setIsAvailable] = useState(product?.isAvailable ?? true);
  const [isFeatured, setIsFeatured] = useState(product?.isFeatured ?? false);
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [stock, setStock] = useState(product?.stock === null || product?.stock === undefined ? "" : String(product.stock));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const createdUrls = useRef<string[]>([]);

  useEffect(() => () => { createdUrls.current.forEach((url) => URL.revokeObjectURL(url)); }, []);

  const numericPrice = digitsOnly(price) ? Number(digitsOnly(price)) : null;
  // Checked before sending: nobody should upload megabytes of photos to learn the name is missing.
  const [localErrors, setLocalErrors] = useState<Record<string, string[]>>({});
  const errors = { ...(state.fieldErrors ?? {}), ...localErrors };

  async function addFiles(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    setPhotoError(null);
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) { setPhotoError(`${MAX_PHOTOS} photos maximum par produit.`); return; }
    const accepted = files.slice(0, room);
    if (files.length > room) setPhotoError(`Seules ${room} photo(s) ont été ajoutées : ${MAX_PHOTOS} maximum par produit.`);
    setProcessing((n) => n + accepted.length);
    let failed = 0;
    for (const file of accepted) {
      try {
        const compressed = await compressImage(file);
        const url = URL.createObjectURL(compressed);
        createdUrls.current.push(url);
        setPhotos((current) => current.length >= MAX_PHOTOS ? current : [...current, { key: `n:${crypto.randomUUID()}`, kind: "new", file: compressed, url }]);
      } catch {
        failed += 1;
      } finally {
        setProcessing((n) => n - 1);
      }
    }
    if (failed) setPhotoError(failed === 1 ? "Une photo n’a pas pu être lue. Essayez une photo JPG ou une capture d’écran." : `${failed} photos n’ont pas pu être lues. Essayez des photos JPG ou des captures d’écran.`);
  }

  function move(index: number, delta: number) {
    setPhotos((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function remove(index: number) {
    setPhotos((current) => current.filter((_, i) => i !== index));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (processing > 0) return;
    const missing: Record<string, string[]> = {};
    if (!name.trim()) missing.name = ["Donnez un nom à votre produit."];
    if (!numericPrice) missing.price = [price.trim() ? "Indiquez un prix supérieur à 0." : "Le prix est requis."];
    setLocalErrors(missing);
    if (Object.keys(missing).length) {
      document.querySelector<HTMLInputElement>(missing.name ? "input[name=name]" : "input[name=price]")?.focus();
      return;
    }
    const newPhotos = photos.filter((photo): photo is Extract<Photo, { kind: "new" }> => photo.kind === "new");
    const total = newPhotos.reduce((sum, photo) => sum + photo.file.size, 0);
    if (total > MAX_UPLOAD_TOTAL_BYTES) { setPhotoError("Les nouvelles photos sont trop lourdes ensemble : enregistrez avec moins de photos, puis ajoutez les autres ensuite."); return; }
    const data = new FormData(event.currentTarget);
    data.delete("images");
    data.delete("pickImages");
    data.delete("pickCamera");
    let n = 0;
    const order = photos.map((photo) => {
      if (photo.kind === "existing") return `existing:${photo.path}`;
      if (photo.kind === "legacy") return "legacy";
      data.append("images", photo.file, photo.file.name);
      return `new:${n++}`;
    });
    data.set("photoOrder", JSON.stringify(order));
    startTransition(() => formAction(data));
  }

  const busy = pending || processing > 0;
  const submitLabel = processing > 0 ? "Préparation des photos…" : pending ? (isEdit ? "Enregistrement…" : "Ajout en cours…") : isEdit ? "Enregistrer" : isAvailable ? "Ajouter à ma boutique" : "Enregistrer (masqué)";

  return (
    <form className="pf" onSubmit={submit} noValidate>
      <input type="hidden" name="storeId" value={storeId} />
      {isEdit && <input type="hidden" name="productId" value={product.id} />}

      <header className="pf-head">
        <Link className="pf-back" href="/dashboard/products"><ArrowLeft size={16} aria-hidden="true" /> Produits</Link>
        <h1>{isEdit ? "Modifier le produit" : "Nouveau produit"}</h1>
        <p className="muted">{isEdit ? "Vos changements sont visibles dès l’enregistrement." : "Une photo, un nom, un prix : c’est tout ce qu’il faut pour commencer."}</p>
      </header>

      <div className="pf-grid">
        <div className="pf-main">
          {/* 1. Photos */}
          <section className="pf-card" aria-labelledby="pf-photos">
            <div className="pf-card-head">
              <h2 id="pf-photos"><span className="pf-step">1</span> Photos</h2>
              <span className="muted pf-count">{photos.length}/{MAX_PHOTOS}</span>
            </div>
            <input ref={fileInputRef} type="file" name="pickImages" accept="image/*" multiple className="visually-hidden" tabIndex={-1} onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }} />
            <input ref={cameraInputRef} type="file" name="pickCamera" accept="image/*" capture="environment" className="visually-hidden" tabIndex={-1} onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }} />
            {photos.length === 0 && processing === 0 ? (
              <div className="pf-photo-empty">
                <button type="button" className="pf-photo-add pf-photo-add--big" onClick={() => fileInputRef.current?.click()}>
                  <ImagePlus size={28} aria-hidden="true" />
                  <strong>Ajouter des photos</strong>
                  <small>Depuis votre galerie · jusqu’à {MAX_PHOTOS} photos</small>
                </button>
                <button type="button" className="pf-photo-camera" onClick={() => cameraInputRef.current?.click()}>
                  <Camera size={18} aria-hidden="true" /> Prendre une photo
                </button>
              </div>
            ) : (
              <ul className="pf-photos" aria-label="Photos du produit">
                {photos.map((photo, index) => (
                  <li key={photo.key} className="pf-photo">
                    <img src={photo.url} alt={`Photo ${index + 1}`} />
                    {index === 0 && <span className="pf-photo-cover">Principale</span>}
                    <div className="pf-photo-tools">
                      <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Déplacer la photo ${index + 1} vers la gauche`}><ArrowLeft size={14} /></button>
                      <button type="button" onClick={() => remove(index)} aria-label={`Retirer la photo ${index + 1}`} className="is-danger"><Trash2 size={14} /></button>
                      <button type="button" onClick={() => move(index, 1)} disabled={index === photos.length - 1} aria-label={`Déplacer la photo ${index + 1} vers la droite`}><ArrowRight size={14} /></button>
                    </div>
                  </li>
                ))}
                {Array.from({ length: processing }).map((_, i) => (
                  <li key={`p${i}`} className="pf-photo pf-photo--loading" aria-label="Photo en préparation"><Loader2 className="spin" size={20} aria-hidden="true" /></li>
                ))}
                {photos.length + processing < MAX_PHOTOS && (
                  <li className="pf-photo pf-photo--add">
                    <button type="button" onClick={() => fileInputRef.current?.click()}><ImagePlus size={20} aria-hidden="true" /><span>Ajouter</span></button>
                  </li>
                )}
              </ul>
            )}
            <p className="pf-hint">La première photo est celle que vos clientes voient en premier. Utilisez les flèches pour changer l’ordre.</p>
            {photoError && <p className="form-error" role="alert">{photoError}</p>}
          </section>

          {/* 2. The essentials */}
          <section className="pf-card" aria-labelledby="pf-essentials">
            <h2 id="pf-essentials"><span className="pf-step">2</span> Nom et prix</h2>
            <label className="field">
              <span>Nom du produit</span>
              <input className="field-input" name="name" value={name} onChange={(e) => { setName(e.target.value); if (localErrors.name) setLocalErrors((current) => without(current, "name")); }} placeholder="Ex. : Robe longue en wax" maxLength={100} autoComplete="off" aria-invalid={errors.name ? true : undefined} />
              {errors.name && <small className="field-error">{errors.name[0]}</small>}
            </label>
            <label className="field">
              <span>Prix</span>
              <div className="price-group">
                <input className="field-input" name="price" inputMode="numeric" value={price} onChange={(e) => { setPrice(e.target.value); if (localErrors.price) setLocalErrors((current) => without(current, "price")); }} placeholder="Ex. : 8500" autoComplete="off" aria-invalid={errors.price ? true : undefined} />
                <span className="price-unit">FCFA</span>
              </div>
              {errors.price ? <small className="field-error">{errors.price[0]}</small> : numericPrice ? <small className="field-hint">Affiché : {formatPrice(numericPrice)}</small> : null}
            </label>
          </section>

          {/* 3. Useful details */}
          <section className="pf-card" aria-labelledby="pf-details">
            <h2 id="pf-details"><span className="pf-step">3</span> Infos utiles <small className="muted">(facultatif)</small></h2>
            <label className="field">
              <span>Description</span>
              <textarea className="field-input" name="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={1000} placeholder="Matière, tailles disponibles, entretien, délai de livraison…" />
              <small className="field-count">{description.length}/1000</small>
              {errors.description && <small className="field-error">{errors.description[0]}</small>}
            </label>
            <label className="field">
              <span>Catégorie</span>
              <select className="field-input" name="categoryId" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Sans catégorie</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {categories.length === 0 && <small className="field-hint">Pas encore de catégorie. <Link href="/dashboard/categories">Créer des catégories</Link> (Robes, Sacs…) pour aider vos clientes à s’y retrouver.</small>}
            </label>
            {stockEnabled && (
              <label className="field">
                <span>Quantité en stock</span>
                <input className="field-input" name="stock" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Laissez vide si vous ne comptez pas" aria-invalid={errors.stock ? true : undefined} />
                {errors.stock ? <small className="field-error">{errors.stock[0]}</small> : <small className="field-hint">À 0, le produit s’affiche « épuisé » et ne peut plus être commandé.</small>}
              </label>
            )}
            {!isEdit && <p className="pf-hint">Plusieurs couleurs ou tailles ? Enregistrez d’abord le produit, puis ajoutez les choix (avec leur photo) depuis sa fiche.</p>}
          </section>

          {/* 4. Visibility */}
          <section className="pf-card" aria-labelledby="pf-visibility">
            <h2 id="pf-visibility"><span className="pf-step">4</span> Publication</h2>
            <label className="toggle-row">
              <input type="checkbox" name="isAvailable" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} />
              <span className="toggle-control" aria-hidden="true"><span /></span>
              <span className="toggle-text">
                <strong>{isAvailable ? "Visible dans ma boutique" : "Masqué"}</strong>
                <small>{isAvailable ? (storePublished ? "Vos clientes le voient et peuvent le commander." : "Il sera visible dès que votre boutique sera publiée.") : "Personne ne le voit. Pratique pour un produit épuisé ou pas encore prêt."}</small>
              </span>
            </label>
          </section>

          <details className="pf-card pf-advanced">
            <summary><span>Plus d’options</span><ChevronDown size={16} aria-hidden="true" /></summary>
            <label className="field">
              <span>Petite phrase d’accroche</span>
              <input className="field-input" name="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. : Nouvelle collection · Pièce unique" maxLength={120} />
              <small className="field-hint">Affichée sous le nom du produit.</small>
            </label>
            <label className="toggle-row">
              <input type="checkbox" name="isFeatured" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
              <span className="toggle-control" aria-hidden="true"><span /></span>
              <span className="toggle-text"><strong><Star size={13} aria-hidden="true" /> Mettre à la une</strong><small>Le produit apparaît en premier dans votre boutique.</small></span>
            </label>
          </details>

          {state.error && <p className="form-error pf-error" role="alert">{state.error}</p>}
        </div>

        <aside className="pf-preview" aria-label="Aperçu client">
          <p className="pf-preview-label">Ce que voit votre cliente</p>
          <div className="pf-preview-card">
            <div className="pf-preview-media">
              {photos[0] ? <img src={photos[0].url} alt="" /> : <ImagePlus size={28} aria-hidden="true" />}
              {isFeatured && <span className="pf-preview-badge"><Star size={11} aria-hidden="true" /> À la une</span>}
            </div>
            <div className="pf-preview-body">
              <strong>{name.trim() || "Nom du produit"}</strong>
              {note.trim() && <small>{note}</small>}
              <span className="pf-preview-price">{numericPrice ? formatPrice(numericPrice) : "Prix"}</span>
              <span className="pf-preview-cta">{isAvailable ? "Ajouter au panier" : "Masqué"}</span>
            </div>
          </div>
        </aside>
      </div>

      <div className="pf-savebar">
        <Link className="vf-button vf-button--ghost" href="/dashboard/products">Annuler</Link>
        <button className="vf-button pf-save" type="submit" disabled={busy}>
          {busy && <Loader2 className="spin" size={16} aria-hidden="true" />} {submitLabel}
        </button>
      </div>
    </form>
  );
}
