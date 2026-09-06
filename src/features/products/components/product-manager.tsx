"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, PackageOpen, Search, Star, Tag } from "lucide-react";
import { formatPrice } from "@/features/storefront/storefront-types";
import type { ProductWithFlags } from "../data";
import { DeleteProductButton } from "./delete-product-button";
import { ShareSheet } from "@/features/sharing/components/share-sheet";

type ProductItem = ProductWithFlags & { orders: number; revenue: number };
type Filter = "all" | "available" | "hidden" | "featured";
type Sort = "recent" | "price-asc" | "price-desc" | "orders";
type CategoryRef = { id: string; name: string };

export function ProductManager({ products, storeSlug, categories = [] }: { products: ProductItem[]; storeSlug: string; categories?: CategoryRef[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [categoryFilter, setCategoryFilter] = useState<string>("__all__");

  const visible = useMemo(() => {
    const query = q.trim().toLowerCase();
    let list = products.filter((p) => {
      if (filter === "available" && !p.is_available) return false;
      if (filter === "hidden" && p.is_available) return false;
      if (filter === "featured" && !p.is_featured) return false;
      if (categoryFilter !== "__all__" && p.category_id !== categoryFilter) return false;
      if (!query) return true;
      return `${p.name} ${p.note ?? ""} ${p.description ?? ""}`.toLowerCase().includes(query);
    });
    list = [...list].sort((a, b) => {
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      if (sort === "orders") return b.orders - a.orders;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return list;
  }, [products, q, filter, sort, categoryFilter]);

  const featuredCount = products.filter((p) => p.is_featured).length;
  const countByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      if (p.category_id) counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1);
    }
    return counts;
  }, [products]);
  const categoryNameById = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const reset = () => { setQ(""); setFilter("all"); setCategoryFilter("__all__"); };

  if (products.length === 0) {
    return (
      <section className="empty-state">
        <span className="empty-state-icon"><PackageOpen size={28} aria-hidden="true" /></span>
        <h2>Tu n’as encore aucun produit.</h2>
        <p>Ajoute ton premier article pour commencer à vendre. Une belle photo et un prix clair suffisent pour démarrer.</p>
        <Link className="vf-button" href="/dashboard/products/new"><ArrowRight size={16} /> Ajouter mon premier produit</Link>
      </section>
    );
  }

  return (
    <section>
      <div className="toolbar">
        <label className="toolbar-search">
          <Search size={16} aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un produit…" aria-label="Rechercher un produit" />
        </label>
        <select className="toolbar-select" value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="Filtrer">
          <option value="all">Tous ({products.length})</option>
          <option value="available">En vente</option>
          <option value="hidden">Cachés</option>
          <option value="featured">Vedettes ({featuredCount})</option>
        </select>
        <select className="toolbar-select" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Trier">
          <option value="recent">Plus récents</option>
          <option value="orders">Plus commandés</option>
          <option value="price-asc">Prix croissant</option>
          <option value="price-desc">Prix décroissant</option>
        </select>
      </div>

      <div className="category-chips" role="group" aria-label="Filtrer par catégorie">
        <button type="button" className={`category-chip${categoryFilter === "__all__" ? " is-active" : ""}`} onClick={() => setCategoryFilter("__all__")}>Tous</button>
        {categories.map((c) => (
          <button key={c.id} type="button" className={`category-chip${categoryFilter === c.id ? " is-active" : ""}`} onClick={() => setCategoryFilter(c.id)}>
            {c.name} · {countByCategory.get(c.id) ?? 0}
          </button>
        ))}
      </div>

      <ul className="products-list products-list--pro">
        {visible.map((p) => (
          <li key={p.id}>
            <div className="product-thumb">{p.image_url ? <img src={p.image_url} alt="" /> : <span className="product-thumb--placeholder">—</span>}</div>
            <div className="product-meta">
              <strong className="product-name-line">
                {p.is_featured && <Star size={14} className="featured-star" aria-label="Produit vedette" fill="currentColor" />}
                {p.name}
              </strong>
              <span className="muted">{p.note || "\u00A0"}</span>
              {p.category_id && categoryNameById.has(p.category_id) && (
                <span className="tag tag--category"><Tag size={11} aria-hidden="true" /> {categoryNameById.get(p.category_id)}</span>
              )}
              {p.orders > 0
                ? <small className="order-count">{p.orders} commande{p.orders > 1 ? "s" : ""} · {formatPrice(p.revenue)}</small>
                : <small className="muted">Aucune commande enregistrée</small>}
            </div>
            <div className="product-meta product-meta--price">
              <strong>{formatPrice(p.price)}</strong>
              <span>
                <span className={`tag ${p.is_available ? "tag--ok" : ""}`}>{p.is_available ? "En vente" : "Caché"}</span>
                {p.is_featured && <span className="tag tag--featured">Vedette</span>}
              </span>
            </div>
            <div className="product-actions">
              <ShareSheet product={{ id: p.id, name: p.name, price: p.price, imageUrl: p.image_url, available: p.is_available }} storeSlug={storeSlug} label="Partager ce produit" />
              <Link className="vf-button vf-button--ghost" href={`/dashboard/products/${p.id}`}>Modifier</Link>
              <DeleteProductButton id={p.id} />
            </div>
          </li>
        ))}
      </ul>
      {visible.length === 0 && <p className="products-empty">Aucun produit ne correspond à ce filtre.<br /><button className="text-button" onClick={reset}>Réinitialiser les filtres</button></p>}
    </section>
  );
}