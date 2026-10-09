import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getMyFirstStore } from "@/features/stores/data";
import { OnboardingForm } from "@/features/stores/components/onboarding-form";
import { DeleteAccountForm } from "@/features/account/components/delete-account-form";
import { originFromHeaders } from "@/lib/app-url";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Créer ma boutique", robots: { index: false, follow: false } };
export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { store } = await getMyFirstStore();
  if (store) redirect("/dashboard");
  const { deleted } = await searchParams;
  // The address preview shows the real host the link will use, not a made-up domain.
  const host = originFromHeaders(await headers()).replace(/^https?:\/\//, "");
  // La suppression d'une boutique mène ici, puisqu'il n'en reste aucune. Sans ce message,
  // l'assistant vierge passe pour un échec de la suppression. Et la suppression du compte
  // vit aussi sur cette page : /dashboard/settings exige une boutique, donc une vendeuse
  // qui vient d'effacer la sienne n'aurait plus aucun moyen de partir vraiment.
  return <main className="auth-page">
    {deleted === "1" && <p className="form-success" role="status">Votre boutique et toutes ses données ont bien été supprimées. Votre compte reste ouvert : vous pouvez en créer une nouvelle ci-dessous.</p>}
    <OnboardingForm host={host} />
    <DeleteAccountForm />
  </main>;
}
