"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Edit2, PackageOpen, Search, Star, Tag } from "lucide-react";
import { formatPrice } from "@/features/storefront/storefront-types";
import type { ProductWithFlags } from "../data";
import { DeleteProductButton } from "./delete-product-button";
import { ShareSheet } from "@/features/sharing/components/share-sheet";

type ProductItem = ProductWithFlags & { orders: number; revenue: number };
type Filter = "all" | "available" | "hidden" | "featured";
type Sort = "recent" | "price-asc" | "price-desc" | "orders";
type CategoryRef = { id: string; name: string };

export function ProductsCatalog({ products, storeSlug, categories = [] }: { products: ProductItem[]; storeSlug: string; categories?: CategoryRef[] }) {
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
        <h2>Votre boutique commence ici.</h2>
        <p>Ajoutez votre premier produit pour commencer à la construire. Une belle photo et un prix clair suffisent pour démarrer.</p>
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

      {/* Catalog Grid */}
      {visible.length > 0 ? (
        <div className="products-catalog" role="region" aria-label="Catalogue de produits" aria-live="polite">
          {visible.map((p) => (
            <div key={p.id} className="product-card" role="article">
              {/* Product Image */}
              <div className="product-card-image">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={`${p.name} - Image du produit`}
                    loading="lazy"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.classList.add("product-image-error");
                      img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23f1e4d5' width='100' height='100'/%3E%3Ctext x='50' y='50' font-size='60' fill='%23b6a38e' text-anchor='middle' dominant-baseline='middle'%3E—%3C/text%3E%3C/svg%3E";
                    }}
                  />
                ) : (
                  <div className="product-card-image-placeholder" aria-label="Image non disponible">📸</div>
                )}
                {p.is_featured && <div className="product-badge product-badge-featured" aria-label="Produit vedette"><Star size={12} fill="currentColor" /> Vedette</div>}
                {!p.is_available && <div className="product-badge product-badge-hidden" aria-label="Produit caché">Caché</div>}
              </div>

              {/* Product Info */}
              <div className="product-card-content">
                <div>
                  <h3 className="product-card-name">{p.name}</h3>
                  {p.note && <p className="product-card-note">{p.note}</p>}
                  {p.category_id && categoryNameById.has(p.category_id) && (
                    <p className="product-card-category"><Tag size={12} /> {categoryNameById.get(p.category_id)}</p>
                  )}
                </div>

                <div className="product-card-footer">
                  <div>
                    <div className="product-card-price">{formatPrice(p.price)}</div>
                    <p className="product-card-stock">Stock non géré</p>
                    {p.orders > 0 && <p className="product-card-stats">{p.orders} commande{p.orders > 1 ? "s" : ""} · {formatPrice(p.revenue)}</p>}
                  </div>
                </div>
              </div>

              {/* Actions - Hidden until hover */}
              <div className="product-card-actions" role="group" aria-label="Actions du produit">
                <ShareSheet product={{ id: p.id, name: p.name, price: p.price, imageUrl: p.image_url, available: p.is_available }} storeSlug={storeSlug} label="Partager" />
                <Link href={`/dashboard/products/${p.id}`} className="product-action-button" aria-label={`Modifier le produit ${p.name}`} title={`Modifier ${p.name}`}>
                  <Edit2 size={14} />
                </Link>
                <DeleteProductButton id={p.id} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="products-empty">Aucun produit ne correspond à ce filtre.<br /><button className="text-button" onClick={reset}>Réinitialiser les filtres</button></p>
      )}
    </section>
  );
}
