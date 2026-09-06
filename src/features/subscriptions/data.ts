import { getMyFirstStore } from "@/features/stores/data";
import { getPlanById } from "@/features/subscriptions/types";
import { subscriptionIsActive } from "./payment-rules";

export async function getSellerSubscriptionStatus() {
  const { store, user, supabase } = await getMyFirstStore();
  if (!store) return { store: null, user: null, supabase, plan: getPlanById("free"), subscription: null };

  const { data } = await supabase
    .from("seller_subscriptions")
    .select("*")
    .eq("store_id", store.id)
    .maybeSingle();

  const planId = data?.plan_id ?? "free";
  const subscriptionActive = subscriptionIsActive(data);
  const plan = subscriptionActive ? getPlanById(planId) : getPlanById("free");

  return {
    store,
    user,
    supabase,
    plan,
    subscription: data,
  };
}
