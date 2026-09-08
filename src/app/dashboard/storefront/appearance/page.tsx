import { redirect } from "next/navigation";
import { getMyFirstStore } from "@/features/stores/data";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { AppearanceEditor } from "@/features/stores/components/appearance-editor";
import { getProducts } from "@/features/products/data";
import { toProductView } from "@/features/storefront/storefront-types";
import type { PresetId } from "@/features/themes/theme-schema";

export const dynamic = "force-dynamic";

export default async function AppearancePage() {
  const { store, user, supabase } = await getMyFirstStore();
  if (!store) redirect("/onboarding");

  const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
  const productsResult = await getProducts();
  const theme = Array.isArray(store.store_themes) ? store.store_themes[0] : store.store_themes;

  return (
    <DashboardShell name={profile?.display_name ?? ""} storeName={store.name} storeSlug={store.slug} status={store.status} storeLogoUrl={store.logo_url} storeDescription={store.description}>
      <AppearanceEditor storeId={store.id} initialPreset={(theme?.preset_id ?? "modern") as PresetId} initialOverrides={theme?.overrides} initialLayout={theme?.layout} storeName={store.name} storeSlogan={store.slogan ?? undefined} storeDescription={store.description ?? undefined} storeLogoUrl={store.logo_url} storeCoverUrl={store.cover_url} storeSlug={store.slug} storeStatus={store.status} products={(productsResult?.products ?? []).filter((product) => product.is_available).map(toProductView)} whatsapp={store.whatsapp} />
    </DashboardShell>
  );
}