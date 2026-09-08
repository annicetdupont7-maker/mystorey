"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Eye, Search, UserRound } from "lucide-react";
import { formatDate, filterUsers, paginate } from "@/features/admin/stats";
import type { AdminRole, AdminUserRow } from "@/features/admin/types";
import { Paginator } from "@/features/admin/components/paginator";

const ROLE_OPTIONS: { value: "all" | AdminRole; label: string }[] = [
  { value: "all", label: "Tous les rôles" },
  { value: "seller", label: "Vendeurs" },
  { value: "admin", label: "Administrateurs" },
];

export function UsersView({ users }: { users: AdminUserRow[] }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | AdminRole>("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => filterUsers(users, query, role), [users, query, role]);
  const paged = useMemo(() => paginate(filtered, page), [filtered, page]);
  const hasFilter = query.trim() !== "" || role !== "all";

  return (
    <section>
      <div className="toolbar">
        <div className="toolbar-search">
          <Search size={16} aria-hidden="true" />
          <input type="search" placeholder="Rechercher un nom, un email, un identifiant…" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} aria-label="Rechercher un utilisateur" />
        </div>
        <select className="toolbar-select" value={role} onChange={(e) => { setRole(e.target.value as "all" | AdminRole); setPage(1); }} aria-label="Filtrer par rôle">
          {ROLE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>

      {users.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon" aria-hidden="true"><UserRound size={22} /></span>
          <h2>Aucun utilisateur</h2>
           <p>Personne ne s’est encore inscrit sur MYSTOREY. Les premiers boutons « S’inscrire » de l’accueil créeront les premiers comptes.</p>
        </div>
      ) : paged.items.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon" aria-hidden="true"><Search size={22} /></span>
          <h2>Aucun résultat</h2>
          <p>Aucun utilisateur ne correspond à cette recherche ou à ce filtre.</p>
        </div>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Utilisateur</th><th>Rôle</th><th>Inscription</th><th>Boutiques</th><th>Statut</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {paged.items.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="admin-cell-user">
                        <span className="admin-avatar" aria-hidden="true">{u.name.slice(0, 1).toUpperCase()}</span>
                        <span>
                          <strong>{u.name}</strong>
                          <span className="muted">{u.email ?? u.phone ?? u.id}</span>
                        </span>
                      </div>
                    </td>
                    <td>{u.role === "admin" ? <span className="tag tag--admin">Administrateur</span> : u.role === "seller" ? <span className="tag tag--ok">Vendeur</span> : <span className="tag">Sans rôle</span>}</td>
                    <td className="muted">{formatDate(u.created_at)}</td>
                    <td>{u.stores === 0 ? <span className="muted">—</span> : <span className="admin-strong">{u.stores}</span>}</td>
                    <td>{u.banned ? <span className="tag" style={{ background: "#f8dcd6", color: "#c23a2d" }}>Banni</span> : u.active ? <span className="tag tag--ok">Actif</span> : <span className="tag">Non confirmé</span>}</td>
                    <td>
                      <div className="admin-row-actions">
                        <Link className="admin-link" href={`/admin/users/${u.id}`}>Consulter</Link>
                        <Link className="admin-link admin-link--view" href={`/admin/users/${u.id}/preview`}><Eye size={13} aria-hidden="true" /> Voir comme</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="admin-list-foot">
            <p className="muted">{hasFilter ? `${filtered.length} résultat(s)` : `${paged.total} compte(s)`}</p>
            <Paginator page={paged.page} pages={paged.pages} onPage={setPage} />
          </div>
        </>
      )}
    </section>
  );
}