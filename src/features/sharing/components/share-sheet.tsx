"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { Camera, Check, Copy, ExternalLink, MessageCircle, Share2, ShoppingBag, Store, X } from "lucide-react";
import { formatPrice } from "@/features/storefront/storefront-types";
import { buildFacebookShareUrl, buildShareMessages, buildStoreShareMessages, buildWhatsAppShareUrl, productShareUrl, qrCodeUrl, storeShareUrl, type SharePayload } from "../share";

type ShareMessages = { whatsapp: string; facebook: string; instagram: string };
type ShareDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow: string;
  description: string;
  url: string;
  urlLabel: string;
  preview: React.ReactNode;
  messages: ShareMessages;
};

function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    return Promise.resolve(navigator.clipboard.writeText(text).then(() => true, () => fallbackCopy(text)));
  }
  return Promise.resolve(fallbackCopy(text));
}
function fallbackCopy(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function ShareDialog({ open, onClose, title, eyebrow, description, url, urlLabel, preview, messages }: ShareDialogProps) {
  const [copied, setCopied] = useState<"link" | "whatsapp" | "instagram" | null>(null);
  const [showQr, setShowQr] = useState(false);
  if (!open) return null;

  const flash = (label: "link" | "whatsapp" | "instagram") => {
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1800);
  };
  const onCopied = (label: "link" | "whatsapp" | "instagram", text: string) => {
    void copyText(text).then((ok) => {
      if (ok) flash(label);
    });
  };

  return (
    <div className="share-modal-backdrop" onClick={onClose}>
      <div className="share-modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-head">
          <div className="share-modal-title">
            <span className="share-modal-icon">{title === "Partager ma boutique" ? <Store size={18} aria-hidden="true" /> : <ShoppingBag size={18} aria-hidden="true" />}</span>
            <span className="share-modal-title-text"><strong>{title}</strong><small>{eyebrow}</small></span>
          </div>
          <button className="share-close" type="button" aria-label="Fermer" onClick={onClose}><X size={18} /></button>
        </div>
        {preview}
        <p className="share-modal-desc">{description}</p>
        <div className="share-url-block">
          <span className="share-url-label">{urlLabel}</span>
          <div className="share-url">{url}</div>
        </div>
        <div className="share-actions">
          <button className="share-action share-action--copy" type="button" onClick={() => onCopied("link", url)}>
            <Copy size={17} aria-hidden="true" /> Copier le lien
          </button>
          <button className="share-action share-action--whatsapp" type="button" onClick={() => { onCopied("whatsapp", messages.whatsapp); window.open(buildWhatsAppShareUrl(messages.whatsapp), "_blank", "noopener"); }}>
            <MessageCircle size={17} aria-hidden="true" /> Partager sur WhatsApp
          </button>
        </div>
        <div aria-live="polite">
          {copied === "link" && <p className="share-feedback"><Check size={14} aria-hidden="true" /> Lien copié</p>}
          {copied === "whatsapp" && <p className="share-feedback"><Check size={14} aria-hidden="true" /> Message copié — coller dans WhatsApp</p>}
          {copied === "instagram" && <p className="share-feedback"><Check size={14} aria-hidden="true" /> Texte copié pour Instagram</p>}
        </div>
        <div className="share-secondary">
          <button className="share-option" type="button" onClick={() => window.open(buildFacebookShareUrl(url), "_blank", "noopener")}><ExternalLink size={15} aria-hidden="true" /><span>Facebook</span></button>
          <button className="share-option" type="button" onClick={() => onCopied("instagram", messages.instagram)}><Camera size={15} aria-hidden="true" /><span>Instagram</span></button>
          <button className="share-option" type="button" onClick={() => setShowQr((v) => !v)} aria-expanded={showQr}><Share2 size={15} aria-hidden="true" /><span>{showQr ? "Masquer le QR" : "QR code"}</span></button>
        </div>
        {showQr && <div className="share-qr-block"><img className="share-qr-img" src={qrCodeUrl(url)} alt={`QR code vers ${url}`} width={140} height={140} /></div>}
      </div>
    </div>
  );
}

const realBaseUrl = () => (typeof window !== "undefined" ? window.location.origin : "https://mystorey.app");

export function ShareSheet({ product, storeSlug, label = "Partager" }: { product: { id: string; name: string; price: number; imageUrl?: string | null; available?: boolean }; storeSlug: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const baseUrl = realBaseUrl();
  const payload: SharePayload = { title: product.name, price: product.price, productId: product.id, storeSlug, baseUrl };
  const url = productShareUrl(payload);
  const available = product.available !== false;
  return (
    <div className="share-wrap">
      <button className="share-trigger" type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Share2 size={15} aria-hidden="true" />
        {label}
      </button>
      <ShareDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Partager ce produit"
        eyebrow="Ouverture directe sur ce produit"
        description="Ce lien ouvre directement la page de ce produit dans votre boutique."
        url={url}
        urlLabel="Lien du produit"
        messages={buildShareMessages(payload)}
        preview={
          <div className="share-preview">
            {product.imageUrl ? <img className="share-preview-img" src={product.imageUrl} alt="" /> : <span className="share-preview-img share-preview-img--empty" />}
            <div className="share-preview-meta">
              <strong>{product.name}</strong>
              <span className="share-preview-price">{formatPrice(product.price)}</span>
              <span className={`tag ${available ? "tag--ok" : ""}`}>{available ? "En vente" : "Indisponible"}</span>
            </div>
          </div>
        }
      />
    </div>
  );
}

export function StoreShareSheet({ storeName, storeSlug }: { storeName: string; storeSlug: string }) {
  const [open, setOpen] = useState(false);
  const baseUrl = realBaseUrl();
  const url = storeShareUrl(storeSlug, baseUrl);
  return (
    <div className="share-wrap">
      <button className="share-trigger share-trigger--store" type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Share2 size={15} aria-hidden="true" />
        Partager ma boutique
      </button>
      <ShareDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Partager ma boutique"
        eyebrow="Tous les produits de la boutique"
        description="Ce lien permet à vos clients de découvrir tous les produits disponibles dans votre boutique."
        url={url}
        urlLabel="Lien de la boutique"
        messages={buildStoreShareMessages(storeName, storeSlug, baseUrl)}
        preview={
          <div className="share-preview share-preview--store">
            <span className="share-preview-logo">{storeName.charAt(0).toUpperCase() || "V"}</span>
            <div className="share-preview-meta">
              <strong>{storeName}</strong>
              <span className="share-preview-price">Boutique en ligne</span>
              <span className="tag tag--ok">Publiée</span>
            </div>
          </div>
        }
      />
    </div>
  );
}