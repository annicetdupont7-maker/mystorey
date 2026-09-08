"use client";
/* eslint-disable @next/next/no-img-element */
import React, { useActionState, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ImagePlus, Loader2, Sparkles, Star, Trash2, Upload } from "lucide-react";
import { createProduct, updateProduct } from "../actions";
import type { ProductActionState } from "../schemas";
import { formatPrice } from "@/features/storefront/storefront-types";

export type ProductFormData = { id: string; name: string; note: string; description: string; price: number; imageUrl: string | null; isAvailable: boolean; isFeatured: boolean; categoryId: string | null };
export type CategoryOption = { id: string; name: string };
export type ProductPreview = { name: string; price: number; imageUrl: string | null; description: string; category: string; isAvailable: boolean };

export function ProductForm({ storeId, product, categories = [], onPreviewChange }: { storeId: string; product?: ProductFormData; categories?: CategoryOption[]; onPreviewChange?: (preview: ProductPreview) => void }) {
  const isEdit = !!product;
  const [state, action, pending] = useActionState<ProductActionState, FormData>(isEdit ? updateProduct : createProduct, {});

  const [name, setName] = useState(product?.name ?? "");
  const [note, setNote] = useState(product?.note ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [isAvailable, setIsAvailable] = useState(product?.isAvailable ?? true);
  const [isFeatured, setIsFeatured] = useState(product?.isFeatured ?? false);
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [images, setImages] = useState<string[]>(product?.imageUrl ? [product.imageUrl] : []);
  const [imageError, setImageError] = useState<string | null>(null);
  const [newImagePicked, setNewImagePicked] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedCategoryName = categories.find((c) => c.id === categoryId)?.name ?? null;
  const numericPrice = price && /^\d+$/.test(price.trim()) ? Number(price.trim()) : null;
  const previewPrice = numericPrice !== null ? formatPrice(numericPrice) : "— FCFA";

  // Update preview whenever form data changes
  useEffect(() => {
    if (onPreviewChange) {
      onPreviewChange({
        name: name || "Titre du produit",
        price: numericPrice || 0,
        imageUrl: images[0] ?? null,
        description: description || "Description du produit",
        category: categoryId,
        isAvailable,
      });
    }
  }, [name, price, images, description, categoryId, isAvailable, numericPrice, onPreviewChange]);

  function handleFiles(files: File[]) {
    setImageError(null);
    const valid = files.filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= 5 * 1024 * 1024).slice(0, 12);
    if (valid.length !== files.length) setImageError("Certaines photos ont été ignorées. Utilisez JPG, PNG ou WebP de 5 Mo maximum, 12 photos maximum.");
    if (!valid.length) return;
    setImages((current) => [...current.filter((item) => item.startsWith("http")), ...valid.map((file) => URL.createObjectURL(file))].slice(0, 12));
    setNewImagePicked(true);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (!files.length || !fileInputRef.current) return;
    const dt = new DataTransfer();
    files.forEach((file) => dt.items.add(file));
    fileInputRef.current.files = dt.files;
    handleFiles(files);
  }

  return (
    <form className="product-editor" action={action} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop}>
      <input type="hidden" name="storeId" value={storeId} />
      {isEdit && <input type="hidden" name="productId" value={product.id} />}

      <div className="product-editor-bar">
        <div>
          <p className="vf-eyebrow">Produits</p>
          <h1>{isEdit ? "Modifier le produit" : "Ajouter un produit"}</h1>
          <p className="muted">{isEdit ? "Ajustez les informations de votre produit, vos clients verront l’aperçu à droite." : "Ajoutez les informations de votre produit pour l’ajouter à votre boutique."}</p>
        </div>
        <div className="product-editor-actions">
          <Link className="vf-button vf-button--ghost" href="/dashboard/products">Annuler</Link>
          <button className="vf-button" disabled={pending}>
            {pending ? <><Loader2 className="spin" size={16} aria-hidden="true" /> {isEdit ? "Enregistrement…" : "Création…"}</> : isEdit ? "Enregistrer les modifications" : "Créer le produit"}
          </button>
        </div>
      </div>

      <div className="product-editor-grid">
        <div className="product-editor-main">
          <section className="editor-section" aria-labelledby="editor-section-name">
            <h2 id="editor-section-name">Nom du produit</h2>
            <p className="editor-hint">A quel produit souhaitez-vous ajouter à votre boutique ?</p>
            <label className="field">
              <input className="field-input" name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. : Robe longue satinée" required maxLength={100} autoFocus />
              {state.fieldErrors?.name && <small className="field-error">{state.fieldErrors.name[0]}</small>}
            </label>
          </section>

          <section className="editor-section" aria-labelledby="editor-section-note">
            <h2 id="editor-section-note">Accroche courte</h2>
            <p className="editor-hint">Une phrase courte qui attirera l’attention, affichée sous le nom du produit.</p>
            <label className="field">
              <input className="field-input" name="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. : Disponible maintenant" maxLength={120} />
              {state.fieldErrors?.note && <small className="field-error">{state.fieldErrors.note[0]}</small>}
            </label>
          </section>

          <section className="editor-section" aria-labelledby="editor-section-category">
            <h2 id="editor-section-category">Catégorie</h2>
            <p className="editor-hint">Organisez votre produit pour aider vos clients à le retrouver.</p>
            <label className="field">
              <select className="field-input" name="categoryId" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Sans catégorie</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {categories.length === 0 && <small className="field-hint">Aucune catégorie pour l’instant. Créez-les dans « Catégories » pour organiser votre catalogue.</small>}
            </label>
          </section>

          <section className="editor-section" aria-labelledby="editor-section-price">
            <h2 id="editor-section-price">Prix de vente</h2>
            <p className="editor-hint">Le prix affiché à vos clients.</p>
            <label className="field">
              <div className="price-group">
                <input className="field-input" name="price" type="number" inputMode="numeric" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Ex. : 8500" required />
                <span className="price-unit">FCFA</span>
              </div>
              {state.fieldErrors?.price && <small className="field-error">{state.fieldErrors.price[0]}</small>}
            </label>
          </section>

          <section className="editor-section" aria-labelledby="editor-section-description">
            <h2 id="editor-section-description">Description</h2>
            <p className="editor-hint">Présentez votre produit à vos clients.</p>
            <label className="field">
              <textarea className="field-input" name="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} maxLength={1000} placeholder="Décrivez votre produit, ses caractéristiques, sa matière, sa taille..." />
              {state.fieldErrors?.description && <small className="field-error">{state.fieldErrors.description[0]}</small>}
              <small className="field-count">{description.length}/1000</small>
            </label>
          </section>

          <section className="editor-section" aria-labelledby="editor-section-options">
            <h2 id="editor-section-options">Disponibilité</h2>
            <p className="editor-hint">Indiquez si ce produit peut actuellement être commandé.</p>
            <label className="toggle-row">
              <input type="checkbox" name="isAvailable" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} />
              <span className="toggle-control" aria-hidden="true"><span /></span>
              <span className="toggle-text"><strong>Produit disponible</strong><small>Les clients peuvent commander ce produit.</small></span>
            </label>
          </section>

          <section className="editor-section" aria-labelledby="editor-section-featured">
            <h2 id="editor-section-featured">Produit vedette</h2>
            <p className="editor-hint">Mettre ce produit en avant dans votre boutique.</p>
            <label className="toggle-row">
              <input type="checkbox" name="isFeatured" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
              <span className="toggle-control" aria-hidden="true"><span /></span>
              <span className="toggle-text"><strong><Star size={13} aria-hidden="true" /> Afficher comme produit vedette</strong><small>Ce produit apparaîtra parmi vos produits mis en avant.</small></span>
            </label>
          </section>

          <section className="editor-section" aria-labelledby="editor-section-image">
            <h2 id="editor-section-image">Image du produit</h2>
            <p className="editor-hint">Ajoutez une belle photo de votre produit. JPG, PNG ou WebP.</p>
            <input ref={fileInputRef} type="file" name="images" multiple accept="image/jpeg,image/png,image/webp" className="visually-hidden" onChange={(e) => handleFiles(Array.from(e.target.files ?? []))} />
            {!images.length ? (
              <button type="button" className={`upload-zone${dragging ? " is-dragging" : ""}`} onClick={() => fileInputRef.current?.click()}>
                <span className="upload-zone-icon"><ImagePlus size={22} aria-hidden="true" /></span>
                <strong>Ajouter des photos</strong>
                <small>Choisissez une ou plusieurs photos. JPG, PNG ou WebP, 5 Mo maximum par photo.</small>
              </button>
            ) : (
              <div className="upload-preview">
                <div className="upload-gallery-grid">{images.map((item, index) => <div className="upload-gallery-item" key={`${item}-${index}`}><img src={item} alt={`Photo ${index + 1} du produit`} /><button type="button" className="upload-gallery-remove" onClick={() => setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Supprimer la photo ${index + 1}`}><Trash2 size={14} aria-hidden="true" /></button></div>)}</div>
                <div className="upload-preview-actions">
                  {newImagePicked ? (
                    <button type="button" className="upload-remove" onClick={() => { setImages(product?.imageUrl ? [product.imageUrl] : []); setNewImagePicked(false); if (fileInputRef.current) fileInputRef.current.value = ""; }} aria-label="Réinitialiser les photos"><Trash2 size={15} aria-hidden="true" /> Réinitialiser</button>
                  ) : null}
                  <button type="button" className="upload-replace" onClick={() => fileInputRef.current?.click()}>
                    <Upload size={15} aria-hidden="true" /> Ajouter des photos
                  </button>
                </div>
              </div>
            )}
            {imageError && <p className="form-error" role="alert">{imageError}</p>}
          </section>

          {state.error && <p className="form-error editor-error" role="alert">{state.error}</p>}
        </div>

        <aside className="product-editor-preview" aria-label="Aperçu du produit">
          <p className="editor-preview-label"><Sparkles size={13} aria-hidden="true" /> Aperçu</p>
          <div className="preview-card">
            <div className="preview-media">
              {images[0] ? <img src={images[0]} alt="" /> : <span className="preview-placeholder"><ImagePlus size={28} aria-hidden="true" /></span>}
              {isFeatured && <span className="preview-badge"><Star size={11} aria-hidden="true" /> À la une</span>}
            </div>
            <div className="preview-details">
              <h3 className="preview-name">{name.trim() || "Nom du produit"}</h3>
              {note.trim() && <p className="preview-note">{note}</p>}
              <div className="preview-bottom">
                <span className="preview-price">{previewPrice}</span>
                <span className="preview-cta">Commander</span>
              </div>
              <div className="preview-extras">
                {selectedCategoryName && <span className="preview-category">{selectedCategoryName}</span>}
                {description.trim() && <p className="preview-description">{description}</p>}
              </div>
            </div>
          </div>
          <p className="preview-caption">Vos clients verront cet aperçu dans votre boutique.</p>
        </aside>
      </div>

      <div className="product-editor-bar product-editor-bar--bottom">
        <p className="muted">{isEdit ? "Enregistrez pour appliquer vos modifications." : "Votre produit sera visible dès sa création."}</p>
        <div className="product-editor-actions">
          <Link className="vf-button vf-button--ghost" href="/dashboard/products">Annuler</Link>
          <button className="vf-button" disabled={pending}>
            {pending ? <><Loader2 className="spin" size={16} aria-hidden="true" /> {isEdit ? "Enregistrement…" : "Création…"}</> : isEdit ? "Enregistrer les modifications" : "Créer le produit"}
          </button>
        </div>
      </div>
    </form>
  );
}