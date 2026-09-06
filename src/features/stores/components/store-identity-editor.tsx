"use client";
/* eslint-disable @next/next/no-img-element */
import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { saveStoreIdentity } from "@/features/stores/actions";
import type { StoreActionState } from "@/features/stores/actions";

type Store = {
  id: string;
  name: string;
  description?: string | null;
  logo_url?: string | null;
  status: string;
};

export function StoreIdentityEditor({ store }: { store: Store }) {
  const [name, setName] = useState(store.name);
  const [description, setDescription] = useState(store.description || "");
  const [logoPreview, setLogoPreview] = useState<string | null>(store.logo_url || null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [state, formAction] = useActionState(saveStoreIdentity, {} as StoreActionState);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
      setRemoveLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setRemoveLogo(true);
  };

  const handleFormAction = (formData: FormData) => {
    formData.set("storeId", store.id);
    if (logoFile) formData.set("logo", logoFile);
    if (removeLogo) formData.set("removeLogo", "true");
    formData.set("name", name);
    formData.set("description", description);
    formAction(formData);
  };

  return (
    <div className="identity-layout">
      <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "1.5rem" }}>
        <Link href="/dashboard/storefront" className="icon-button" aria-label="Retour">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <p className="vf-eyebrow">Studio de marque</p>
          <h1 style={{ margin: "0.3rem 0 0", fontSize: "clamp(1.6rem, 4vw, 2.2rem)" }}>Identité de la boutique</h1>
        </div>
      </div>

      <div className="identity-editor-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
        {/* Left: Form */}
        <form action={handleFormAction} className="identity-form">
          <div className="identity-card">
            <h2 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 800 }}>Logo de la boutique</h2>
            {logoPreview ? (
              <div style={{ display: "grid", gap: "0.8rem" }}>
                <img src={logoPreview} alt="Logo preview" style={{ width: "100%", height: "auto", borderRadius: "1rem", maxHeight: "200px", objectFit: "cover" }} />
                <button type="button" onClick={handleRemoveLogo} className="vf-button vf-button--ghost" style={{ width: "100%" }}>
                  Supprimer le logo
                </button>
              </div>
            ) : (
              <label style={{ display: "block", cursor: "pointer" }}>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" onChange={handleLogoChange} style={{ display: "none" }} />
                <div
                  style={{ padding: "2rem", borderRadius: "1rem", border: "2px dashed rgba(89, 35, 59, 0.2)", textAlign: "center", cursor: "pointer", transition: "all 0.2s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(89, 35, 59, 0.4)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(89, 35, 59, 0.2)")}
                >
                  <p style={{ margin: "0", fontSize: "0.9rem", fontWeight: 700, color: "var(--ink-soft)" }}>📸 Cliquez pour ajouter un logo</p>
                  <p style={{ margin: "0.3rem 0 0", fontSize: "0.8rem", color: "var(--ink-soft)" }}>JPEG, PNG, WebP ou SVG (5 Mo max)</p>
                </div>
              </label>
            )}
          </div>

          <div className="identity-card">
            <h2 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 800 }}>Nom de la boutique</h2>
            <div className="field">
              <input type="text" placeholder="Ma boutique" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
              <small>{name.length}/100</small>
            </div>
          </div>

          <div className="identity-card">
            <h2 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 800 }}>Description</h2>
            <div className="field">
              <textarea placeholder="Décrivez votre boutique en quelques mots..." value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} style={{ minHeight: "120px" }} />
              <small>{description.length}/500</small>
            </div>
          </div>

          {state.error && <p className="banner-warn">{state.error}</p>}
          {state.success && <p className="banner-inline">{state.success}</p>}

          <button type="submit" className="vf-button" style={{ width: "100%" }}>
            Enregistrer l&apos;identité
          </button>
        </form>

        {/* Right: Live Preview */}
        <div style={{ position: "sticky", top: "1.5rem" }}>
          <div className="identity-card" style={{ textAlign: "center", gap: "1rem" }}>
            <p style={{ margin: "0", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-soft)" }}>Aperçu en direct</p>

            {logoPreview ? (
              <img src={logoPreview} alt="Store logo" style={{ width: "80px", height: "80px", borderRadius: "1.2rem", objectFit: "cover", margin: "0 auto", border: "1px solid rgba(86, 47, 42, 0.08)" }} />
            ) : (
              <div style={{ width: "80px", height: "80px", borderRadius: "1.2rem", background: "linear-gradient(135deg, var(--brand-soft), rgba(217, 100, 74, 0.1))", border: "1.5px solid rgba(217, 100, 74, 0.12)", margin: "0 auto", display: "grid", placeItems: "center", color: "var(--brand)", fontWeight: 800, fontSize: "2rem" }}>
                {name.slice(0, 1).toUpperCase() || "S"}
              </div>
            )}

            <h3 style={{ margin: "0.5rem 0 0", fontSize: "1.1rem", fontWeight: 800, wordBreak: "break-word" }}>{name || "Ma boutique"}</h3>

            {description && (
              <p style={{ margin: "0.4rem 0 0", fontSize: "0.85rem", color: "var(--ink-soft)", lineHeight: "1.5", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {description}
              </p>
            )}

            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", marginTop: "0.8rem", padding: "0.3rem 0.6rem", borderRadius: "999px", background: "rgba(52, 124, 90, 0.1)", color: "#2d7c5a", fontSize: "0.7rem", fontWeight: 800 }}>
              🟢 En ligne
            </span>

            <p style={{ margin: "1rem 0 0", fontSize: "0.8rem", color: "var(--ink-soft)", fontStyle: "italic" }}>C&apos;est comme ça que votre boutique apparaît aux clients</p>
          </div>
        </div>
      </div>
    </div>
  );
}
