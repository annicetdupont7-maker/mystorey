"use server";

import { revalidatePath } from "next/cache";
import { getMyFirstStore } from "@/features/stores/data";

function readContact(formData: FormData) {
  return {
    phone: String(formData.get("phone") ?? "").replace(/[^0-9+]/g, "").trim(),
    name: String(formData.get("name") ?? "").trim().slice(0, 120),
  };
}

export async function allowCustomerReengagement(formData: FormData) {
  const { store, supabase } = await getMyFirstStore();
  if (!store) throw new Error("Boutique introuvable.");
  const { phone, name } = readContact(formData);
  if (!phone) throw new Error("Un numéro est nécessaire.");
  const { error } = await supabase.from("customer_contacts").upsert(
    { store_id: store.id, phone, name, marketing_consent: true, opted_out: false },
    { onConflict: "store_id,phone" },
  );
  if (error) throw new Error("Impossible d’autoriser cette relance.");
  revalidatePath("/dashboard/marketing");
}

export async function optOutCustomerReengagement(formData: FormData) {
  const { store, supabase } = await getMyFirstStore();
  if (!store) throw new Error("Boutique introuvable.");
  const { phone } = readContact(formData);
  if (!phone) throw new Error("Un numéro est nécessaire.");
  const { error } = await supabase.from("customer_contacts").upsert(
    { store_id: store.id, phone, marketing_consent: false, opted_out: true },
    { onConflict: "store_id,phone" },
  );
  if (error) throw new Error("Impossible de désactiver cette relance.");
  revalidatePath("/dashboard/marketing");
}

export async function recordReengagement(formData: FormData) {
  const { store, supabase } = await getMyFirstStore();
  if (!store) throw new Error("Boutique introuvable.");
  const phone = String(formData.get("phone") ?? "").trim();
  const orderId = String(formData.get("orderId") ?? "").trim() || null;
  const kind = String(formData.get("kind") ?? "");
  const message = String(formData.get("message") ?? "").trim();
  if (!phone || !message || !["pending_order", "inactive_customer"].includes(kind)) throw new Error("Relance invalide.");
  const { data: contact } = await supabase.from("customer_contacts").select("marketing_consent,opted_out").eq("store_id", store.id).eq("phone", phone).maybeSingle();
  if (!contact?.marketing_consent || contact.opted_out) throw new Error("Cette relance n’est pas autorisée.");
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase.from("reengagement_logs").select("id", { count: "exact", head: true }).eq("store_id", store.id).eq("customer_phone", phone).gte("created_at", cutoff);
  if ((count ?? 0) > 0) throw new Error("Ce client a déjà été relancé récemment.");
  const { error } = await supabase.from("reengagement_logs").insert({ store_id: store.id, customer_phone: phone, order_id: orderId, kind, message, status: "completed" });
  if (error) throw new Error("Impossible d’enregistrer la relance.");
  revalidatePath("/dashboard/marketing");
}
