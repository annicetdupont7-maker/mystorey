"use client";
import { useMemo, useState } from "react";
import { ClipboardList, MapPin, Phone, Search } from "lucide-react";
import { ORDER_FILTERS, type OrderFilter } from "@/features/orders/order-status";
import { StatusBadge } from "@/features/orders/components/status-badge";
import { filterOrders, formatDateTime, formatFCFA, paginate } from "@/features/admin/stats";
import type { AdminOrderRow } from "@/features/admin/types";
import { Paginator } from "@/features/admin/components/paginator";

export function OrdersView({ orders, stores, initialStatus, initialStore }: { orders: AdminOrderRow[]; stores: { id: string; name: string; slug: string }[]; initialStatus: OrderFilter; initialStore: string }) {
  const [status, setStatus] = useState<OrderFilter>(initialStatus);
  const [store, setStore] = useState<string>(initialStore);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const byStatus = filterOrders(orders, status);
    const q = query.trim().toLowerCase();
    return byStatus.filter((o) => {
      if (store !== "all" && o.storeSlug !== store) return false;
      if (q) {
        const haystack = `${o.order_number ?? ""} ${o.customer_name} ${o.storeName} ${o.ownerName}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [orders, status, store, query]);
  const paged = useMemo(() => paginate(filtered, page), [filtered, page]);

  return (
    <section>
      <div className="admin-orders-toolbar">
        <div className="order-filters" role="listbox" aria-label="Filtrer par statut">
          {ORDER_FILTERS.map((f) => (
            <button key={f.value} type="button" role="option" aria-selected={status === f.value} className={`order-filter${status === f.value ? " is-active" : ""}`} onClick={() => { setStatus(f.value); setPage(1); }}>
              {f.label}
              <span className="order-filter-count">{orders.filter((o) => f.matches(o.status)).length}</span>
            </button>
          ))}
        </div>
        <div className="admin-orders-inline">
          <div className="toolbar-search">
            <Search size={16} aria-hidden="true" />
            <input type="search" placeholder="N°, client, boutique…" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} aria-label="Rechercher une commande" />
          </div>
          <select className="toolbar-select" value={store} onChange={(e) => { setStore(e.target.value); setPage(1); }} aria-label="Filtrer par boutique">
            <option value="all">Toutes les boutiques</option>
            {stores.map((s) => <option key={s.id} value={s.slug}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon" aria-hidden="true"><ClipboardList size={22} /></span>
          <h2>Aucune commande</h2>
          <p>Les commandes passées sur les vitrines et saisies par les vendeurs apparaîtront ici.</p>
        </div>
      ) : paged.items.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon" aria-hidden="true"><Search size={22} /></span>
          <h2>Aucun résultat</h2>
          <p>Aucune commande ne correspond à ce filtre.</p>
        </div>
      ) : (
        <>
          <ul className="admin-orders">
            {paged.items.map((o) => (
              <li key={o.id} className="order-card">
                <details className="admin-order-details">
                  <summary>
                    <span className="admin-order-main">
                      <span className="order-tag">{o.order_number ?? "Sans numéro"}</span>
                      <StatusBadge status={o.status} />
                    </span>
                    <span className="admin-order-store">{o.storeName} · {o.ownerName}</span>
                    <span className="admin-order-customer">{o.customer_name || "Client anonyme"}</span>
                    <span className="admin-strong">{formatFCFA(o.total)}</span>
                    <time className="muted">{formatDateTime(o.created_at)}</time>
                  </summary>
                  <div className="admin-order-detail-body">
                    <div className="order-customer">
                      <strong>{o.customer_name || "Client anonyme"}</strong>
                      <span>
                        {o.customer_phone && <span className="admin-detail-line"><Phone size={13} aria-hidden="true" /> {o.customer_phone}</span>}
                        {o.customer_address && <span className="admin-detail-line"><MapPin size={13} aria-hidden="true" /> {o.customer_address}</span>}
                      </span>
                    </div>
                    <ul className="order-items">
                      {o.items.length === 0 && <li className="muted">Aucune ligne enregistrée.</li>}
                      {o.items.map((it, i) => (
                        <li key={i}>
                          <span>{it.quantity} × {it.name}<span className="order-unit">({formatFCFA(it.unitPrice)} l’unité)</span></span>
                          <strong>{formatFCFA(it.unitPrice * it.quantity)}</strong>
                        </li>
                      ))}
                    </ul>
                    {o.note && <p className="order-note">{o.note}</p>}
                  </div>
                </details>
              </li>
            ))}
          </ul>
          <div className="admin-list-foot">
            <p className="muted">{filtered.length} résultat(s)</p>
            <Paginator page={paged.page} pages={paged.pages} onPage={setPage} />
          </div>
        </>
      )}
    </section>
  );
}