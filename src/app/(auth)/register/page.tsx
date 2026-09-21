import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/features/auth/components/auth-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { destinationFor } from "@/features/auth/destination";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Créer ma boutique", description: "Créez gratuitement votre boutique en ligne MYSTOREY et partagez un seul lien à vos clientes.", alternates: { canonical: "/register" } };
export default async function RegisterPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect(await destinationFor(supabase, user));
  return <main className="auth-page"><AuthForm mode="register" /></main>;
}
