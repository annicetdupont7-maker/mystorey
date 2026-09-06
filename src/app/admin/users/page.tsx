import { getAdminUsers } from "@/features/admin/data";
import { UsersView } from "./users-view";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const { users, error } = await getAdminUsers();
  return (
    <div className="admin-page">
      <header className="page-head">
        <div>
          <p className="vf-eyebrow">Administration</p>
          <h1>Utilisateurs</h1>
          <p className="muted">{users.length} compte(s) enregistré(s) sur la plateforme.</p>
        </div>
      </header>
      {error ? <p className="banner-warn" role="alert">{error}</p> : <UsersView users={users} />}
    </div>
  );
}