"use client";
/* eslint-disable @next/next/no-img-element */
import { useMemo, useState } from "react";
import { Package, Search, Star } from "lucide-react";
import { filterProducts, formatDate, formatFCFA, paginate } from "@/features/admin/stats";
import type { AdminProductRow } from "@/features/admin/types";
import { Paginator } from "@/features/admin/components/paginator";

const AVAILABILITY_OPTIONS: { value: "all" | "available" | "unavailable"; label: string }[] = [
  { value: "all", label: "Toutes les disponibilités" },
  { value: "available", label: "Disponibles" },
  { value: "unavailable", label: "Indisponibles" },
];

export function ProductsView({ products }: { products: AdminProductRow[] }) {
  const [query, setQuery] = useState("");
  const [availability, setAvailability] = useState<"all" | "available" | "unavailable">("all");
  const [featured, setFeatured] = useState(false);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => filterProducts(products, query, availability, featured), [products, query, availability, featured]);
  const paged = useMemo(() => paginate(filtered, page), [filtered, page]);

  return (
    <section>
      <div className="toolbar">
        <div className="toolbar-search">
          <Search size={16} aria-hidden="true" />
          <input type="search" placeholder="Rechercher un produit, une boutique, un vendeur…" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} aria-label="Rechercher un produit" />
        </div>
        <select className="toolbar-select" value={availability} onChange={(e) => { setAvailability(e.target.value as "all" | "available" | "unavailable"); setPage(1); }} aria-label="Filtrer par disponibilité">
          {AVAILABILITY_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <button type="button" className={`admin-chip${featured ? " is-active" : ""}`} onClick={() => { setFeatured((v) => !v); setPage(1); }} aria-pressed={featured}>
          <Star size={14} aria-hidden="true" /> Vedettes
        </button>
      </div>

      {products.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon" aria-hidden="true"><Package size={22} /></span>
          <h2>Aucun produit</h2>
          <p>Les produits publiés par les vendeurs apparaîtront ici.</p>
        </div>
      ) : paged.items.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon" aria-hidden="true"><Search size={22} /></span>
          <h2>Aucun résultat</h2>
          <p>Aucun produit ne correspond à cette recherche ou à ces filtres.</p>
        </div>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Produit</th><th>Boutique</th><th>Vendeur</th><th>Prix</th><th>Disponibilité</th><th>Vedette</th><th>Créée</th></tr>
              </thead>
              <tbody>
                {paged.items.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="admin-cell-user">
                        {p.image_url
                          ? <span className="admin-thumb"><img src={p.image_url} alt="" /></span>
                          : <span className="admin-avatar" aria-hidden="true"><Package size={15} /></span>}
                        <span>
                          <strong>{p.name}</strong>
                          {p.note && <span className="muted">{p.note}</span>}
                        </span>
                      </div>
                    </td>
                    <td>{p.storeName}</td>
                    <td className="muted">{p.ownerName}</td>
                    <td className="admin-strong">{formatFCFA(p.price)}</td>
                    <td>{p.is_available ? <span className="tag tag--ok">Disponible</span> : <span className="tag">Indisponible</span>}</td>
                    <td>{p.is_featured ? <Star size={16} className="featured-star" aria-label="Produit vedette" /> : <span className="muted">—</span>}</td>
                    <td className="muted">{formatDate(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="admin-list-foot">
            <p className="muted">{filtered.length} résultat(s)</p>
            <Paginator page={paged.page} pages={paged.pages} onPage={setPage} />
          </div>
        </>
      )}
    </section>
  );
}