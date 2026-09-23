"use server";
import { after } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { orderFormSchema } from "./schemas";
import { buildCheckoutMessage, type OrderMessageView } from "./messages";
import { buildWhatsAppLink } from "@/features/storefront/whatsapp";
import { isPlausiblePhone } from "@/features/phone/phone";
import { checkoutErrorMessage, looksAutomated } from "./checkout-errors";
import { notifySellerOfNewOrder } from "./notify";

export type CheckoutActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: {
    orderNumber: string;
    waLink: string;
    message: string;
    total: number;
    storeName: string;
  };
};

type CheckoutLine = { productId: string; variantId?: string | null; quantity: number };

export async function createCheckoutOrder(_: CheckoutActionState, formData: FormData): Promise<CheckoutActionState> {
  const storeSlug = String(formData.get("storeSlug") || "");
  // Refusé avant toute requête : un robot ne doit rien coûter à la base.
  if (looksAutomated(formData.get("website"))) return { error: "Impossible d’enregistrer votre commande. Réessayez." };
  let parsedLines: CheckoutLine[] = [];
  try {
    const raw = String(formData.get("cart") || "[]");
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) throw new Error();
    parsedLines = value;
  } catch {
    return { error: "Votre panier est invalide. Réessayez." };
  }
  const parsed = orderFormSchema.safeParse({
    customerName: formData.get("customerName"),
    customerPhone: String(formData.get("customerPhone") ?? ""),
    customerAddress: String(formData.get("customerAddress") ?? ""),
    note: String(formData.get("note") ?? ""),
    lines: parsedLines,
  });
  if (!parsed.success) return { error: "Vérifiez vos informations de commande.", fieldErrors: parsed.error.flatten().fieldErrors };
  // The shop must be able to call the client back, even if she never sends the WhatsApp.
  if (!isPlausiblePhone(parsed.data.customerPhone)) return { error: "Indiquez votre numéro pour que la boutique puisse vous recontacter.", fieldErrors: { customerPhone: ["Numéro invalide : choisissez le pays et tapez votre numéro."] } };

  const supabase = await createSupabaseServerClient();
  try {
    const { data: store } = await supabase.from("stores").select("id,name,whatsapp").eq("slug", storeSlug).eq("status", "published").maybeSingle();
    if (!store || !store.whatsapp) return { error: "Cette boutique ne reçoit pas encore de commandes en ligne." };

    const productIds = [...new Set(parsed.data.lines.map((line) => line.productId))];
    const { data: productRows, error: productsError } = await supabase.from("products").select("id,store_id,is_available").eq("store_id", store.id).eq("is_available", true).in("id", productIds);
    if (productsError) return { error: "Impossible de vérifier les produits de votre panier." };
    const known = new Set((productRows ?? []).map((row) => row.id));
    if (!productIds.every((id) => known.has(id))) return { error: "Un article de votre panier n’est plus disponible." };

    const { data: created, error: rpcError } = await supabase.rpc("create_checkout_order", {
      p_store_id: store.id,
      p_customer_name: parsed.data.customerName,
      p_customer_phone: parsed.data.customerPhone,
      p_customer_address: parsed.data.customerAddress,
      p_note: parsed.data.note,
      p_items: parsed.data.lines.map((line) => ({ productId: line.productId, variantId: line.variantId ?? null, quantity: line.quantity })),
    });
    if (rpcError || !created) {
      // The checkout function raises named errors; the ones a customer can actually hit
      // deserve an answer she can act on rather than "réessayez".
      return { error: checkoutErrorMessage(rpcError?.message ?? "") };
    }

    const order = created as unknown as OrderMessageView;
    // La commande est enregistrée : la vendeuse est prévenue par email APRÈS la
    // réponse, car la cliente ne doit pas attendre un fournisseur d'email pour
    // voir sa confirmation — et surtout parce que le lien WhatsApp ci-dessous
    // ne part que si elle le clique.
    after(() => notifySellerOfNewOrder(store.id, store.name, order));
    const message = buildCheckoutMessage(order, store.name);
    const waLink = buildWhatsAppLink(store.whatsapp, message);
    if (!waLink) return { error: "Impossible de préparer la conversation WhatsApp." };

    return {
      success: {
        orderNumber: order.order_number ?? "",
        waLink,
        message,
        total: order.total,
        storeName: store.name,
      },
    };
  } catch {
    return { error: "Impossible d’enregistrer votre commande. Réessayez." };
  }
}