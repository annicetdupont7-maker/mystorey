"use client";
/* eslint-disable @next/next/no-img-element */
import { useActionState, useRef, useState } from "react";
import { Storefront } from "@/features/storefront/components";
import { demoProducts, type ProductView } from "@/features/storefront/storefront-types";
import { themeCssVariables } from "@/features/themes/resolve-theme";
import type { ThemeTokens } from "@/features/themes/theme-schema";
import type { StoreActionState } from "../actions";
import { saveStoreIdentity } from "../actions";

type IdentityFormProps = {
  storeId: string;
  name: string;
  slogan: string;
  description: string;
  whatsapp: string;
  logoUrl: string | null;
  coverUrl: string | null;
  slug: string;
  tokens: ThemeTokens;
  /** The seller's own catalogue. Falls back to a sample so an empty shop still previews. */
  products?: ProductView[];
};

const readUrl = (file: File | null, fallback: string | null) =>
  file ? URL.createObjectURL(file) : fallback;

export function IdentityForm({ storeId, name, slogan, description, whatsapp, logoUrl, coverUrl, slug, tokens, products }: IdentityFormProps) {
  const [state, action, pending] = useActionState<StoreActionState, FormData>(saveStoreIdentity, {});
  const [draftName, setDraftName] = useState(name);
  const [draftSlogan, setDraftSlogan] = useState(slogan);
  const [draftDescription, setDraftDescription] = useState(description);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [logoUrlState, setLogoUrlState] = useState<string | null>(logoUrl);
  const [coverUrlState, setCoverUrlState] = useState<string | null>(coverUrl);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const removeLogoRef = useRef<HTMLInputElement>(null);
  const removeCoverRef = useRef<HTMLInputElement>(null);

  const previewProducts = products && products.length > 0 ? products : demoProducts;
  const previewLogo = logoPreview ?? logoUrlState;
  const previewCover = coverPreview ?? coverUrlState;

  const pickLogo = (file: File | null) => {
    if (!file) return;
    setLogoPreview(readUrl(file, null));
    setLogoUrlState(null);
    if (removeLogoRef.current) removeLogoRef.current.value = "false";
  };
  const pickCover = (file: File | null) => {
    if (!file) return;
    setCoverPreview(readUrl(file, null));
    setCoverUrlState(null);
    if (removeCoverRef.current) removeCoverRef.current.value = "false";
  };
  const clearLogo = () => {
    setLogoPreview(null); setLogoUrlState(null);
    if (removeLogoRef.current) removeLogoRef.current.value = "true";
    if (logoInputRef.current) logoInputRef.current.value = "";
  };
  const clearCover = () => {
    setCoverPreview(null); setCoverUrlState(null);
    if (removeCoverRef.current) removeCoverRef.current.value = "true";
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  return (
    <div className="identity-layout">
      <form className="identity-form" action={action}>
        <input type="hidden" name="storeId" value={storeId} />
        <input ref={removeLogoRef} type="hidden" name="removeLogo" defaultValue="false" />
        <input ref={removeCoverRef} type="hidden" name="removeCover" defaultValue="false" />

        <section className="identity-card">
          <div className="identity-card-head">
            <span className="identity-step">1</span>
            <div>
              <h2>Identité</h2>
              <p>Le logo et le nom qui représenteront votre boutique, avec une phrase d’accroche (slogan).</p>
            </div>
          </div>

          <div className="logo-field">
            <span className="field-label">Logo</span>
            {previewLogo ? (
              <span className="logo-preview"><img src={previewLogo} alt="Aperçu du logo" />
                <button type="button" className="logo-remove" onClick={clearLogo} aria-label="Retirer le logo">✕</button>
              </span>
            ) : (
              <span className="logo-placeholder">{draftName.charAt(0).toUpperCase() || "V"}</span>
            )}
            <div className="logo-actions">
              <button type="button" className="vf-button vf-button--ghost" onClick={() => logoInputRef.current?.click()}>{previewLogo ? "Remplacer" : "Téléverser un logo"}</button>
              <input ref={logoInputRef} className="visually-hidden" type="file" name="logo" accept="image/png,image/jpeg,image/webp" onChange={(e) => pickLogo(e.target.files?.[0] ?? null)} />
              {previewLogo && <button type="button" className="text-button" onClick={clearLogo}>Retirer</button>}
              <small className="field-hint">PNG, JPG ou WebP · 5 Mo max · idéalement carré et transparent.</small>
            </div>
          </div>

          <label className="field"><span>Nom de la boutique</span>
            <input name="name" value={draftName} onChange={(e) => setDraftName(e.target.value)} maxLength={80} placeholder="Maison Naya" />
          </label>

          <label className="field"><span>Slogan</span>
            <input name="slogan" value={draftSlogan} onChange={(e) => setDraftSlogan(e.target.value)} maxLength={120} placeholder="Des pièces qui vous ressemblent." />
            <small className="field-hint">Une courte phrase qui donne le ton. Affichée en grand sur votre vitrine.</small>
          </label>
        </section>

        <section className="identity-card">
          <div className="identity-card-head">
            <span className="identity-step">2</span>
            <div>
              <h2>Présentation</h2>
              <p>Racontez votre histoire dans la section « À propos » de votre boutique.</p>
            </div>
          </div>
          <label className="field"><span>Présentation</span>
            <textarea name="description" value={draftDescription} onChange={(e) => setDraftDescription(e.target.value)} maxLength={500} rows={5} placeholder="Née d’une passion pour les matières nobles, notre maison crée des pièces uniques…" />
            <small className="field-hint">{draftDescription.length}/500 caractères.</small>
          </label>
        </section>

        <section className="identity-card">
          <div className="identity-card-head">
            <span className="identity-step">3</span>
            <div>
              <h2>Visuel</h2>
              <p>Une grande image de couverture pour habiller le haut de votre vitrine.</p>
            </div>
          </div>
          <label className="field"><span>Image de couverture</span>
            <input ref={coverInputRef} className="visually-hidden" type="file" name="cover" accept="image/png,image/jpeg,image/webp" onChange={(e) => pickCover(e.target.files?.[0] ?? null)} />
            <div className="cover-upload" onClick={() => coverInputRef.current?.click()}>
              {previewCover ? <img src={previewCover} alt="Aperçu de la couverture" /> : <span className="cover-upload-empty">+ <span>Ajouter une couverture</span></span>}
            </div>
          </label>
          <div className="cover-actions">
            {previewCover && <button type="button" className="vf-button vf-button--ghost" onClick={() => coverInputRef.current?.click()}>Remplacer</button>}
            {previewCover && <button type="button" className="text-button" onClick={clearCover}>Retirer</button>}
            <small className="field-hint">Paysage recommandé (1600 × 900).</small>
          </div>
        </section>

        <section className="identity-card">
          <div className="identity-card-head">
            <span className="identity-step">4</span>
            <div>
              <h2>Coordonnées</h2>
              <p>Le numéro WhatsApp qui reçoit les commandes de vos clients.</p>
            </div>
          </div>
          <label className="field"><span>WhatsApp</span>
            <input name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" defaultValue={whatsapp} placeholder="+229 01 45 28 93 99" />
            <small className="field-hint">Format international, avec l’indicatif du pays : +229, +225, +237…</small>
            {state.fieldErrors?.whatsapp && <small className="field-error">{state.fieldErrors.whatsapp[0]}</small>}
          </label>
        </section>

        {state.error && <p className="form-error" role="alert">{state.error}</p>}
        {state.success && <p className="form-success" role="status">{state.success}</p>}
        {state.fieldErrors?.name && <p className="form-error">{state.fieldErrors.name[0]}</p>}
        {state.fieldErrors?.slogan && <p className="form-error">{state.fieldErrors.slogan[0]}</p>}
        {state.fieldErrors?.description && <p className="form-error">{state.fieldErrors.description[0]}</p>}
        <button className="vf-button vf-button--dark identity-submit" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer mon identité"}</button>
      </form>

      <aside className="identity-preview">
        <span className="vf-eyebrow">Aperçu réel</span>
        <div className="identity-preview-frame">
          <div style={themeCssVariables(tokens)}>
            <Storefront tokens={tokens} products={previewProducts} storeName={draftName || "Votre boutique"} slogan={draftSlogan} description={draftDescription} logoUrl={previewLogo} coverUrl={previewCover ?? undefined} slug={slug} disableCheckout />
          </div>
        </div>
      </aside>
    </div>
  );
}
