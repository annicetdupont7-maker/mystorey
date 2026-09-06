import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, ExternalLink, Eye } from "lucide-react";
import { formatDate } from "@/features/admin/stats";
import { getAdminUserById } from "@/features/admin/data";
import { UserRoleForm } from "@/features/admin/components/user-role-form";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, stores } = await getAdminUserById(id);
  if (!user) notFound();
  const published = stores.find((s) => s.status === "published");

  return (
    <div className="admin-page">
      <Link className="admin-back-link" href="/admin/users"><ArrowLeft size={15} aria-hidden="true" /> Retour aux utilisateurs</Link>

      <header className="admin-profile-head">
        <span className="admin-avatar admin-avatar--xl" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>
        <div>
          <p className="vf-eyebrow">Fiche utilisateur</p>
          <h1>{user.name}</h1>
          <p className="muted">{user.email ?? user.phone ?? user.id}{user.role === "admin" && <span className="tag tag--admin" style={{ marginLeft: ".5rem" }}>Administrateur</span>}</p>
        </div>
        <Link className="vf-button vf-button--dark" href={`/admin/users/${user.id}/preview`}><Eye size={15} aria-hidden="true" /> Voir comme cet utilisateur</Link>
      </header>

      <section className="admin-panels">
        <div className="panel">
          <div className="panel-head">
            <div>
              <p className="vf-eyebrow">Compte</p>
              <h2>Informations du compte</h2>
            </div>
          </div>
          <dl className="admin-dl">
            <div><dt>Email</dt><dd>{user.email ?? "—"}</dd></div>
            <div><dt>Téléphone</dt><dd>{user.phone ?? "—"}</dd></div>
            <div><dt>Nom</dt><dd>{user.name}</dd></div>
            <div><dt>Rôle</dt><dd>{user.role === "admin" ? "Administrateur" : user.role === "seller" ? "Vendeur" : "Sans rôle"}</dd></div>
            <div><dt>Inscription</dt><dd>{formatDate(user.created_at)}</dd></div>
            <div><dt>Statut</dt><dd>{user.banned ? <span className="tag" style={{ background: "#f8dcd6", color: "#c23a2d" }}>Banni</span> : user.active ? <span className="tag tag--ok">Actif</span> : <span className="tag">Non confirmé</span>}</dd></div>
          </dl>
          <div className="admin-section-note">
            <p className="vf-eyebrow">Rôle</p>
            <p className="muted">Le rôle contrôle l’accès à l’espace d’administration. Toute modification est sensible.</p>
            <UserRoleForm userId={user.id} initialRole={user.role} />
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <p className="vf-eyebrow">Boutiques</p>
              <h2>Boutique(s) du compte</h2>
            </div>
          </div>
          {stores.length === 0 ? (
            <div className="admin-empty-mini">Aucune boutique créée par cet utilisateur.</div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>Boutique</th><th>Statut</th><th>Produits</th><th>Commandes</th><th>Créée</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {stores.map((s) => (
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
                      <td>{s.status === "published" ? <span className="tag tag--ok">Publiée</span> : <span className="tag">Brouillon</span>}</td>
                      <td>{s.products}</td>
                      <td>{s.orders}</td>
                      <td className="muted">{formatDate(s.created_at)}</td>
                      <td>
                        <div className="admin-row-actions">
                          <Link className="admin-link" href={`/admin/orders?store=${s.slug}`}>Ses commandes</Link>
                          {s.status === "published" ? (
                            <Link className="admin-link" href={`/store/${s.slug}`} target="_blank" rel="noopener noreferrer">Voir la boutique <ExternalLink size={12} aria-hidden="true" /></Link>
                          ) : (
                            <span className="muted">Brouillon</span>
                          )}
                          <Link className="admin-link admin-link--view" href={`/admin/users/${user.id}/preview`}><Eye size={13} aria-hidden="true" /> Voir comme</Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {published && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="vf-eyebrow">Actions</p>
              <h2>Accès rapides</h2>
            </div>
          </div>
          <div className="admin-actions">
            <Link className="admin-action-card" href={`/admin/users/${user.id}/preview`}><Eye size={18} aria-hidden="true" /><span><strong>Voir comme cet utilisateur</strong><small>Aperçu public de son expérience, en lecture seule.</small></span></Link>
            <Link className="admin-action-card" href={`/store/${published.slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={18} aria-hidden="true" /><span><strong>Voir la boutique publique</strong><small>Ouvre /store/{published.slug} dans un nouvel onglet.</small></span></Link>
            <Link className="admin-action-card" href={`/admin/stores`}><Building2 size={18} aria-hidden="true" /><span><strong>Parcourir les boutiques</strong><small>Consulter la liste des boutiques de la plateforme.</small></span></Link>
          </div>
        </section>
      )}
    </div>
  );
}