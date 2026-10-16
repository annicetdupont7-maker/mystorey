"use server";

import { redirect } from "next/navigation";
import { appUrl } from "@/lib/app-url";
import { getMyFirstStore } from "@/features/stores/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPlanById } from "@/features/subscriptions/types";
import { getSaspayClient } from "@/lib/saspay/client";
import { saspayPaidPlansArePurchasable } from "./availability";

export async function initiateSaspayPayment(formData: FormData): Promise<void> {
  const planId = String(formData.get("planId") || "free");
  const { store, user } = await getMyFirstStore();

  if (!store) {
    throw new Error("Aucune boutique disponible pour cet abonnement.");
  }

  const plan = getPlanById(planId);

  // Vérifié ici et pas seulement dans l'interface : cacher le bouton ne doit jamais
  // être la seule chose qui sépare une vendeuse d'un paiement dans le vide.
  if (plan.id !== "free" && !saspayPaidPlansArePurchasable()) {
    throw new Error("Les plans payants ne sont pas encore ouverts. Réessayez après leur ouverture.");
  }

  if (plan.id === "free") {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("activate_free_subscription", { p_store_id: store.id });

    if (error) {
      throw new Error("Impossible d'activer l'abonnement gratuit.");
    }

    redirect("/dashboard");
  }

  const saspay = getSaspayClient();
  const supabase = await createSupabaseServerClient();

  const session = await saspay.createCheckoutSession({
    storeId: store.id,
    planId: plan.id,
    amount: plan.price,
    description: `Abonnement MYSTOREY ${plan.name}`,
    customerEmail: user.email ?? "",
    customerName: store.name,
    returnUrl: `${appUrl()}/dashboard/subscriptions/success`,
  });

  // La ligne est écrite AVANT la redirection : si l'insertion échoue, la vendeuse ne
  // doit pas se retrouver sur une page de paiement que rien ne pourra rapprocher.
  const { data: payment, error } = await supabase
    .from("saspay_payments")
    .insert({
      store_id: store.id,
      plan_id: plan.id,
      saspay_session_id: session.id,
      amount: plan.price,
      status: "pending",
      metadata: { user_email: user.email, provider: "saspay" },
    })
    .select()
    .maybeSingle();

  if (error || !payment) {
    throw new Error("Impossible de créer la session de paiement.");
  }

  redirect(session.checkout_url);
}
