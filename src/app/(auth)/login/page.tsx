import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/features/auth/components/auth-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { destinationFor } from "@/features/auth/destination";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Connexion", description: "Connectez-vous à votre espace MYSTOREY.", alternates: { canonical: "/login" } };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; reset?: string; bye?: string }> }) {
  const { error, reset, bye } = await searchParams;
  // Someone already signed in has nothing to do on this page: send her where she belongs.
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect(await destinationFor(supabase, user));
  return <main className="auth-page"><AuthForm mode="login" callbackError={error === "auth"} resetSuccess={reset === "success"} signedOut={bye === "1"} /></main>;
}
