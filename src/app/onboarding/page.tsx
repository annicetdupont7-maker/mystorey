import { redirect } from "next/navigation";
import { getMyFirstStore } from "@/features/stores/data";
import { OnboardingForm } from "@/features/stores/components/onboarding-form";
export const dynamic="force-dynamic";
export default async function OnboardingPage(){const {store}=await getMyFirstStore();if(store)redirect("/dashboard");return <main className="auth-page"><OnboardingForm/></main>}
