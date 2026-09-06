import { getAdminProducts } from "@/features/admin/data";
import { ProductsView } from "./products-view";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const { products, error } = await getAdminProducts();
  return (
    <div className="admin-page">
      <header className="page-head">
        <div>
          <p className="vf-eyebrow">Administration</p>
          <h1>Produits</h1>
          <p className="muted">{products.length} produit(s) référencé(s) par les vendeurs.</p>
        </div>
      </header>
      {error ? <p className="banner-warn" role="alert">{error}</p> : <ProductsView products={products} />}
    </div>
  );
}