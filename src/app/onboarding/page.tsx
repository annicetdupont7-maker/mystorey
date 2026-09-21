import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getMyFirstStore } from "@/features/stores/data";
import { OnboardingForm } from "@/features/stores/components/onboarding-form";
import { originFromHeaders } from "@/lib/app-url";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Créer ma boutique", robots: { index: false, follow: false } };
export default async function OnboardingPage() {
  const { store } = await getMyFirstStore();
  if (store) redirect("/dashboard");
  // The address preview shows the real host the link will use, not a made-up domain.
  const host = originFromHeaders(await headers()).replace(/^https?:\/\//, "");
  return <main className="auth-page"><OnboardingForm host={host} /></main>;
}
