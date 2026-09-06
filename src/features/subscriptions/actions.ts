"use server";

import { redirect } from "next/navigation";
import { getMyFirstStore } from "@/features/stores/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPlanById } from "@/features/subscriptions/types";

export async function activatePlan(formData: FormData): Promise<void> {
  const planId = String(formData.get("planId") || "free");
  const { store } = await getMyFirstStore();

  if (!store) {
    throw new Error("Aucune boutique disponible pour cet abonnement.");
  }

  const plan = getPlanById(planId);
  if (plan.id !== "free") {
    throw new Error("Les abonnements payants doivent être activés via un paiement confirmé.");
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("activate_free_subscription", { p_store_id: store.id });

  if (error) {
    throw new Error("Impossible d’activer l’abonnement.");
  }

  redirect("/dashboard/subscriptions");
}
