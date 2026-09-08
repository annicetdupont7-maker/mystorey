"use client";
import { useActionState, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { saveTheme } from "../actions";
import { THEME_PRESETS } from "@/features/themes/presets";
import { resolveStoreTheme, themeCssVariables } from "@/features/themes/resolve-theme";
import type { PresetId, StoreTheme, ThemeTokens } from "@/features/themes/theme-schema";
import { Storefront } from "@/features/storefront/components";
import { demoProducts, type ProductView } from "@/features/storefront/storefront-types";

type AppearanceEditorProps = { storeId: string; initialPreset: PresetId; initialOverrides?: StoreTheme["overrides"]; initialLayout?: StoreTheme["layout"]; storeName?: string; storeSlogan?: string; storeDescription?: string; storeLogoUrl?: string | null; storeCoverUrl?: string | null; storeSlug?: string; storeStatus?: string; products?: ProductView[]; whatsapp?: string | null };
type ButtonStyle = ThemeTokens["components"]["buttonStyle"];
type CardStyle = ThemeTokens["components"]["cardStyle"];
type HeaderStyle = ThemeTokens["layout"]["headerStyle"];
type HeroVariant = ThemeTokens["layout"]["heroVariant"];
type Spacing = ThemeTokens["layout"]["spacing"];
type CatalogLayout = ThemeTokens["layout"]["catalogLayout"];

export function AppearanceEditor({ storeId, initialPreset, initialOverrides, initialLayout, storeName = "Votre boutique", storeSlogan, storeDescription, storeLogoUrl, storeCoverUrl, storeSlug, storeStatus, products = demoProducts, whatsapp }: AppearanceEditorProps) {
  const defaults = THEME_PRESETS[initialPreset].tokens;
  const [preset, setPreset] = useState<PresetId>(initialPreset);
  const [primary, setPrimary] = useState(initialOverrides?.colors?.primary ?? "");
  const [secondary, setSecondary] = useState(initialOverrides?.colors?.secondary ?? "");
  const [accent, setAccent] = useState(initialOverrides?.colors?.accent ?? "");
  const [background, setBackground] = useState(initialOverrides?.colors?.background ?? "");
  const [buttonStyle, setButtonStyle] = useState<ButtonStyle>(initialOverrides?.components?.buttonStyle ?? defaults.components.buttonStyle);
  const [cardStyle, setCardStyle] = useState<CardStyle>(initialOverrides?.components?.cardStyle ?? defaults.components.cardStyle);
  const [radius, setRadius] = useState(initialOverrides?.components?.radius ?? defaults.components.radius);
  const [catalogLayout, setCatalogLayout] = useState<CatalogLayout>(initialLayout?.catalogLayout ?? defaults.layout.catalogLayout);
  const [columns, setColumns] = useState(initialLayout?.columns ?? defaults.layout.columns);
  const [headerStyle, setHeaderStyle] = useState<HeaderStyle>(initialLayout?.headerStyle ?? defaults.layout.headerStyle);
  const [heroVariant, setHeroVariant] = useState<HeroVariant>(initialLayout?.heroVariant ?? defaults.layout.heroVariant);
  const [spacing, setSpacing] = useState<Spacing>(initialLayout?.spacing ?? defaults.layout.spacing);
  const resetFlag = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(saveTheme, {});

  const config = useMemo<StoreTheme>(() => {
    const overrides: StoreTheme["overrides"] = {};
    const colors = Object.fromEntries(
      Object.entries({ primary, secondary, accent, background }).filter(([, value]) => value),
    );
    if (Object.keys(colors).length > 0) overrides.colors = colors;
    overrides.components = { buttonStyle, cardStyle, radius };
    return { preset_id: preset, overrides, layout: { catalogLayout, columns, headerStyle, heroVariant, spacing }, version: 1 };
  }, [preset, primary, secondary, accent, background, buttonStyle, cardStyle, radius, catalogLayout, columns, headerStyle, heroVariant, spacing]);

  const { tokens } = resolveStoreTheme(config);

  const resetTheme = () => {
    const d = THEME_PRESETS[preset].tokens;
    flushSync(() => {
      setPrimary(""); setSecondary(""); setAccent(""); setBackground("");
      setButtonStyle(d.components.buttonStyle); setCardStyle(d.components.cardStyle); setRadius(d.components.radius);
      setCatalogLayout(d.layout.catalogLayout); setColumns(d.layout.columns); setHeaderStyle(d.layout.headerStyle); setHeroVariant(d.layout.heroVariant); setSpacing(d.layout.spacing);
    });
    if (resetFlag.current) resetFlag.current.value = "true";
    formRef.current?.requestSubmit();
  };

  const colorOf = (value: string, fallback: string) => value || fallback;

  const applyPresetDefaults = (next: PresetId) => {
    const d = THEME_PRESETS[next].tokens;
    setPreset(next);
    setPrimary(""); setSecondary(""); setAccent(""); setBackground("");
    setButtonStyle(d.components.buttonStyle); setCardStyle(d.components.cardStyle); setRadius(d.components.radius);
    setCatalogLayout(d.layout.catalogLayout); setColumns(d.layout.columns); setHeaderStyle(d.layout.headerStyle); setHeroVariant(d.layout.heroVariant); setSpacing(d.layout.spacing);
  };

  const publicUrl = storeSlug ? `/store/${storeSlug}` : "/dashboard";
  const isPublished = storeStatus === "published" || state.success === "Thème publié.";
  return <form ref={formRef} action={action} className="appearance-editor">
    <input type="hidden" name="storeId" value={storeId} />
    <input type="hidden" name="presetId" value={preset} />
    <input type="hidden" name="overrides" value={JSON.stringify(config.overrides ?? {})} />
    <input type="hidden" name="layout" value={JSON.stringify(config.layout)} />
    <input ref={resetFlag} type="hidden" name="reset" defaultValue="false" />
    <aside className="appearance-controls">
      <p className="vf-eyebrow">Apparence</p>
      <h1>Votre univers de marque.</h1>
      <p className="muted">Un thème définit les couleurs, la mise en page et l’ambiance de votre vitrine. Gardez le thème proposé ou personnalisez-le, puis publiez.</p>

      <label className="field"><span>Thème de départ</span>
        <select value={preset} onChange={(e) => applyPresetDefaults(e.target.value as PresetId)}>
          {Object.values(THEME_PRESETS).map((item) => <option key={item.id} value={item.id}>{item.label} — {item.mood}</option>)}
        </select>
      </label>

      <fieldset className="field-group">
        <legend>Palette</legend>
        <div className="color-grid">
          {([
            ["Couleur principale", primary, setPrimary, tokens.colors.primary],
            ["Couleur secondaire", secondary, setSecondary, tokens.colors.secondary],
            ["Accent", accent, setAccent, tokens.colors.accent],
            ["Arrière-plan", background, setBackground, tokens.colors.background],
          ] as const).map(([label, value, setter, fallback]) => (
            <label className="field" key={label}><span>{label}</span>
              <input type="color" value={colorOf(value, fallback)} onChange={(e) => setter(e.target.value)} />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="field-group">
        <legend>Boutons & cartes</legend>
        <label className="field"><span>Style des boutons</span>
          <select value={buttonStyle} onChange={(e) => setButtonStyle(e.target.value as ButtonStyle)}>
            <option value="soft">Arrondis doux</option><option value="sharp">Angulaires</option><option value="pill">Pilule</option>
          </select>
        </label>
        <label className="field"><span>Style des cartes</span>
          <select value={cardStyle} onChange={(e) => setCardStyle(e.target.value as CardStyle)}>
            <option value="flat">Plates</option><option value="outlined">Contour</option><option value="elevated">Élevées</option>
          </select>
        </label>
        <label className="field"><span>Arrondi (px)</span>
          <input type="range" min={0} max={32} value={radius} onChange={(e) => setRadius(Number(e.target.value))} />
          <small className="field-hint">{radius}px</small>
        </label>
      </fieldset>

      <fieldset className="field-group">
        <legend>Disposition</legend>
        <label className="field"><span>Disposition catalogue</span>
          <select value={catalogLayout} onChange={(e) => setCatalogLayout(e.target.value as CatalogLayout)}>
            <option value="grid">Grille</option><option value="list">Liste</option>
          </select>
        </label>
        <label className="field"><span>Colonnes (desktop)</span>
          <input type="number" min={2} max={4} value={columns} onChange={(e) => setColumns(Math.min(4, Math.max(2, Number(e.target.value) || 2)))} />
        </label>
        <label className="field"><span>Espacement</span>
          <select value={spacing} onChange={(e) => setSpacing(e.target.value as Spacing)}>
            <option value="compact">Compact</option><option value="comfortable">Confortable</option><option value="airy">Aéré</option>
          </select>
        </label>
      </fieldset>

      <fieldset className="field-group">
        <legend>Structure & ambiance</legend>
        <label className="field"><span>Style du haut de page</span>
          <select value={headerStyle} onChange={(e) => setHeaderStyle(e.target.value as HeaderStyle)}>
            <option value="classic">Classique</option><option value="centered">Centré</option><option value="editorial">Éditorial</option>
          </select>
        </label>
        <label className="field"><span>Grande image (hero)</span>
          <select value={heroVariant} onChange={(e) => setHeroVariant(e.target.value as HeroVariant)}>
            <option value="banner">Bannière</option><option value="editorial">Éditorial</option><option value="split">Image + texte</option>
            <option value="featured">Produit vedette</option><option value="compact">Compact</option>
          </select>
        </label>
      </fieldset>

      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      {state.success && <p key={state.successId} className="form-success appearance-notice" role="status">{state.success}</p>}
      <button type="button" className="text-button" onClick={resetTheme} disabled={pending}>Réinitialiser le thème</button>
      <button className="vf-button" name="publish" value="false" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer comme brouillon"}</button>
      <button className="vf-button vf-button--dark appearance-publish-button" name="publish" value="true" disabled={pending}>{pending ? "Publication…" : "Publier ma boutique"}</button>
      {isPublished && <div className="appearance-published" role="status"><strong>🎉 Votre boutique est maintenant en ligne !</strong><div className="appearance-published-actions"><a className="vf-button" href={publicUrl} target="_blank" rel="noopener noreferrer">Voir ma boutique</a><button type="button" className="vf-button vf-button--ghost" onClick={() => navigator.clipboard?.writeText(`${window.location.origin}${publicUrl}`)}>Copier le lien</button><span className="muted">Vous pouvez encore modifier l’apparence.</span></div></div>}
    </aside>
    <section className="appearance-preview">
      <span className="vf-eyebrow">Aperçu réel</span>
      <div style={themeCssVariables(tokens)}><Storefront tokens={tokens} products={products} storeName={storeName} slogan={storeSlogan} description={storeDescription} logoUrl={storeLogoUrl ?? undefined} coverUrl={storeCoverUrl ?? undefined} slug={storeSlug} whatsapp={whatsapp ?? undefined} disableCheckout /></div>
    </section>
  </form>;
}