import { getAdminStores } from "@/features/admin/data";
import { StoresView } from "./stores-view";

export const dynamic = "force-dynamic";

export default async function AdminStoresPage() {
  const { stores, error } = await getAdminStores();
  return (
    <div className="admin-page">
      <header className="page-head">
        <div>
          <p className="vf-eyebrow">Administration</p>
          <h1>Boutiques</h1>
          <p className="muted">{stores.length} boutique(s) créée(s) sur la plateforme.</p>
        </div>
      </header>
      {error ? <p className="banner-warn" role="alert">{error}</p> : <StoresView stores={stores} />}
    </div>
  );
}