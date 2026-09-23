"use client";
/* Product media lives in Supabase Storage under dynamic URLs. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowLeft, Check, ChevronRight, MessageCircle, Minus, Plus, ShoppingBag, Star, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useActionState } from "react";
import type { ThemeTokens } from "@/features/themes/theme-schema";
import { buildWhatsAppLink, cartLineName, type CartItem } from "./whatsapp";
import { createCheckoutOrder, type CheckoutActionState } from "@/features/orders/checkout-actions";
import { categoriesWithProducts, filterProductsByCategory, type CategoryRef } from "@/features/categories/filter";
import { formatPrice, type ProductView } from "./storefront-types";
import { useCart } from "./use-cart";
import { PhoneField } from "@/features/phone/phone-field";
import { countryOf } from "@/features/phone/phone";
import {
  availableStock,
  optionGroupLabel,
  requiresVariantChoice,
  sellableVariants,
  variantIsSoldOut,
  variantPrice,
  type ProductVariant,
} from "@/features/variants/types";

/**
 * A shop with no cover photo used to borrow a stock Unsplash photo — every such
 * storefront looked like the same anonymous shop, and it cost a remote request.
 * The fallback is now built from the seller's own theme colours, so an unbranded
 * shop still looks like hers, loads instantly and works offline.
 */
const THEME_BACKDROP = "linear-gradient(135deg, var(--store-primary), var(--store-secondary))";

/**
 * Hero text is white, and some presets have a light primary (the gold of "Maison &
 * Beauté", the orange of "Street & Bold"), so the darkening overlay is applied over
 * the theme gradient too, not only over a photo. Callers that put no text on the
 * surface — the split hero's side panel — pass no overlay and get the bare gradient.
 */
const heroBackground = (coverUrl: string | undefined, overlay?: string) => {
  const layer = coverUrl ? `url(${coverUrl})` : THEME_BACKDROP;
  return overlay ? `${overlay}, ${layer}` : layer;
};

function StoreLogo({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  return (
    <span className="store-logo">
      {logoUrl ? (
        <span className="store-logo-img"><img src={logoUrl} alt="" /></span>
      ) : (
        <span className="store-logo-mark">{name.charAt(0).toUpperCase()}</span>
      )}
      <span>{name}</span>
    </span>
  );
}

const CONTACT_MESSAGE = (storeName: string) => `Bonjour ${storeName} 👋 J’ai vu votre boutique et j’ai une question :`;

/**
 * The header gives a client the two things she looks for first: whose shop this is, and
 * how to ask a question. The WhatsApp button used to exist only inside the cart.
 */
export function StoreHeader({ name = "Maison Naya", logoUrl, catalogHref, whatsapp, onOpenCart, itemCount = 0 }: { name?: string; logoUrl?: string | null; catalogHref?: string; whatsapp?: string; onOpenCart?: () => void; itemCount?: number }) {
  const contact = whatsapp ? buildWhatsAppLink(whatsapp, CONTACT_MESSAGE(name)) : null;
  return (
    <header className="store-container store-header">
      {catalogHref ? <Link href={catalogHref} className="store-logo-link">{<StoreLogo name={name} logoUrl={logoUrl} />}</Link> : <StoreLogo name={name} logoUrl={logoUrl} />}
      <div className="store-header-actions">
        {contact && (
          <a className="store-contact" href={contact} target="_blank" rel="noopener noreferrer" aria-label="Poser une question sur WhatsApp">
            <MessageCircle size={16} aria-hidden="true" /> <span>WhatsApp</span>
          </a>
        )}
        {onOpenCart && (
          <button type="button" className="store-header-cart" onClick={onOpenCart} aria-label={`Voir mon panier (${itemCount} article${itemCount > 1 ? "s" : ""})`}>
            <ShoppingBag size={17} aria-hidden="true" />
            {itemCount > 0 && <span className="store-header-cart-count">{itemCount}</span>}
          </button>
        )}
      </div>
    </header>
  );
}

type HeroProps = { name?: string; slogan?: string; description?: string; coverUrl?: string; logoUrl?: string | null };

// With no slogan the headline used to just repeat the shop name, which the eyebrow and the
// header already show. A welcome line reads like the seller's own shop and fits any trade.
const heroTitle = (name: string | undefined, slogan: string | undefined) =>
  slogan?.trim() || (name ? `Bienvenue chez ${name}` : "Bienvenue dans notre boutique");
const heroBlurb = (description: string | undefined) => description || "Découvrez nos produits, ajoutez-les au panier et commandez en quelques secondes.";

function HeroLogo({ logoUrl, name }: { logoUrl?: string | null; name: string }) {
  if (!logoUrl) return null;
  return <span className="store-hero-logo"><img src={logoUrl} alt={name} /></span>;
}

function HeroEditorial({ name = "", slogan, description, coverUrl, logoUrl }: HeroProps) {
  return (
    <section className="store-container">
      <div className="store-hero store-hero--editorial" style={{ backgroundImage: heroBackground(coverUrl, "linear-gradient(90deg, color-mix(in srgb, var(--store-primary), #000 78%) 0%, color-mix(in srgb, var(--store-primary), #000 35%) 55%, transparent 100%)") }}>
        <div className="store-hero-content">
          <HeroLogo logoUrl={logoUrl} name={name} />
          <span className="vf-eyebrow" style={{ color: "inherit" }}>{name || "Votre boutique"}</span>
          <h1>{heroTitle(name, slogan)}</h1>
          <p>{heroBlurb(description)}</p>
        </div>
      </div>
    </section>
  );
}

function HeroSplit({ name = "", slogan, description, coverUrl, logoUrl }: HeroProps) {
  return (
    <section className="store-container">
      <div className="store-hero store-hero--split">
        <div className="store-hero-content">
          <HeroLogo logoUrl={logoUrl} name={name} />
          <span className="vf-eyebrow">{name || "Votre boutique"}</span>
          <h1>{heroTitle(name, slogan)}</h1>
          <p>{heroBlurb(description)}</p>
          <a className="store-button store-hero-cta" href="#catalogue">Voir les produits <span aria-hidden="true">→</span></a>
        </div>
        <div className="store-hero-media" style={{ backgroundImage: heroBackground(coverUrl) }} aria-hidden="true" />
      </div>
    </section>
  );
}

function HeroCompact({ name = "", slogan, description, coverUrl, logoUrl }: HeroProps) {
  return (
    <section className="store-container">
      <div className="store-hero store-hero--compact" style={{ backgroundImage: heroBackground(coverUrl, "linear-gradient(100deg, color-mix(in srgb, var(--store-primary), #000 72%), color-mix(in srgb, var(--store-primary), #000 15%))") }}>
        <div className="store-hero-content">
          <HeroLogo logoUrl={logoUrl} name={name} />
          <span className="vf-eyebrow" style={{ color: "inherit" }}>{name || "Votre boutique"}</span>
          <h1>{heroTitle(name, slogan)}</h1>
          <p>{heroBlurb(description)}</p>
        </div>
      </div>
    </section>
  );
}

function HeroBanner({ name = "", slogan, description, coverUrl, logoUrl }: HeroProps) {
  return (
    <section className="store-container">
      <div className="store-hero store-hero--banner" style={{ backgroundImage: heroBackground(coverUrl, "linear-gradient(90deg, rgba(0,0,0,.72), rgba(0,0,0,.25))") }}>
        <div className="store-hero-content">
          <HeroLogo logoUrl={logoUrl} name={name} />
          <span className="vf-eyebrow" style={{ color: "inherit" }}>{name || "Votre boutique"}</span>
          <h1>{heroTitle(name, slogan)}</h1>
          <p>{heroBlurb(description)}</p>
        </div>
      </div>
    </section>
  );
}

function HeroFeatured({ product, name, slogan, onAdd, storeSlug }: { product: ProductView; name?: string; slogan?: string; onAdd: (p: ProductView) => void; storeSlug?: string }) {
  const href = storeSlug ? `/store/${storeSlug}/produit/${product.id}` : null;
  return (
    <section className="store-container">
      <div className="store-hero store-hero--featured">
        <div className="store-hero-media" style={{ backgroundImage: product.image ? `url(${product.image})` : `linear-gradient(135deg, var(--store-primary), var(--store-secondary))` }} aria-hidden="true" />
        <div className="store-hero-content">
          <span className="vf-eyebrow">{slogan || name || "À la une"}</span>
          <h1>{product.name}</h1>
          <p>{product.note || "La pièce à découvrir absolument."}</p>
          <div className="store-hero-price">
            <strong>{product.price}</strong>
            {product.hasVariants && href
              ? <Link className="store-button" href={href}>Choisir <ChevronRight size={16} aria-hidden="true" /></Link>
              : <button className="store-button" onClick={() => onAdd(product)}><ShoppingBag size={16} aria-hidden="true" /> Ajouter au panier</button>}
          </div>
        </div>
      </div>
    </section>
  );
}

export function StoreHero({ name, slogan, description, coverUrl, logoUrl, products, heroVariant, onAdd, storeSlug }: {
  name?: string; slogan?: string; description?: string; coverUrl?: string; logoUrl?: string | null; products: ProductView[]; heroVariant: ThemeTokens["layout"]["heroVariant"]; onAdd: (p: ProductView) => void; storeSlug?: string;
}) {
  if (heroVariant === "featured" && products.length > 0) {
    return <HeroFeatured product={products.find((p) => p.featured) ?? products[0]} name={name} slogan={slogan} onAdd={onAdd} storeSlug={storeSlug} />;
  }
  if (heroVariant === "editorial") return <HeroEditorial name={name} slogan={slogan} description={description} coverUrl={coverUrl} logoUrl={logoUrl} />;
  if (heroVariant === "split") return <HeroSplit name={name} slogan={slogan} description={description} coverUrl={coverUrl} logoUrl={logoUrl} />;
  if (heroVariant === "compact") return <HeroCompact name={name} slogan={slogan} description={description} coverUrl={coverUrl} logoUrl={logoUrl} />;
  return <HeroBanner name={name} slogan={slogan} description={description} coverUrl={coverUrl} logoUrl={logoUrl} />;
}

export function AddToCartButton({ onAdd, label = "Ajouter" }: { onAdd: () => void; label?: string }) {
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const handle = () => { onAdd(); setAdded(true); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setAdded(false), 1400); };
  return <button type="button" className={`store-button${added ? " is-added" : ""}`} onClick={handle}>{added ? <><Check size={15} aria-hidden="true" /> Ajouté</> : <><ShoppingBag size={16} aria-hidden="true" /> {label}</>}</button>;
}

export function ProductImage({ product }: { product: ProductView }) {
  return product.image ? <img className="product-image" src={product.image} alt={product.name} loading="lazy" decoding="async" /> : <div className="product-image product-image--empty" aria-label="Sans visuel" />;
}

/**
 * The photo and the name open the product page. A product sold in several colours or
 * sizes shows "Choisir" instead of "Ajouter": the choice happens on its page, so the
 * cart never receives an item without the option the client wanted.
 *
 * Without `storeSlug` — the seller's live preview, the admin read-only preview — the
 * card stays inert instead of navigating out of the editor.
 */
export function ProductCard({ product, onAdd, storeSlug }: { product: ProductView; onAdd: (p: ProductView) => void; storeSlug?: string }) {
  const href = storeSlug ? `/store/${storeSlug}/produit/${product.id}` : null;
  return (
    <article className="product-card">
      <div className="product-media">
        {href ? (
          <Link className="product-media-link" href={href} tabIndex={-1} aria-hidden="true">
            <ProductImage product={product} />
          </Link>
        ) : (
          <ProductImage product={product} />
        )}
        {product.featured && <span className="product-badge"><Star size={11} aria-hidden="true" /> À la une</span>}
        {product.images.length > 1 && <span className="product-photo-count" aria-label={`${product.images.length} photos`}>{product.images.length} photos</span>}
      </div>
      <div className="product-details">
        <h3 className="product-name">
          {href ? <Link className="product-name-link" href={href}>{product.name}</Link> : product.name}
        </h3>
        {product.note && <p className="product-note">{product.note}</p>}
        <div className="product-bottom">
          <span className="product-price">{product.price}</span>
          {product.hasVariants && href
            ? <Link className="store-button" href={href}>Choisir <ChevronRight size={15} aria-hidden="true" /></Link>
            : <AddToCartButton onAdd={() => onAdd(product)} />}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, tokens, onAdd, id = "catalogue", storeSlug }: { products: ProductView[]; tokens: ThemeTokens; onAdd: (p: ProductView) => void; id?: string; storeSlug?: string }) {
  const ordered = [...products].sort((a, b) => Number(b.featured) - Number(a.featured));
  if (products.length === 0) return <section className="store-container"><p className="product-empty">Les produits arrivent bientôt. Revenez très vite !</p></section>;
  return (
    <section id={id} className={`store-container ${tokens.layout.catalogLayout === "grid" ? "product-grid" : ""}`} aria-label="Produits">
      <h2 className="catalogue-title">{products.some((p) => p.featured) ? "Nos pièces" : "Nos produits"} <small>{products.length}</small></h2>
      {tokens.layout.catalogLayout === "grid" ? ordered.map((p) => <ProductCard key={p.id} product={p} onAdd={onAdd} storeSlug={storeSlug} />) : <ProductList products={ordered} onAdd={onAdd} storeSlug={storeSlug} />}
    </section>
  );
}

export function ProductList({ products, onAdd, storeSlug }: { products: ProductView[]; onAdd: (p: ProductView) => void; storeSlug?: string }) {
  return <div className="product-list">{products.map((p) => <ProductCard key={p.id} product={p} onAdd={onAdd} storeSlug={storeSlug} />)}</div>;
}

function copyTextToClipboard(text: string): boolean {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => undefined);
    return true;
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch { ok = false; }
  document.body.removeChild(area);
  return ok;
}

function CheckoutSuccess({ success, onDone }: { success: NonNullable<CheckoutActionState["success"]>; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const handleCopy = () => { if (!copyTextToClipboard(success.message)) return; setCopied(true); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setCopied(false), 1600); };
  return (
    <div className="cart-checkout-done" aria-live="polite">
      <span className="checkout-done-icon" aria-hidden="true"><Check size={26} /></span>
      <p className="checkout-title">Commande {success.orderNumber ? `n° ${success.orderNumber}` : ""} enregistrée !</p>
      <p className="cart-done-sub">Dernière étape : envoyez-la à <strong>{success.storeName}</strong> sur WhatsApp. Elle vous confirmera la disponibilité et la livraison.</p>
      <a className="store-button cart-done-main" href={success.waLink} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} aria-hidden="true" /> Envoyer sur WhatsApp</a>
      <button type="button" className="store-button store-button--secondary" onClick={handleCopy}>{copied ? <><Check size={15} aria-hidden="true" /> Message copié</> : "Copier le message"}</button>
      <p className="cart-done-total">Total : {formatPrice(success.total)}</p>
      <button type="button" className="text-button checkout-back" onClick={onDone}>Retour à la boutique</button>
    </div>
  );
}

function CheckoutForm({ items, storeSlug, whatsapp, onBack, onOrdered, onFinish }: { items: CartItem[]; storeSlug: string; whatsapp?: string; onBack: () => void; onOrdered: () => void; onFinish: () => void }) {
  const [state, action, pending] = useActionState(createCheckoutOrder, {});
  const ordered = useRef(false);
  useEffect(() => {
    // The order exists: empty the cart once so "Retour" cannot send it twice.
    if (state.success && !ordered.current) { ordered.current = true; onOrdered(); }
  }, [state.success, onOrdered]);
  if (state.success) return <CheckoutSuccess success={state.success} onDone={onFinish} />;
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  return (
    <form className="checkout-form" action={action}>
      <input type="hidden" name="storeSlug" value={storeSlug} />
      {/* Only ids and quantities travel: the server recomputes every price and total
          from the database, so a tampered payload cannot change what is charged. */}
      <input type="hidden" name="cart" value={JSON.stringify(items.map((i) => ({ productId: i.id, variantId: i.variantId ?? null, quantity: i.quantity })))} />
      {/* Piège à robots : hors du flux, hors du focus et hors des lecteurs d'écran,
          donc une cliente ne peut pas le remplir. Un script qui remplit tous les
          champs se trahit. La vraie limite reste celle de la base. */}
      <div className="checkout-trap" aria-hidden="true">
        <label htmlFor="checkout-website">Ne remplissez pas ce champ</label>
        <input id="checkout-website" type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      <ul className="checkout-recap" aria-label="Récapitulatif">
        {items.map((item) => <li key={item.key}><span>{item.quantity} × {cartLineName(item)}</span><strong>{formatPrice(item.unitPrice * item.quantity)}</strong></li>)}
      </ul>
      <p className="checkout-title">Vos coordonnées</p>
      <label className="cart-field"><span>Votre nom</span><input name="customerName" required maxLength={120} placeholder="Prénom et nom" autoComplete="name" /></label>
      {state.fieldErrors?.customerName && <p className="form-error">{state.fieldErrors.customerName[0]}</p>}
      <PhoneField name="customerPhone" label="Votre numéro (WhatsApp de préférence)" defaultCountry={countryOf(whatsapp)} required error={state.fieldErrors?.customerPhone?.[0]} hint="Pour que la boutique puisse vous recontacter." />
      <label className="cart-field"><span>Lieu de livraison</span><input name="customerAddress" maxLength={250} placeholder="Quartier, ville, point de repère…" autoComplete="street-address" /></label>
      {state.fieldErrors?.customerAddress && <p className="form-error">{state.fieldErrors.customerAddress[0]}</p>}
      <label className="cart-field"><span>Précision <small>(facultatif)</small></span><textarea name="note" rows={2} maxLength={500} placeholder="Taille, couleur, heure de livraison…" /></label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <p className="cart-row"><span>Total</span><strong>{formatPrice(subtotal)}</strong></p>
      <button type="submit" className="store-button checkout-submit" disabled={pending}>{pending ? "Enregistrement…" : "Valider ma commande"}</button>
      <p className="checkout-hint">Rien à payer maintenant. Votre commande est enregistrée, puis WhatsApp s’ouvre pour l’envoyer à la boutique.</p>
      <button type="button" className="text-button checkout-back" onClick={onBack}><ArrowLeft size={14} aria-hidden="true" /> Modifier mon panier</button>
    </form>
  );
}

export function CartDrawer({ items, onClose, onChangeQty, onRemove, onClear, whatsapp, storeSlug, disableCheckout }: { items: CartItem[]; onClose: () => void; onChangeQty: (id: string, delta: number) => void; onRemove?: (id: string) => void; onClear: () => void; whatsapp?: string; storeName?: string; storeSlug?: string; disableCheckout?: boolean }) {
  const [step, setStep] = useState<"cart" | "checkout">("cart");
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const canCheckout = Boolean(whatsapp && storeSlug && !disableCheckout);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <>
      <button type="button" className="cart-backdrop" aria-label="Fermer le panier" onClick={onClose} />
      <aside className="cart-drawer" role="dialog" aria-modal="true" aria-label={step === "cart" ? "Votre panier" : "Finaliser la commande"}>
        <div className="cart-drawer-head">
          <strong>{step === "cart" ? `Mon panier · ${itemCount} article${itemCount > 1 ? "s" : ""}` : "Finaliser ma commande"}</strong>
          <button className="cart-close" aria-label="Fermer" onClick={onClose}><X size={18} /></button>
        </div>
        {step === "checkout" && canCheckout ? (
          <CheckoutForm items={items} storeSlug={storeSlug as string} whatsapp={whatsapp} onBack={() => setStep("cart")} onOrdered={onClear} onFinish={onClose} />
        ) : items.length === 0 ? (
          <div className="cart-empty"><ShoppingBag size={24} aria-hidden="true" /><p>Votre panier est vide.</p><button type="button" className="store-button store-button--secondary" onClick={onClose}>Voir les produits</button></div>
        ) : (
          <>
            <ul className="cart-lines">
              {items.map((item) => {
                const label = cartLineName(item);
                return (
                  <li className="cart-line" key={item.key}>
                    <div className="cart-line-info"><span>{label}</span><small>{formatPrice(item.unitPrice)} l&apos;unité</small></div>
                    <div className="cart-qty">
                      <button type="button" aria-label={`Retirer un ${label}`} onClick={() => onChangeQty(item.key, -1)}><Minus size={14} /></button>
                      <span aria-live="polite">{item.quantity}</span>
                      <button type="button" aria-label={`Ajouter un ${label}`} onClick={() => onChangeQty(item.key, 1)}><Plus size={14} /></button>
                    </div>
                    <strong className="cart-line-total">{formatPrice(item.unitPrice * item.quantity)}</strong>
                    {onRemove && <button type="button" className="cart-line-remove" aria-label={`Supprimer ${label} du panier`} onClick={() => onRemove(item.key)}><Trash2 size={14} /></button>}
                  </li>
                );
              })}
            </ul>
            <div className="cart-row cart-total"><span>Total</span><strong>{formatPrice(subtotal)}</strong></div>
            {disableCheckout ? (
              <p className="cart-note">Aperçu — la commande est désactivée ici.</p>
            ) : canCheckout ? (
              <button type="button" className="store-button checkout-cta" onClick={() => setStep("checkout")}>Commander · {formatPrice(subtotal)}</button>
            ) : (
              <p className="cart-note">Cette boutique ne reçoit pas encore de commandes en ligne. Revenez bientôt !</p>
            )}
            <div className="cart-secondary">
              <button type="button" className="text-button" onClick={onClose}><ArrowLeft size={14} aria-hidden="true" /> Continuer mes achats</button>
              <button type="button" className="cart-clear text-button text-button--danger" onClick={() => { if (window.confirm("Vider le panier ?")) onClear(); }}><Trash2 size={14} aria-hidden="true" /> Vider</button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

export function StoreFooter({ name = "Maison Naya" }: { name?: string }) {
  // The credit is the one acquisition channel every storefront carries: a visitor who
  // likes the shop can find out how to open hers.
  return (
    <footer className="store-container store-footer">
      {name} · Une boutique créée avec <Link className="store-footer-link" href="/">MYSTOREY</Link>
    </footer>
  );
}

/** After "Ajouter", say it happened and offer the two obvious next moves. */
function AddedToast({ label, onView, onClose }: { label: string | null; onView: () => void; onClose: () => void }) {
  useEffect(() => {
    if (!label) return;
    const id = setTimeout(onClose, 4000);
    return () => clearTimeout(id);
  }, [label, onClose]);
  if (!label) return null;
  return (
    <div className="added-toast" role="status" aria-live="polite">
      <span className="added-toast-text"><Check size={16} aria-hidden="true" /> <span><strong>{label}</strong> ajouté au panier</span></span>
      <button type="button" className="store-button" onClick={onView}>Voir mon panier</button>
      <button type="button" className="added-toast-close" aria-label="Continuer mes achats" onClick={onClose}><X size={16} /></button>
    </div>
  );
}

function CartBubble({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button className={`cart-bubble${count > 0 ? " is-visible" : ""}`} aria-label={`Ouvrir le panier (${count} article${count > 1 ? "s" : ""})`} onClick={onClick}>
      <ShoppingBag size={18} aria-hidden="true" />
      <span className="cart-bubble-count">{count}</span>
    </button>
  );
}

/** "Couleur : Noir Rouge Bleu" — the seller names the group, so it reads naturally. */
function VariantPicker({ variants, productStock, selected, onSelect }: {
  variants: ProductVariant[];
  productStock: number | null;
  selected: ProductVariant | null;
  onSelect: (variant: ProductVariant) => void;
}) {
  const group = optionGroupLabel(variants);
  return (
    <fieldset className="store-variant-picker">
      <legend className="store-variant-legend">{group}{selected ? ` : ${selected.label}` : ""}</legend>
      <div className="store-variant-options" role="radiogroup" aria-label={group}>
        {variants.map((variant) => {
          const soldOut = variantIsSoldOut(variant, productStock);
          const active = selected?.id === variant.id;
          return (
            <button
              key={variant.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={soldOut}
              className={`store-variant-option${active ? " is-active" : ""}${soldOut ? " is-soldout" : ""}${variant.imageUrl ? " has-photo" : ""}`}
              onClick={() => onSelect(variant)}
            >
              {variant.imageUrl && <img src={variant.imageUrl} alt="" />}
              {variant.label}
              {soldOut && <span className="store-variant-soldout"> · épuisé</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function StoreProductPage({ product, storeName, logoUrl, whatsapp, slug, variants = [], productStock = null }: {
  product: ProductView;
  storeName?: string;
  logoUrl?: string | null;
  whatsapp?: string;
  slug: string;
  variants?: ProductVariant[];
  productStock?: number | null;
}) {
  const { items, addItem, changeQty, removeItem, clear, itemCount } = useCart(slug);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const closeToast = useCallback(() => setToast(null), []);
  const usable = useMemo(() => sellableVariants(variants), [variants]);
  const mustChoose = requiresVariantChoice(variants, productStock);
  // Preselect the first choice that can actually be bought: one tap less, and the
  // price and photo on screen always match something orderable.
  const [selected, setSelected] = useState<ProductVariant | null>(
    () => usable.find((variant) => !variantIsSoldOut(variant, productStock)) ?? null,
  );
  const [photo, setPhoto] = useState<string | null>(null);

  const available = product.available !== false;
  const storeHref = `/store/${slug}`;
  const stock = availableStock(selected, productStock);
  const soldOut = stock !== null && stock <= 0;
  const unitPrice = variantPrice(selected, product.unitPrice);
  // A picked colour shows its own photo; tapping a thumbnail shows that one.
  const heroImage = photo ?? selected?.imageUrl ?? product.image;
  const inCart = items.filter((item) => item.id === product.id).reduce((sum, item) => sum + item.quantity, 0);
  const contact = whatsapp ? buildWhatsAppLink(whatsapp, `Bonjour ${storeName ?? ""} 👋 J’ai une question sur « ${product.name}${selected ? ` — ${selected.label}` : ""} » :`) : null;

  const handleAdd = () => {
    addItem(product, mustChoose ? selected : null);
    setToast(mustChoose && selected ? `${product.name} — ${selected.label}` : product.name);
  };

  return (
    <div className="theme-store">
      <StoreHeader name={storeName} logoUrl={logoUrl} catalogHref={storeHref} whatsapp={whatsapp} onOpenCart={available ? () => { setToast(null); setCartOpen(true); } : undefined} itemCount={itemCount} />
      <main className="store-container">
        <Link className="store-back" href={storeHref}><ArrowLeft size={15} aria-hidden="true" /> Tous les produits</Link>
        <div className="store-product-page">
          <div className="store-product-media">
            {heroImage ? <img className="product-image" src={heroImage} alt={product.name} /> : <div className="product-image product-image--empty" aria-label="Sans visuel" />}
            {product.featured && <span className="product-badge"><Star size={11} aria-hidden="true" /> À la une</span>}
            {product.images.length > 1 && (
              <div className="store-product-gallery" aria-label="Photos du produit">
                {product.images.map((image, index) => (
                  <button type="button" key={image} className={`store-product-thumb-button${heroImage === image ? " is-active" : ""}`} onClick={() => setPhoto(image)} aria-label={`Voir la photo ${index + 1}`}>
                    <img src={image} alt="" className="store-product-thumb" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="store-product-info">
            <h1 className="store-product-name">{product.name}</h1>
            {product.note && <p className="store-product-note">{product.note}</p>}
            <p className="store-product-price">{formatPrice(unitPrice)}</p>
            {usable.length > 0 && (
              <VariantPicker variants={usable} productStock={productStock} selected={selected} onSelect={(variant) => { setSelected(variant); setPhoto(null); }} />
            )}
            {stock !== null && stock > 0 && stock <= 5 && (
              <p className="store-product-stock">Plus que {stock} en stock</p>
            )}
            {!available ? (
              <p className="store-product-unavailable">Ce produit est indisponible pour le moment.</p>
            ) : soldOut ? (
              <p className="store-product-unavailable">{selected ? `${selected.label} est épuisé pour le moment.` : "Ce produit est épuisé pour le moment."}</p>
            ) : (
              <div className="store-product-actions">
                <AddToCartButton onAdd={handleAdd} label="Ajouter au panier" />
                {inCart > 0 && <button type="button" className="store-button store-button--secondary" onClick={() => setCartOpen(true)}>Voir mon panier ({itemCount})</button>}
              </div>
            )}
            {product.description && <div className="store-product-description"><h2>Description</h2><p>{product.description}</p></div>}
            {contact && <a className="store-product-question" href={contact} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} aria-hidden="true" /> Une question ? Écrivez à la boutique sur WhatsApp</a>}
          </div>
        </div>
      </main>
      {cartOpen && <CartDrawer items={items} onClose={() => setCartOpen(false)} onChangeQty={changeQty} onRemove={removeItem} onClear={clear} whatsapp={whatsapp} storeName={storeName} storeSlug={slug} />}
      {!cartOpen && <AddedToast label={toast} onView={() => { setToast(null); setCartOpen(true); }} onClose={closeToast} />}
      {!toast && !cartOpen && <CartBubble count={itemCount} onClick={() => setCartOpen(true)} />}
      <StoreFooter name={storeName} />
    </div>
  );
}

export function Storefront({ tokens, products, storeName, slogan, description, whatsapp, coverUrl, logoUrl, slug, categories = [], disableCheckout }: { tokens: ThemeTokens; products: ProductView[]; storeName?: string; slogan?: string; description?: string; whatsapp?: string; coverUrl?: string; logoUrl?: string | null; slug?: string; categories?: CategoryRef[]; disableCheckout?: boolean }) {
  // Previews (seller editor, admin) keep their cart in memory only.
  const { items, addItem, changeQty, removeItem, clear, itemCount } = useCart(disableCheckout ? undefined : slug);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const closeToast = useCallback(() => setToast(null), []);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const addFromCatalogue = (product: ProductView) => {
    addItem(product);
    setToast(product.name);
  };

  const chips = useMemo(() => categoriesWithProducts(categories, products), [categories, products]);
  const visible = useMemo(() => filterProductsByCategory(products, activeCategory), [products, activeCategory]);
  const productSlug = disableCheckout ? undefined : slug;

  return (
    <div className="theme-store">
      <StoreHeader name={storeName} logoUrl={logoUrl} whatsapp={disableCheckout ? undefined : whatsapp} onOpenCart={() => { setToast(null); setCartOpen(true); }} itemCount={itemCount} />
      {/* The hero already carries the slogan as its headline (or eyebrow on the featured
          variant), so no separate tagline strip: it printed the same sentence twice. */}
      <StoreHero name={storeName} slogan={slogan} description={description} coverUrl={coverUrl} logoUrl={logoUrl} products={products} heroVariant={tokens.layout.heroVariant} onAdd={addFromCatalogue} storeSlug={productSlug} />
      {chips.length > 0 && (
        <section id="catalogue" className="store-container store-categories" aria-label="Catégories" role="group">
          <button type="button" className={`category-chip${activeCategory === null ? " is-active" : ""}`} onClick={() => setActiveCategory(null)}>Tous</button>
          {chips.map((c) => (
            <button key={c.id} type="button" className={`category-chip${activeCategory === c.id ? " is-active" : ""}`} onClick={() => setActiveCategory(c.id)}>{c.name}</button>
          ))}
        </section>
      )}
      {/* Product pages are only linked on the real storefront: a preview must not
          navigate the seller (or an admin) out of the editor she is working in. */}
      <ProductGrid products={visible} tokens={tokens} onAdd={addFromCatalogue} id={chips.length > 0 ? undefined : "catalogue"} storeSlug={productSlug} />
      {cartOpen && <CartDrawer items={items} onClose={() => setCartOpen(false)} onChangeQty={changeQty} onRemove={removeItem} onClear={clear} whatsapp={whatsapp} storeName={storeName} storeSlug={slug} disableCheckout={disableCheckout} />}
      {!cartOpen && <AddedToast label={toast} onView={() => { setToast(null); setCartOpen(true); }} onClose={closeToast} />}
      {!toast && !cartOpen && <CartBubble count={itemCount} onClick={() => setCartOpen((v) => !v)} />}
      {description && (
        <section className="store-container store-about" aria-label="À propos de nous">
          <div className="store-about-inner">
            <span className="vf-eyebrow">Notre histoire</span>
            <h2>À propos de {storeName}</h2>
            <p>{description}</p>
          </div>
        </section>
      )}
      <StoreFooter name={storeName} />
    </div>
  );
}
