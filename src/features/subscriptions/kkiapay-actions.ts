"use server";

import { redirect } from "next/navigation";
import { getMyFirstStore } from "@/features/stores/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPlanById } from "@/features/subscriptions/types";
import { getKkiapayClient } from "@/lib/kkiapay/client";
import { paidPlansArePurchasable } from "./availability";

export async function initiateKkiapayPayment(formData: FormData): Promise<void> {
  const planId = String(formData.get("planId") || "free");
  const { store, user } = await getMyFirstStore();

  if (!store) {
    throw new Error("Aucune boutique disponible pour cet abonnement.");
  }

  const plan = getPlanById(planId);

  // Checked here and not only in the UI: hiding the button must never be the
  // only thing standing between a seller and a sandbox payment.
  if (plan.id !== "free" && !paidPlansArePurchasable()) {
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

  const kkiapayClient = getKkiapayClient();
  const supabase = await createSupabaseServerClient();

  const paymentIntent = await kkiapayClient.createPaymentIntent({
    storeId: store.id,
    planId: plan.id,
    amount: plan.price,
    description: `Abonnement ${plan.name} - NEXORA / MYSTOREY`,
    returnUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/subscriptions/success`,
    cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/subscriptions`,
  });

  const { data: payment } = await supabase
    .from("fedapay_payments")
    .insert({
      store_id: store.id,
      plan_id: plan.id,
      fedapay_transaction_id: paymentIntent.id,
      amount: plan.price,
      status: "pending",
      metadata: { user_email: user.email, provider: "kkiapay" },
    })
    .select()
    .maybeSingle();

  if (!payment) {
    throw new Error("Impossible de créer la session de paiement.");
  }

  if (!paymentIntent.checkout_url) {
    throw new Error("Kkiapay n'a pas fourni de lien de paiement.");
  }

  redirect(paymentIntent.checkout_url);
}
