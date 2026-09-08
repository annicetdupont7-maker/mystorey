"use server";

import { redirect } from "next/navigation";
import { getMyFirstStore } from "@/features/stores/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPlanById } from "@/features/subscriptions/types";
import { getWaveClient } from "@/lib/wave/client";

export async function initiateWavePayment(formData: FormData): Promise<void> {
  const planId = String(formData.get("planId") || "free");
  const { store, user } = await getMyFirstStore();

  if (!store) {
    throw new Error("Aucune boutique disponible pour cet abonnement.");
  }

  const plan = getPlanById(planId);

  // Free plan doesn't need payment
  if (plan.id === "free") {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("activate_free_subscription", { p_store_id: store.id });

    if (error) {
      throw new Error("Impossible d'activer l'abonnement gratuit.");
    }

    redirect("/dashboard");
  }

  // Paid plans need Wave payment
  const waveClient = getWaveClient();
  const supabase = await createSupabaseServerClient();

  // Create Wave payment intent
  const paymentIntent = await waveClient.createPaymentIntent({
    storeId: store.id,
    planId: plan.id,
    amount: plan.price,
    description: `Abonnement ${plan.name} - MYSTOREY`,
    returnUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/subscriptions/success`,
    cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/subscriptions`,
  });

  // Record the payment attempt
  const { data: payment } = await supabase
    .from("wave_payments")
    .insert({
      store_id: store.id,
      plan_id: plan.id,
      wave_payment_id: paymentIntent.id,
      amount: plan.price,
      status: "pending",
      metadata: { user_email: user.email },
    })
    .select()
    .maybeSingle();

  if (!payment) {
    throw new Error("Impossible de créer la session de paiement.");
  }

  // Redirect to Wave checkout
  redirect(paymentIntent.checkout_url);
}
