import Link from "next/link";
import { requireAdmin } from "@/features/auth/admin";
import { logout } from "@/features/auth/actions";
import { AdminNav } from "@/features/admin/components/admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, supabase } = await requireAdmin();
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
  const name = profile?.display_name || user.email?.split("@")[0] || "Admin";
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/admin">
          <span className="admin-brand-mark">M</span>
             <span><strong>MYSTOREY</strong><small>Administration</small></span>
        </Link>
        <AdminNav />
        <div className="admin-sidebar-foot">
          <Link className="admin-back" href="/dashboard">← Mon espace vendeur</Link>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-crumb">Back-office</div>
          <div className="admin-user">
            <span className="admin-user-avatar" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
            <span className="admin-user-name">{name}</span>
            <form action={logout}><button className="admin-logout" type="submit" aria-label="Se déconnecter">Se déconnecter</button></form>
          </div>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}