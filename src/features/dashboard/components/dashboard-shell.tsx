"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BadgeCheck, Bell, BarChart3, ChevronDown, ClipboardList, CreditCard, LayoutGrid, Menu, Megaphone, Search, Settings, Sparkles, Store, Tags, Users, X } from "lucide-react";
import { logout } from "@/features/auth/actions";
import { StoreShareSheet } from "@/features/sharing/components/share-sheet";

const NAV = [
  { href: "/dashboard", label: "Accueil", icon: Sparkles },
  { href: "/dashboard/products", label: "Produits", icon: LayoutGrid },
  { href: "/dashboard/categories", label: "Catégories", icon: Tags },
  { href: "/dashboard/orders", label: "Commandes", icon: ClipboardList },
];

export function DashboardShell({ name, storeName, storeSlug, status, storeLogoUrl, storeDescription, children }: { name: string; storeName: string; storeSlug?: string; status: string; storeLogoUrl?: string; storeDescription?: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const storeUrl = storeSlug ? `/store/${storeSlug}` : null;
  const initials = (name || "V").split(" ").map((chunk) => chunk[0]).slice(0, 2).join("").toUpperCase() || "V";

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">
        <button type="button" className="dashboard-mobile-menu" aria-label="Ouvrir le menu vendeur" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(true)}>
          <Menu size={20} aria-hidden="true" />
        </button>
        {sidebarOpen && <button type="button" className="dashboard-sidebar-backdrop" aria-label="Fermer le menu vendeur" onClick={() => setSidebarOpen(false)} />}
        <aside className={`dashboard-sidebar${sidebarOpen ? " is-open" : ""}`} aria-label="Sidebar vendeur">
          <button type="button" className="dashboard-sidebar-close" aria-label="Fermer le menu vendeur" onClick={() => setSidebarOpen(false)}>
            <X size={18} aria-hidden="true" />
          </button>
          {/* Store Identity Section */}
          <div className="dashboard-store-identity">
            {storeLogoUrl ? (
              <img src={storeLogoUrl} alt={storeName} className="store-identity-logo" />
            ) : (
              <div className="store-identity-logo store-identity-logo--empty">{storeName.slice(0, 1).toUpperCase()}</div>
            )}
            <h2 className="store-identity-name">{storeName || "Ma boutique"}</h2>
            {storeDescription && <p className="store-identity-description">{storeDescription}</p>}
            <span className={`store-identity-status status--${status}`}>
              {status === "published" ? "🟢 En ligne" : "⚪ Brouillon"}
            </span>
          </div>

          {/* MYSTOREY Brand */}
          <div className="dashboard-sidebar-brand">
            <span className="brand-mark">M</span>
            <div>
              <strong>MYSTOREY</strong>
              <small>Your shop. Your story.</small>
            </div>
          </div>

          <div className="dashboard-sidebar-section">
            <p className="dashboard-sidebar-label">ACCUEIL</p>
            <nav className="dashboard-nav" aria-label="Navigation vendeur">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
                return (
                    <Link key={item.href} href={item.href} className={`nav-item${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined} onClick={() => setSidebarOpen(false)}>
                    <Icon size={15} aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="dashboard-sidebar-divider" />

          <div className="dashboard-sidebar-section">
            <p className="dashboard-sidebar-label">MA BOUTIQUE</p>
            <div className="sidebar-section-links">
              <Link href="/dashboard/storefront/identity" className={`sidebar-link${pathname === "/dashboard/storefront/identity" ? " is-active" : ""}`} aria-current={pathname === "/dashboard/storefront/identity" ? "page" : undefined} onClick={() => setSidebarOpen(false)}>
                <BadgeCheck size={14} aria-hidden="true" />
                Identité
              </Link>
              <Link href="/dashboard/storefront/appearance" className={`sidebar-link${pathname.startsWith("/dashboard/storefront/appearance") ? " is-active" : ""}`} aria-current={pathname.startsWith("/dashboard/storefront/appearance") ? "page" : undefined} onClick={() => setSidebarOpen(false)}>
                <Store size={14} aria-hidden="true" />
                Apparence
              </Link>
            </div>
          </div>

          <div className="dashboard-sidebar-section">
            <p className="dashboard-sidebar-label">DÉVELOPPER</p>
            <div className="sidebar-section-links">
              <Link href="/dashboard/clients" className={`sidebar-link${pathname.startsWith("/dashboard/clients") ? " is-active" : ""}`} aria-current={pathname.startsWith("/dashboard/clients") ? "page" : undefined} onClick={() => setSidebarOpen(false)}>
                <Users size={14} aria-hidden="true" />
                Clients
              </Link>
              <Link href="/dashboard/statistics" className={`sidebar-link${pathname.startsWith("/dashboard/statistics") ? " is-active" : ""}`} aria-current={pathname.startsWith("/dashboard/statistics") ? "page" : undefined} onClick={() => setSidebarOpen(false)}>
                <BarChart3 size={14} aria-hidden="true" />
                Statistiques
              </Link>
              <Link href="/dashboard/marketing" className={`sidebar-link${pathname.startsWith("/dashboard/marketing") ? " is-active" : ""}`} aria-current={pathname.startsWith("/dashboard/marketing") ? "page" : undefined} onClick={() => setSidebarOpen(false)}>
                <Megaphone size={14} aria-hidden="true" />
                Marketing
              </Link>
            </div>
          </div>

          <div className="dashboard-sidebar-section">
            <p className="dashboard-sidebar-label">COMPTE</p>
            <div className="sidebar-section-links">
              <Link href="/dashboard/subscriptions" className={`sidebar-link${pathname.startsWith("/dashboard/subscriptions") ? " is-active" : ""}`} aria-current={pathname.startsWith("/dashboard/subscriptions") ? "page" : undefined} onClick={() => setSidebarOpen(false)}>
                <CreditCard size={14} aria-hidden="true" />
                Abonnement
              </Link>
              <Link href="/dashboard/settings" className={`sidebar-link${pathname.startsWith("/dashboard/settings") ? " is-active" : ""}`} aria-current={pathname.startsWith("/dashboard/settings") ? "page" : undefined} onClick={() => setSidebarOpen(false)}>
                <Settings size={14} aria-hidden="true" />
                Paramètres
              </Link>
            </div>
          </div>

          <div style={{ marginTop: "auto" }} />

          <div className="dashboard-sidebar-section">
            {storeUrl && (
              <Link href={storeUrl} target="_blank" rel="noopener noreferrer" className="sidebar-link sidebar-link--external">
                Voir ma boutique ↗
              </Link>
            )}
          </div>

          <div className="dashboard-user-card">
            <div className="dashboard-user-avatar">{initials}</div>
            <div className="dashboard-user-meta">
              <strong>{name || "Vendeur"}</strong>
              <span>Vendeur</span>
            </div>
            <button type="button" className="dashboard-user-chevron" aria-label="Ouvrir le menu profil">
              <ChevronDown size={14} aria-hidden="true" />
            </button>
          </div>
        </aside>

        <div className="dashboard-main">
          <header className="dashboard-header">
            <div className="dashboard-header-copy">
              <p className="vf-eyebrow">Mon espace MYSTOREY</p>
              <h1>Bonjour {name || "à vous"} 👋</h1>
              <p className="dashboard-subtitle">Votre boutique, vos produits, vos ventes. Tout est là pour avancer sereinement.</p>
            </div>

            <div className="dashboard-header-actions">
              <Link href="/dashboard/products" className="icon-button" aria-label="Rechercher un produit" title="Rechercher un produit"><Search size={16} aria-hidden="true" /></Link>
              <Link href="/dashboard/orders" className="icon-button" aria-label="Voir les commandes à traiter" title="Voir les commandes"><Bell size={16} aria-hidden="true" /></Link>
              <Link href="/dashboard/settings" className="dashboard-profile-inline" aria-label="Ouvrir les paramètres du compte">
                <div className="dashboard-user-avatar dashboard-user-avatar--small">{initials}</div>
                <div className="dashboard-profile-inline__meta">
                  <strong>{name || "Vendeur"}</strong>
                </div>
                <ChevronDown size={14} aria-hidden="true" />
              </Link>
              {storeUrl && <Link href={storeUrl} target="_blank" rel="noopener noreferrer" className="dashboard-header-store-link"><Store size={15} aria-hidden="true" /> Voir ma boutique</Link>}
              {storeUrl && <StoreShareSheet storeName={storeName} storeSlug={storeSlug as string} />}
              <form action={logout}><button className="text-button">Se déconnecter</button></form>
            </div>
          </header>

          <div className="dashboard-main-inner">{children}</div>
        </div>
      </div>
    </main>
  );
}