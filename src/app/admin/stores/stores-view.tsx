"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Building2, Eye, ExternalLink, Search } from "lucide-react";
import { filterStores, formatDate, paginate } from "@/features/admin/stats";
import type { AdminStoreRow } from "@/features/admin/types";
import { Paginator } from "@/features/admin/components/paginator";

const STATUS_OPTIONS: { value: "all" | "draft" | "published"; label: string }[] = [
  { value: "all", label: "Tous les statuts" },
  { value: "published", label: "Publiées" },
  { value: "draft", label: "Brouillons" },
];

export function StoresView({ stores }: { stores: AdminStoreRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "draft" | "published">("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => filterStores(stores, query, status), [stores, query, status]);
  const paged = useMemo(() => paginate(filtered, page), [filtered, page]);

  return (
    <section>
      <div className="toolbar">
        <div className="toolbar-search">
          <Search size={16} aria-hidden="true" />
          <input type="search" placeholder="Rechercher par nom, slug ou propriétaire…" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} aria-label="Rechercher une boutique" />
        </div>
        <select className="toolbar-select" value={status} onChange={(e) => { setStatus(e.target.value as "all" | "draft" | "published"); setPage(1); }} aria-label="Filtrer par statut">
          {STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>

      {stores.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon" aria-hidden="true"><Building2 size={22} /></span>
          <h2>Aucune boutique</h2>
          <p>Les vendeurs verront leurs boutiques apparaître ici dès leur première création.</p>
        </div>
      ) : paged.items.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon" aria-hidden="true"><Search size={22} /></span>
          <h2>Aucun résultat</h2>
          <p>Aucune boutique ne correspond à cette recherche ou à ce filtre.</p>
        </div>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Boutique</th><th>Propriétaire</th><th>Statut</th><th>Produits</th><th>Commandes</th><th>Créée</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {paged.items.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="admin-cell-user">
                        <span className="admin-avatar" aria-hidden="true"><Building2 size={15} /></span>
                        <span>
                          <strong>{s.name}</strong>
                          <span className="muted">/{s.slug}</span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <Link className="admin-link" href={`/admin/users/${s.owner_id}`}>{s.ownerName}</Link>
                    </td>
                    <td>{s.status === "published" ? <span className="tag tag--ok">Publiée</span> : <span className="tag">Brouillon</span>}</td>
                    <td>{s.products}</td>
                    <td>{s.orders}</td>
                    <td className="muted">{formatDate(s.created_at)}</td>
                    <td>
                      <div className="admin-row-actions">
                        {s.status === "published" ? (
                          <Link className="admin-link" href={`/store/${s.slug}`} target="_blank" rel="noopener noreferrer">Voir la boutique <ExternalLink size={12} aria-hidden="true" /></Link>
                        ) : (
                          <span className="muted">Brouillon</span>
                        )}
                        <Link className="admin-link admin-link--view" href={`/admin/users/${s.owner_id}/preview`}><Eye size={13} aria-hidden="true" /> Voir comme</Link>
                      </div>
                    </td>
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