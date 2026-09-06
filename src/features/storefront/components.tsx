"use client";
/* Demo catalogue images are remote, dynamic URLs; product media lives in Supabase Storage (Mission 3). */
/* eslint-disable @next/next/no-img-element */
import { Check, MessageCircle, Minus, Plus, ShoppingBag, Star, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useActionState } from "react";
import type { ThemeTokens } from "@/features/themes/theme-schema";
import { buildWhatsAppLink, type CartItem } from "./whatsapp";
import { createCheckoutOrder, type CheckoutActionState } from "@/features/orders/checkout-actions";
import { categoriesWithProducts, filterProductsByCategory, type CategoryRef } from "@/features/categories/filter";
import { formatPrice, type ProductView } from "./storefront-types";

const HERO_IMAGE = "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=55";

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

export function StoreHeader({ name = "Maison Naya", logoUrl, catalogHref }: { name?: string; logoUrl?: string | null; catalogHref?: string }) {
  return (
    <header className="store-container store-header">
      <StoreLogo name={name} logoUrl={logoUrl} />
      <a className="store-link" href={catalogHref ?? "#catalogue"}>{catalogHref ? "Voir la boutique" : "Nos produits"}</a>
    </header>
  );
}

type HeroProps = { name?: string; slogan?: string; description?: string; coverUrl?: string; logoUrl?: string | null };

const heroTitle = (name: string | undefined, slogan: string | undefined) => slogan || (name ? `${name}` : "Des pièces qui vous ressemblent.");
const heroBlurb = (description: string | undefined) => description || "Une sélection pensée avec soin, pour les jours ordinaires comme les grands moments.";

function HeroLogo({ logoUrl, name }: { logoUrl?: string | null; name: string }) {
  if (!logoUrl) return null;
  return <span className="store-hero-logo"><img src={logoUrl} alt={name} /></span>;
}

function HeroEditorial({ name = "", slogan, description, coverUrl, logoUrl }: HeroProps) {
  return (
    <section className="store-container">
      <div className="store-hero store-hero--editorial" style={{ backgroundImage: `linear-gradient(90deg, color-mix(in srgb, var(--store-primary), #000 78%) 0%, color-mix(in srgb, var(--store-primary), #000 35%) 55%, transparent 100%), url(${coverUrl || HERO_IMAGE})` }}>
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
          <a className="store-button store-hero-cta" href="#catalogue">Découvrir <span aria-hidden="true">→</span></a>
        </div>
        <div className="store-hero-media" style={{ backgroundImage: `url(${coverUrl || HERO_IMAGE})` }} aria-hidden="true" />
      </div>
    </section>
  );
}

function HeroCompact({ name = "", slogan, description, coverUrl, logoUrl }: HeroProps) {
  return (
    <section className="store-container">
      <div className="store-hero store-hero--compact" style={{ backgroundImage: `linear-gradient(100deg, color-mix(in srgb, var(--store-primary), #000 72%), color-mix(in srgb, var(--store-primary), #000 15%)), url(${coverUrl || HERO_IMAGE})` }}>
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
      <div className="store-hero store-hero--banner" style={{ backgroundImage: `linear-gradient(90deg, #000a,#0001), url(${coverUrl || HERO_IMAGE})` }}>
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

function HeroFeatured({ product, name, slogan, onAdd }: { product: ProductView; name?: string; slogan?: string; onAdd: (p: ProductView) => void }) {
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
            <button className="store-button" onClick={() => onAdd(product)}><ShoppingBag size={16} aria-hidden="true" /> Ajouter au panier</button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function StoreHero({ name, slogan, description, coverUrl, logoUrl, products, heroVariant, onAdd }: {
  name?: string; slogan?: string; description?: string; coverUrl?: string; logoUrl?: string | null; products: ProductView[]; heroVariant: ThemeTokens["layout"]["heroVariant"]; onAdd: (p: ProductView) => void;
}) {
  if (heroVariant === "featured" && products.length > 0) {
    return <HeroFeatured product={products.find((p) => p.featured) ?? products[0]} name={name} slogan={slogan} onAdd={onAdd} />;
  }
  if (heroVariant === "editorial") return <HeroEditorial name={name} slogan={slogan} description={description} coverUrl={coverUrl} logoUrl={logoUrl} />;
  if (heroVariant === "split") return <HeroSplit name={name} slogan={slogan} description={description} coverUrl={coverUrl} logoUrl={logoUrl} />;
  if (heroVariant === "compact") return <HeroCompact name={name} slogan={slogan} description={description} coverUrl={coverUrl} logoUrl={logoUrl} />;
  return <HeroBanner name={name} slogan={slogan} description={description} coverUrl={coverUrl} logoUrl={logoUrl} />;
}

export function AddToCartButton({ onAdd }: { onAdd: () => void }) {
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const handle = () => { onAdd(); setAdded(true); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setAdded(false), 1400); };
  return <button className={`store-button${added ? " is-added" : ""}`} onClick={handle}>{added ? <><Check size={15} aria-hidden="true" /> Ajouté</> : <><ShoppingBag size={16} aria-hidden="true" /> Ajouter</>}</button>;
}

export function WhatsAppOrderButton({ items, whatsapp }: { items: CartItem[]; whatsapp: string }) {
  const link = buildWhatsAppLink(whatsapp, items.map((i) => `• ${i.name} : ${i.quantity} × ${formatPrice(i.unitPrice)}`).join("\n"));
  if (!link) return null;
  return <a className="store-button store-button--secondary" href={link} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} aria-hidden="true" /> Commander</a>;
}

export function ProductImage({ product }: { product: ProductView }) {
  return product.image ? <img className="product-image" src={product.image} alt={product.name} /> : <div className="product-image product-image--empty" aria-label="Sans visuel" />;
}

export function ProductCard({ product, onAdd }: { product: ProductView; onAdd: (p: ProductView) => void }) {
  return (
    <article className="product-card">
      <div className="product-media">
        <ProductImage product={product} />
        {product.featured && <span className="product-badge"><Star size={11} aria-hidden="true" /> À la une</span>}
      </div>
      <div className="product-details">
        <h3 className="product-name">{product.name}</h3>
        {product.note && <p className="product-note">{product.note}</p>}
        <div className="product-bottom">
          <span className="product-price">{product.price}</span>
          <AddToCartButton onAdd={() => onAdd(product)} />
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, tokens, onAdd, id = "catalogue" }: { products: ProductView[]; tokens: ThemeTokens; onAdd: (p: ProductView) => void; id?: string }) {
  const ordered = [...products].sort((a, b) => Number(b.featured) - Number(a.featured));
  if (products.length === 0) return <section className="store-container"><p className="product-empty">Cette boutique n’a pas encore de produits publiés.</p></section>;
  return (
    <section id={id} className={`store-container ${tokens.layout.catalogLayout === "grid" ? "product-grid" : ""}`} aria-label="Produits">
      <h2 className="catalogue-title">{products.some((p) => p.featured) ? "Nos pièces" : "Le catalogue"}</h2>
      {tokens.layout.catalogLayout === "grid" ? ordered.map((p) => <ProductCard key={p.id} product={p} onAdd={onAdd} />) : <ProductList products={ordered} onAdd={onAdd} />}
    </section>
  );
}

export function ProductList({ products, onAdd }: { products: ProductView[]; onAdd: (p: ProductView) => void }) {
  return <div className="product-list">{products.map((p) => <ProductCard key={p.id} product={p} onAdd={onAdd} />)}</div>;
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

function CheckoutSuccess({ success, onContinue }: { success: NonNullable<CheckoutActionState["success"]>; onContinue: () => void }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const handleCopy = () => { if (!copyTextToClipboard(success.message)) return; setCopied(true); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setCopied(false), 1600); };
  return (
    <div className="cart-checkout-done" aria-live="polite">
      <p className="checkout-title">Commande {success.orderNumber ? `#${success.orderNumber}` : ""} enregistrée ✓</p>
      <p className="cart-done-sub">Envoyez-la à {success.storeName} sur WhatsApp pour finaliser votre achat.</p>
      <a className="store-button cart-done-main" href={success.waLink} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} aria-hidden="true" /> Ouvrir WhatsApp</a>
      <button type="button" className="store-button store-button--secondary" onClick={handleCopy}>{copied ? <><Check size={15} aria-hidden="true" /> Message copié</> : "Copier le message"}</button>
      <p className="cart-done-total">Total : {formatPrice(success.total)}</p>
      <button type="button" className="text-button checkout-back" onClick={onContinue}>Continuer la visite</button>
    </div>
  );
}

function CheckoutForm({ items, storeSlug, onBack }: { items: CartItem[]; storeSlug: string; onBack: () => void }) {
  const [state, action, pending] = useActionState(createCheckoutOrder, {});
  if (state.success) return <CheckoutSuccess success={state.success} onContinue={onBack} />;
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  return (
    <form className="checkout-form" action={action}>
      <input type="hidden" name="storeSlug" value={storeSlug} />
      <input type="hidden" name="cart" value={JSON.stringify(items.map((i) => ({ productId: i.id, quantity: i.quantity })))} />
      <p className="checkout-title">Vos coordonnées</p>
      <label className="cart-field"><span>Nom</span><input name="customerName" required maxLength={120} placeholder="Votre nom" /></label>
      {state.fieldErrors?.customerName && <p className="form-error">{state.fieldErrors.customerName[0]}</p>}
      <label className="cart-field"><span>Téléphone</span><input name="customerPhone" type="tel" maxLength={40} placeholder="+229 00 00 00 00" /></label>
      {state.fieldErrors?.customerPhone && <p className="form-error">{state.fieldErrors.customerPhone[0]}</p>}
      <label className="cart-field"><span>Adresse / lieu de livraison</span><input name="customerAddress" maxLength={250} placeholder="Quartier, ville…" /></label>
      {state.fieldErrors?.customerAddress && <p className="form-error">{state.fieldErrors.customerAddress[0]}</p>}
      <label className="cart-field"><span>Note (optionnelle)</span><textarea name="note" rows={2} maxLength={500} placeholder="Instructions de livraison…" /></label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <p className="cart-row"><span>Total</span><strong>{formatPrice(subtotal)}</strong></p>
      <div className="checkout-actions">
        <button type="button" className="text-button checkout-back" onClick={onBack}>Retour</button>
        <button type="submit" className="store-button" disabled={pending}>{pending ? "Enregistrement…" : "Commander"}</button>
      </div>
      <p className="checkout-hint">Votre commande est créée, puis WhatsApp s’ouvre avec le récapitulatif.</p>
    </form>
  );
}

export function CartDrawer({ items, onClose, onChangeQty, whatsapp, storeSlug, disableCheckout }: { items: CartItem[]; onClose: () => void; onChangeQty: (id: string, delta: number) => void; whatsapp?: string; storeSlug?: string; disableCheckout?: boolean }) {
  const [step, setStep] = useState<"cart" | "checkout">("cart");
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  return (
    <aside className="cart-drawer" aria-live="polite" role="dialog" aria-label="Votre panier">
      {step === "cart" ? (
        <>
          <div className="cart-drawer-head">
            <strong>Votre panier · {itemCount} {itemCount > 1 ? "articles" : "article"}</strong>
            <button className="cart-close" aria-label="Fermer le panier" onClick={onClose}><X size={18} /></button>
          </div>
          <ul className="cart-lines">
            {items.map((item) => (
              <li className="cart-line" key={item.id}>
                <div className="cart-line-info"><span>{item.name}</span><small>{formatPrice(item.unitPrice)}</small></div>
                <div className="cart-qty">
                  <button type="button" aria-label={`Diminuer ${item.name}`} onClick={() => onChangeQty(item.id, -1)}><Minus size={14} /></button>
                  <span>{item.quantity}</span>
                  <button type="button" aria-label={`Augmenter ${item.name}`} onClick={() => onChangeQty(item.id, 1)}><Plus size={14} /></button>
                </div>
                <strong className="cart-line-total">{formatPrice(item.unitPrice * item.quantity)}</strong>
              </li>
            ))}
          </ul>
          <div className="cart-row"><span>Total</span><strong>{formatPrice(subtotal)}</strong></div>
          {disableCheckout ? (
            <p className="cart-note">Aperçu administrateur — lecture seule. La commande est désactivée dans ce mode.</p>
          ) : whatsapp ? (
            storeSlug
              ? <div className="checkout-actions"><button type="button" className="store-button checkout-cta" onClick={() => setStep("checkout")}><ShoppingBag size={16} aria-hidden="true" /> Commander</button></div>
              : <div style={{ marginTop: ".85rem" }}><WhatsAppOrderButton items={items} whatsapp={whatsapp} /></div>
          ) : <p className="cart-note">Cette boutique ne reçoit pas encore de commandes WhatsApp.</p>}
        </>
      ) : (
        <>
          <div className="cart-drawer-head">
            <strong>Finaliser la commande</strong>
            <button className="cart-close" aria-label="Fermer" onClick={onClose}><X size={18} /></button>
          </div>
          <CheckoutForm items={items} storeSlug={storeSlug as string} onBack={() => setStep("cart")} />
        </>
      )}
    </aside>
  );
}

export function StoreFooter({ name = "Maison Naya" }: { name?: string }) {
  return <footer className="store-container store-footer">{name} · Une boutique créée avec VendoFlow</footer>;
}

export function StoreProductPage({ product, storeName, logoUrl, whatsapp, slug }: { product: ProductView; storeName?: string; logoUrl?: string | null; whatsapp?: string; slug: string }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const available = product.available !== false;
  const storeHref = `/store/${slug}`;

  const addItem = (p: ProductView) => {
    setItems((prev) => {
      const found = prev.find((i) => i.id === p.id);
      return found ? prev.map((i) => (i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i)) : [...prev, { id: p.id, name: p.name, unitPrice: p.unitPrice, quantity: 1 }];
    });
    setCartOpen(true);
  };
  const changeQty = (id: string, delta: number) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: i.quantity + delta } : i)).filter((i) => i.quantity > 0));
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="theme-store">
      <StoreHeader name={storeName} logoUrl={logoUrl} catalogHref={storeHref} />
      <main className="store-container">
        <div className="store-product-page">
          <div className="store-product-media">
            <ProductImage product={product} />
            {product.featured && <span className="product-badge"><Star size={11} aria-hidden="true" /> À la une</span>}
          </div>
          <div className="store-product-info">
            <span className="vf-eyebrow" style={{ color: "var(--store-accent)" }}>Le produit</span>
            <h1 className="store-product-name">{product.name}</h1>
            {product.note && <p className="store-product-note">{product.note}</p>}
            <p className="store-product-price">{product.price}</p>
            {available ? (
              <div className="store-product-actions">
                <AddToCartButton onAdd={() => addItem(product)} />
                <a className="store-link" href={storeHref}>Voir toute la boutique</a>
              </div>
            ) : (
              <p className="store-product-unavailable">Ce produit est indisponible pour le moment.</p>
            )}
          </div>
        </div>
      </main>
      {available && cartOpen && <CartDrawer items={items} onClose={() => setCartOpen(false)} onChangeQty={changeQty} whatsapp={whatsapp} storeSlug={slug} />}
      {available && (
        <button
          className={`cart-bubble${itemCount > 0 ? " is-visible" : ""}`}
          aria-label={`Ouvrir le panier (${itemCount} article${itemCount > 1 ? "s" : ""})`}
          onClick={() => setCartOpen((v) => !v)}
        >
          <ShoppingBag size={18} aria-hidden="true" />
          <span className="cart-bubble-count">{itemCount}</span>
        </button>
      )}
      <StoreFooter name={storeName} />
    </div>
  );
}

export function Storefront({ tokens, products, storeName, slogan, description, whatsapp, coverUrl, logoUrl, slug, categories = [], disableCheckout }: { tokens: ThemeTokens; products: ProductView[]; storeName?: string; slogan?: string; description?: string; whatsapp?: string; coverUrl?: string; logoUrl?: string | null; slug?: string; categories?: CategoryRef[]; disableCheckout?: boolean }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const addItem = (p: ProductView) => {
    setItems((prev) => {
      const found = prev.find((i) => i.id === p.id);
      return found ? prev.map((i) => (i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i)) : [...prev, { id: p.id, name: p.name, unitPrice: p.unitPrice, quantity: 1 }];
    });
    setCartOpen(true);
  };
  const changeQty = (id: string, delta: number) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: i.quantity + delta } : i)).filter((i) => i.quantity > 0));
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  const chips = useMemo(() => categoriesWithProducts(categories, products), [categories, products]);
  const visible = useMemo(() => filterProductsByCategory(products, activeCategory), [products, activeCategory]);

  return (
    <div className="theme-store">
      <StoreHeader name={storeName} logoUrl={logoUrl} />
      <StoreHero name={storeName} slogan={slogan} description={description} coverUrl={coverUrl} logoUrl={logoUrl} products={products} heroVariant={tokens.layout.heroVariant} onAdd={addItem} />
      {slogan && (
        <div className="store-container store-tagline">
          <p>{slogan}</p>
        </div>
      )}
      {chips.length > 0 && (
        <section id="catalogue" className="store-container store-categories" aria-label="Catégories" role="group">
          <button type="button" className={`category-chip${activeCategory === null ? " is-active" : ""}`} onClick={() => setActiveCategory(null)}>Tous</button>
          {chips.map((c) => (
            <button key={c.id} type="button" className={`category-chip${activeCategory === c.id ? " is-active" : ""}`} onClick={() => setActiveCategory(c.id)}>{c.name}</button>
          ))}
        </section>
      )}
      <ProductGrid products={visible} tokens={tokens} onAdd={addItem} id={chips.length > 0 ? undefined : "catalogue"} />
      {cartOpen && <CartDrawer items={items} onClose={() => setCartOpen(false)} onChangeQty={changeQty} whatsapp={whatsapp} storeSlug={slug} disableCheckout={disableCheckout} />}
      <button
        className={`cart-bubble${itemCount > 0 ? " is-visible" : ""}`}
        aria-label={`Ouvrir le panier (${itemCount} article${itemCount > 1 ? "s" : ""})`}
        onClick={() => setCartOpen((v) => !v)}
      >
        <ShoppingBag size={18} aria-hidden="true" />
        <span className="cart-bubble-count">{itemCount}</span>
      </button>
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