"use server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { orderFormSchema } from "./schemas";
import { buildCheckoutMessage, type OrderMessageView } from "./messages";
import { buildWhatsAppLink } from "@/features/storefront/whatsapp";

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

  const supabase = await createSupabaseServerClient();
  try {
    const { data: store } = await supabase.from("stores").select("id,name,whatsapp").eq("slug", storeSlug).eq("status", "published").maybeSingle();
    if (!store || !store.whatsapp) return { error: "Cette boutique ne reçoit pas encore de commandes en ligne." };

    const productIds = [...new Set(parsed.data.lines.map((line) => line.productId))];
    const { data: productRows, error: productsError } = await supabase.from("products").select("id,store_id,is_available").eq("store_id", store.id).in("id", productIds);
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
      // The checkout function raises named errors; the two a customer can actually hit
      // deserve an answer she can act on rather than "réessayez".
      const code = rpcError?.message ?? "";
      if (code.includes("checkout_insufficient_stock")) return { error: "La quantité demandée n’est plus disponible. Ajustez votre panier." };
      if (code.includes("checkout_variant_not_found")) return { error: "Le choix sélectionné n’est plus disponible. Choisissez-en un autre." };
      return { error: "Impossible d’enregistrer votre commande. Réessayez." };
    }

    const order = created as unknown as OrderMessageView;
    const message = buildCheckoutMessage(order);
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