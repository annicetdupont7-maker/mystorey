import { redirect } from "next/navigation";
import { getMyFirstStore } from "@/features/stores/data";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { StoreIdentityEditor } from "@/features/stores/components/store-identity-editor";

export const dynamic = "force-dynamic";

export default async function StoreIdentityPage() {
  const { store, user, supabase } = await getMyFirstStore();
  if (!store) redirect("/onboarding");

  const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();

  return (
    <DashboardShell name={profile?.display_name ?? ""} storeName={store.name} storeSlug={store.slug} status={store.status} storeLogoUrl={store.logo_url} storeDescription={store.description}>
      <StoreIdentityEditor store={store} />
    </DashboardShell>
  );
}

