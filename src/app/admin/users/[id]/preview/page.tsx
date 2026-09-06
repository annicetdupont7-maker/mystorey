import { notFound } from "next/navigation";
import { requireAdmin } from "@/features/auth/admin";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { resolveStoreTheme, themeCssVariables } from "@/features/themes/resolve-theme";
import { Storefront } from "@/features/storefront/components";
import { toProductView } from "@/features/storefront/storefront-types";
import { AdminPreviewBanner } from "@/features/admin/components/preview-banner";
export const dynamic = "force-dynamic";
export default async function AdminPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();
  const supabase = createSupabaseServiceClient();
  const { data: target } = await supabase.auth.admin.getUserById(id);
  if (!target.user) notFound();
  const userName = target.user.email ?? target.user.phone ?? target.user.id;
  const { data: stores } = await supabase.from("stores").select("id,name,slug,description,status,whatsapp").eq("owner_id", id).order("created_at");
  if (!stores || stores.length === 0) {
    return <main className="admin-page"><AdminPreviewBanner userName={userName} stores={[]} /><p className="muted">Cet utilisateur n’a pas encore créé de boutique à présenter.</p></main>;
  }
  const store = stores[0];
  const { data: products } = await supabase.from("products").select("id,name,note,price,image_url").eq("store_id", store.id).eq("is_available", true).order("created_at", { ascending: false });
  const { data: theme } = await supabase.from("store_themes").select("preset_id,overrides,layout,version").eq("store_id", store.id).maybeSingle();
  const { tokens } = resolveStoreTheme(theme ?? { preset_id: "modern", version: 1 });
  const bannerStores = stores.filter((s) => s.status === "published").map((s) => ({ name: s.name, slug: s.slug }));
  return <main className="admin-page">
    <AdminPreviewBanner userName={userName} stores={bannerStores} />
    <div className="preview-frame" style={themeCssVariables(tokens)}>
      <Storefront tokens={tokens} products={(products ?? []).map(toProductView)} storeName={store.name} description={store.description} whatsapp={store.whatsapp ?? ""} slug={store.slug} disableCheckout />
    </div>
  </main>;
}